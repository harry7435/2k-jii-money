-- 부부 가계부 앱 Supabase 스키마 (최종 상태)
-- 새 프로젝트를 만들 때 이 파일을 Supabase SQL Editor에서 한 번 실행하세요.
-- 기존 프로젝트는 supabase/migrations/ 를 순서대로 적용합니다.
--
-- 접근 제어: Supabase Auth(이메일+비밀번호) + auth.uid() 기반 RLS.
-- anon 역할에는 아무 권한도 주지 않습니다. 웹 번들에 노출되는 anon 키만으로는
-- 어떤 데이터도 읽거나 쓸 수 없어야 합니다.

-- ─── 테이블 ─────────────────────────────────────────────────────────────────

-- 가족 단위
CREATE TABLE families (
  id UUID PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 가족 구성원 (user_id로 auth.users와 1:1 연결)
CREATE TABLE members (
  id UUID PRIMARY KEY,
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  nickname VARCHAR NOT NULL,
  -- ON DELETE SET NULL 주의: CASCADE로 두면 계정 삭제가 멤버 삭제로 이어지고,
  -- transactions.member_id CASCADE 때문에 그 사람이 입력한 거래가 전부 사라진다.
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 가족 초대 토큰 (만료 + 사용 횟수 제한)
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

-- 카테고리 (3단계 계층: level 1=대분류, 2=중분류, 3=소분류)
CREATE TABLE categories (
  id UUID PRIMARY KEY,
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  name VARCHAR NOT NULL,
  icon VARCHAR NOT NULL,
  color VARCHAR NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  level INTEGER NOT NULL DEFAULT 2,
  parent_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  is_fixed BOOLEAN DEFAULT FALSE
);

-- 거래출처 (가족별 결제수단 관리)
CREATE TABLE payment_sources (
  id UUID PRIMARY KEY,
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  name VARCHAR NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  sort_order INTEGER DEFAULT 0
);

-- 수입/저축/지출 내역
CREATE TABLE transactions (
  id UUID PRIMARY KEY,
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  type VARCHAR NOT NULL CHECK (type IN ('income', 'expense', 'savings')),
  amount INTEGER NOT NULL CHECK ((type = 'savings' AND amount != 0) OR (type IN ('income', 'expense') AND amount > 0)),
  memo TEXT,
  date DATE NOT NULL,
  time VARCHAR(5),
  payment_source_id UUID REFERENCES payment_sources(id),
  evaluation VARCHAR CHECK (evaluation IN ('consumption', 'waste', 'investment')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 월별 예산
CREATE TABLE budgets (
  id UUID PRIMARY KEY,
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  year_month VARCHAR NOT NULL,
  amount INTEGER NOT NULL CHECK (amount > 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (family_id, category_id, year_month)
);

-- 자산 계좌 목록
CREATE TABLE asset_accounts (
  id UUID PRIMARY KEY,
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  name VARCHAR NOT NULL,
  account_type VARCHAR NOT NULL CHECK (account_type IN ('cash', 'bank', 'savings', 'investment', 'other', 'liability')),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 계좌별 월말 잔고 스냅샷
CREATE TABLE asset_snapshots (
  id UUID PRIMARY KEY,
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES asset_accounts(id) ON DELETE CASCADE,
  year_month VARCHAR(7) NOT NULL,
  amount BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(account_id, year_month)
);

-- 월별 메모 (그 달의 특이사항 기록)
CREATE TABLE monthly_notes (
  id UUID PRIMARY KEY,
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  year_month VARCHAR(7) NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(family_id, year_month)
);

-- ─── 인덱스 ─────────────────────────────────────────────────────────────────

CREATE INDEX idx_members_family ON members(family_id);
CREATE INDEX idx_members_user ON members(user_id);
CREATE INDEX idx_family_invites_family ON family_invites(family_id);
CREATE INDEX idx_categories_family ON categories(family_id);
CREATE INDEX idx_categories_parent ON categories(parent_id);
CREATE INDEX idx_transactions_family_date ON transactions(family_id, date);
CREATE INDEX idx_transactions_category ON transactions(category_id);
CREATE INDEX idx_transactions_payment_source ON transactions(payment_source_id);
CREATE INDEX idx_budgets_family_month ON budgets(family_id, year_month);
CREATE INDEX idx_payment_sources_family ON payment_sources(family_id);
CREATE INDEX idx_asset_accounts_family ON asset_accounts(family_id);
CREATE INDEX idx_asset_snapshots_family_month ON asset_snapshots(family_id, year_month);
CREATE INDEX idx_monthly_notes_family_month ON monthly_notes(family_id, year_month);

-- ─── 헬퍼 함수 ──────────────────────────────────────────────────────────────

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

-- ─── RPC 함수 ───────────────────────────────────────────────────────────────
--
-- 가족 생성/참여만 RLS 바깥에 둔다. "아직 속하지 않은 가족"을 다뤄야 하는데,
-- 이를 클라이언트에 열면 임의의 family_id로 자신을 멤버 등록할 수 있게 되기 때문이다.

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

-- Supabase 무료 플랜의 프로젝트 일시정지를 막기 위한 keep-alive용.
-- anon에 테이블 권한이 없으므로 데이터를 노출하지 않는 최소 함수로 DB 활동만 남긴다.
CREATE OR REPLACE FUNCTION ping() RETURNS integer
  LANGUAGE sql
  STABLE
  SET search_path = public, pg_temp
AS $$ SELECT 1 $$;

GRANT EXECUTE ON FUNCTION ping() TO anon, authenticated;

-- ─── RLS ────────────────────────────────────────────────────────────────────

ALTER TABLE families ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_notes ENABLE ROW LEVEL SECURITY;

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

-- ─── 실시간 구독 ────────────────────────────────────────────────────────────

ALTER PUBLICATION supabase_realtime ADD TABLE transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE budgets;
ALTER PUBLICATION supabase_realtime ADD TABLE categories;
ALTER PUBLICATION supabase_realtime ADD TABLE members;
ALTER PUBLICATION supabase_realtime ADD TABLE payment_sources;
ALTER PUBLICATION supabase_realtime ADD TABLE asset_accounts;
ALTER PUBLICATION supabase_realtime ADD TABLE asset_snapshots;
