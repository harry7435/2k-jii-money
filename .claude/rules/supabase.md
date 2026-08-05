# Supabase 클라이언트 규칙

- 클라이언트 컴포넌트: `src/lib/supabase/client.ts`의 `createClient()` 사용
- 서버 컴포넌트/Route Handler: `src/lib/supabase/server.ts`의 `createClient()` 사용
- 현재 타입 호환성 문제로 `(supabase as any)` 캐스팅 사용 중 — 의도된 패턴
- 공유 타입은 `@2k-jii-money/supabase-types` 패키지에서 import
- 모든 DB 함수는 `src/lib/supabase/queries.ts`에 집중
- TanStack React Query로 캐싱/로딩 상태 관리
- yearMonth 형식: `"YYYY-MM"` 문자열

## PostgREST row limit

- Supabase REST(PostgREST)는 **기본 1000행** limit이 걸려 있다
- 단일 월(< 1000행)은 무방하지만, 다월/히스토리 조회는 누락 가능
- 12개월 이상 또는 가족 단위 대량 조회는 `.range(0, N)`을 명시 (예: `.range(0, 19999)`)
- 테스트(소량 데이터)에선 안 걸리고 운영에서만 터지는 종류라 작성 시 의식적으로 점검

## 인증과 RLS

인증은 Supabase Auth(이메일 + 비밀번호). `members.user_id`가 `auth.users`와 1:1로 연결된다.

- **`anon`에는 아무 권한도 없다.** `NEXT_PUBLIC_SUPABASE_ANON_KEY`는 웹 번들에 그대로 노출되므로, anon으로 읽히는 데이터는 곧 공개 데이터다
- 모든 접근은 `authenticated` 역할로 이루어지고, 격리 기준은 `my_family_id()` 하나다
- 클라이언트에서 `family_id`를 직접 필터링해도 되지만, 그건 편의일 뿐 보안 경계가 아니다 — 경계는 RLS다

### 새 테이블을 만들 때

`public` 스키마 테이블에 명시적 GRANT가 없으면 Data API 접근이 차단된다(`42501`). RLS 정책만으로는 부족하다.

```sql
ALTER TABLE {table_name} ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON {table_name} TO authenticated;
CREATE POLICY "own family data" ON {table_name} FOR ALL TO authenticated
  USING (family_id = my_family_id())
  WITH CHECK (family_id = my_family_id());
```

- `WITH CHECK`를 `USING`과 똑같이 걸어야 한다. `USING`만 있으면 자기 행을 **남의 `family_id`로 바꿔치기**하는 UPDATE를 막지 못한다
- 테스트 환경에서는 통과하고 운영에서만 터지는 유형이라 특히 주의

### SECURITY DEFINER 함수

"아직 속하지 않은 가족"을 다뤄야 하는 동작만 RLS 바깥에 둔다 — `create_family`, `create_invite`, `join_family_by_invite`, `reset_family_data`.

- 반드시 `SET search_path = public, pg_temp`를 붙인다. 없으면 호출자가 `search_path`를 조작해 내부 테이블 참조를 가로챌 수 있다
- `gen_random_bytes` 등 pgcrypto 함수를 쓰면 `extensions`도 search_path에 넣어야 한다 (Supabase는 pgcrypto를 `extensions` 스키마에 설치)
- `REVOKE EXECUTE ... FROM public` 후 `authenticated`에만 `GRANT EXECUTE`

### 라우트 가드

`apps/web/proxy.ts`에서 처리한다. 세션 검증은 반드시 `getUser()`를 쓴다 — `getSession()`은 쿠키를 그대로 믿으므로 인가 판단에 쓰면 안 된다.
