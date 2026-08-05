-- 005: Supabase Auth 도입 및 RLS 재설계
--
-- 기존에는 anon 역할에 전체 CRUD가 열려 있어(USING (true)) 웹 번들에 노출된
-- anon 키만으로 모든 가족의 데이터를 읽고 쓸 수 있었다.
-- 이 마이그레이션은 접근 주체를 authenticated로 옮기고 my_family_id() 기준으로 격리한다.

-- ─── 1. members ↔ auth.users 연결 ───────────────────────────────────────────

-- ON DELETE SET NULL 주의: CASCADE로 두면 계정 삭제 → 멤버 삭제 →
-- transactions.member_id CASCADE 로 이어져 그 사람이 입력한 거래가 전부 사라진다.
ALTER TABLE members
  ADD COLUMN user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX idx_members_user ON members(user_id);

-- ─── 2. 초대 토큰 ───────────────────────────────────────────────────────────

CREATE TABLE family_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  created_by UUID REFERENCES members(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  max_uses INTEGER NOT NULL DEFAULT 1 CHECK (max_uses > 0),
  used_count INTEGER NOT NULL DEFAULT 0 CHECK (used_count >= 0),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_family_invites_family ON family_invites(family_id);

-- ─── 3. 헬퍼 함수 ───────────────────────────────────────────────────────────

-- SECURITY DEFINER 필수: members 정책 안에서 members를 조회하면 무한 재귀가 난다.
-- SET search_path: 호출자가 search_path를 조작해 내부 테이블 참조를 가로채는 것을 막는다.
CREATE OR REPLACE FUNCTION my_family_id() RETURNS uuid
  LANGUAGE sql
  SECURITY DEFINER
  STABLE
  SET search_path = public, pg_temp
AS $$
  SELECT family_id FROM members WHERE user_id = auth.uid() LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION my_family_id() FROM public;
GRANT EXECUTE ON FUNCTION my_family_id() TO authenticated;

-- ─── 4. RPC 함수 ────────────────────────────────────────────────────────────

-- 가족 생성: families INSERT와 members INSERT가 한 트랜잭션이어야 한다.
-- 둘 사이에서 실패하면 멤버 0명인 가족이 남고, my_family_id()로 도달할 수 없어
-- 영구 고아 행이 된다.
CREATE OR REPLACE FUNCTION create_family(p_nickname text) RETURNS families
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public, pg_temp
AS $$
DECLARE
  v_family families;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF EXISTS (SELECT 1 FROM members WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'already belongs to a family';
  END IF;

  IF coalesce(trim(p_nickname), '') = '' THEN
    RAISE EXCEPTION 'nickname required';
  END IF;

  INSERT INTO families (id) VALUES (gen_random_uuid())
  RETURNING * INTO v_family;

  INSERT INTO members (id, family_id, nickname, user_id)
  VALUES (gen_random_uuid(), v_family.id, trim(p_nickname), auth.uid());

  RETURN v_family;
END;
$$;

REVOKE EXECUTE ON FUNCTION create_family(text) FROM public;
GRANT EXECUTE ON FUNCTION create_family(text) TO authenticated;

-- 초대 발급: 만료 7일, 1회 사용. 토큰은 192비트라 대입이 불가능하다.
-- search_path에 extensions가 필요하다 — Supabase는 pgcrypto(gen_random_bytes)를
-- public이 아닌 extensions 스키마에 설치한다.
CREATE OR REPLACE FUNCTION create_invite() RETURNS family_invites
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_member members;
  v_invite family_invites;
BEGIN
  SELECT * INTO v_member FROM members WHERE user_id = auth.uid();
  IF v_member.id IS NULL THEN
    RAISE EXCEPTION 'not a family member';
  END IF;

  -- base64 그대로면 +, /, = 가 섞여 URL 쿼리스트링에서 깨진다.
  -- translate로 URL-safe 문자로 바꾸고 패딩(=)은 제거한다.
  INSERT INTO family_invites (family_id, token, created_by, expires_at)
  VALUES (
    v_member.family_id,
    translate(encode(gen_random_bytes(24), 'base64'), '+/=', '-_'),
    v_member.id,
    now() + interval '7 days'
  )
  RETURNING * INTO v_invite;

  RETURN v_invite;
END;
$$;

REVOKE EXECUTE ON FUNCTION create_invite() FROM public;
GRANT EXECUTE ON FUNCTION create_invite() TO authenticated;

-- 가족 참여: 아직 속하지 않은 가족을 토큰으로 찾아야 하므로 RLS를 우회해야 한다.
-- 이 조회를 클라이언트에 열면 임의의 family_id로 자신을 멤버 등록할 수 있게 된다.
CREATE OR REPLACE FUNCTION join_family_by_invite(p_token text, p_nickname text)
  RETURNS families
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public, pg_temp
AS $$
DECLARE
  v_invite family_invites;
  v_family families;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF EXISTS (SELECT 1 FROM members WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'already belongs to a family';
  END IF;

  IF coalesce(trim(p_nickname), '') = '' THEN
    RAISE EXCEPTION 'nickname required';
  END IF;

  -- FOR UPDATE 필수: 잠그지 않으면 같은 링크를 동시에 연 두 사람이 모두
  -- used_count 검사를 통과해 1회용 초대가 2회 사용된다.
  SELECT * INTO v_invite FROM family_invites
  WHERE token = p_token
  FOR UPDATE;

  IF v_invite.id IS NULL THEN
    RAISE EXCEPTION 'invalid invite';
  END IF;

  IF v_invite.expires_at <= now() THEN
    RAISE EXCEPTION 'invite expired';
  END IF;

  IF v_invite.used_count >= v_invite.max_uses THEN
    RAISE EXCEPTION 'invite already used';
  END IF;

  INSERT INTO members (id, family_id, nickname, user_id)
  VALUES (gen_random_uuid(), v_invite.family_id, trim(p_nickname), auth.uid());

  UPDATE family_invites SET used_count = used_count + 1 WHERE id = v_invite.id;

  SELECT * INTO v_family FROM families WHERE id = v_invite.family_id;
  RETURN v_family;
END;
$$;

REVOKE EXECUTE ON FUNCTION join_family_by_invite(text, text) FROM public;
GRANT EXECUTE ON FUNCTION join_family_by_invite(text, text) TO authenticated;

-- 데이터 초기화: 샘플로 둘러본 뒤 깨끗하게 밀고 시작하는 용도.
-- categories / payment_sources 는 기본값이므로 보존한다.
CREATE OR REPLACE FUNCTION reset_family_data() RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public, pg_temp
AS $$
DECLARE
  v_family_id uuid := my_family_id();
BEGIN
  IF v_family_id IS NULL THEN
    RAISE EXCEPTION 'not a family member';
  END IF;

  DELETE FROM transactions WHERE family_id = v_family_id;
  DELETE FROM budgets WHERE family_id = v_family_id;
  DELETE FROM asset_snapshots WHERE family_id = v_family_id;
  DELETE FROM asset_accounts WHERE family_id = v_family_id;
  DELETE FROM monthly_notes WHERE family_id = v_family_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION reset_family_data() FROM public;
GRANT EXECUTE ON FUNCTION reset_family_data() TO authenticated;

-- ─── 5. anon 권한 회수 ──────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Allow all for anon" ON families;
DROP POLICY IF EXISTS "Allow all for anon" ON members;
DROP POLICY IF EXISTS "Allow all for anon" ON categories;
DROP POLICY IF EXISTS "Allow all for anon" ON transactions;
DROP POLICY IF EXISTS "Allow all for anon" ON budgets;
DROP POLICY IF EXISTS "Allow all for anon" ON payment_sources;
DROP POLICY IF EXISTS "Allow all for anon" ON asset_accounts;
DROP POLICY IF EXISTS "Allow all for anon" ON asset_snapshots;
DROP POLICY IF EXISTS "Allow all for anon" ON monthly_notes;

REVOKE ALL ON families FROM anon;
REVOKE ALL ON members FROM anon;
REVOKE ALL ON categories FROM anon;
REVOKE ALL ON transactions FROM anon;
REVOKE ALL ON budgets FROM anon;
REVOKE ALL ON payment_sources FROM anon;
REVOKE ALL ON asset_accounts FROM anon;
REVOKE ALL ON asset_snapshots FROM anon;
REVOKE ALL ON monthly_notes FROM anon;

-- ─── 6. authenticated 정책 ──────────────────────────────────────────────────

ALTER TABLE family_invites ENABLE ROW LEVEL SECURITY;

-- families: 생성은 RPC 전담, 수정할 컬럼이 없으므로 SELECT만.
GRANT SELECT ON families TO authenticated;
CREATE POLICY "own family" ON families
  FOR SELECT TO authenticated USING (id = my_family_id());

-- members: 닉네임 변경만 허용. INSERT/DELETE는 RPC 전담.
GRANT SELECT, UPDATE ON members TO authenticated;
CREATE POLICY "own family members select" ON members
  FOR SELECT TO authenticated USING (family_id = my_family_id());
CREATE POLICY "own family members update" ON members
  FOR UPDATE TO authenticated
  USING (family_id = my_family_id())
  WITH CHECK (family_id = my_family_id());

-- family_invites: 발급·사용은 RPC 전담. 목록 확인만 허용.
GRANT SELECT ON family_invites TO authenticated;
CREATE POLICY "own family invites" ON family_invites
  FOR SELECT TO authenticated USING (family_id = my_family_id());

-- 나머지 7개: 전체 CRUD.
-- WITH CHECK이 USING과 같아야 자기 행을 남의 family_id로 바꿔치기하는 UPDATE를 막는다.
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'categories', 'transactions', 'budgets', 'payment_sources',
    'asset_accounts', 'asset_snapshots', 'monthly_notes'
  ] LOOP
    EXECUTE format(
      'GRANT SELECT, INSERT, UPDATE, DELETE ON %I TO authenticated', t
    );
    EXECUTE format(
      'CREATE POLICY "own family data" ON %I FOR ALL TO authenticated
         USING (family_id = my_family_id())
         WITH CHECK (family_id = my_family_id())', t
    );
  END LOOP;
END;
$$;

-- ─── 7. keep-alive용 ping ───────────────────────────────────────────────────

-- Supabase 무료 플랜은 일정 기간 활동이 없으면 프로젝트를 일시정지한다.
-- Vercel Cron이 매일 호출하는 /api/cron/keep-alive 가 DB를 건드려야 하는데,
-- anon 권한을 전부 회수했으므로 테이블 조회로는 더 이상 불가능하다.
-- 데이터를 노출하지 않으면서 DB 활동만 남기는 최소 함수를 둔다.
CREATE OR REPLACE FUNCTION ping() RETURNS integer
  LANGUAGE sql
  STABLE
  SET search_path = public, pg_temp
AS $$ SELECT 1 $$;

GRANT EXECUTE ON FUNCTION ping() TO anon, authenticated;

-- ─── 8. family_code 제거 ────────────────────────────────────────────────────

-- 되돌릴 수 없는 변경이라 마지막에 둔다.
-- 남겨두면 언젠가 그 경로로 참여 기능이 다시 붙어 대입 공격 면이 되살아난다.
ALTER TABLE families DROP COLUMN family_code;
