# Supabase 클라이언트 규칙

- 클라이언트 컴포넌트: `src/lib/supabase/client.ts`의 `createClient()` 사용
- 서버 컴포넌트/Route Handler: `src/lib/supabase/server.ts`의 `createClient()` 사용
- 현재 타입 호환성 문제로 `(supabase as any)` 캐스팅 사용 중 — 의도된 패턴
- 공유 타입은 `@2k-jii-money/supabase-types` 패키지에서 import
- 모든 DB 함수는 `src/lib/supabase/queries.ts`에 집중
- TanStack React Query로 캐싱/로딩 상태 관리
- yearMonth 형식: `"YYYY-MM"` 문자열

## 첫 화면 조회를 membership과 동시에 보내기

앱을 처음 열면 `familyId`는 membership 응답이 와야 생긴다. `enabled: !!familyId`만 쓰면
membership → 데이터 순으로 왕복이 직렬로 쌓인다(각각 CORS preflight까지 붙어 4왕복).

`transactions/page.tsx`는 마운트 시 `familyId` 없이 조회를 먼저 보내 두고
(`createEarlyFetch`, `src/lib/supabase/earlyFetch.ts`), `familyId`가 생긴 뒤의 `queryFn`이
그 결과를 이어받는다. 쿼리 키는 그대로라 캐시 공유·invalidate에는 영향이 없다.

- `getTransactions`·`getCategories`·`getMembers`·`getPaymentSources`는 `familyId`에 `null`을
  받으면 `family_id` 필터를 생략한다. 범위는 RLS(`my_family_id()`)가 동일하게 좁힌다
- `take()`는 한 번만 값을 준다. 이후 리페치는 평소 경로로 간다
- 진입 화면이 아닌 페이지에는 적용하지 않았다 — 탭 전환 시에는 `familyId`가 이미 있어 이득이 없다

### 측정 근거와 한계 (2026-10-12)

- **DB 쿼리 자체는 1~7ms다** (`EXPLAIN ANALYZE`). `family_id` 필터 없이 RLS만으로 좁혀도 `idx_transactions_family_date`를 타고, `my_family_id()`는 Index Cond로 한 번만 평가된다. 그래서 정책을 `(select my_family_id())`로 감싸는 최적화는 필요 없었다
- **병목은 요청 왕복이다.** Supabase의 서버 응답 대기는 단독 약 0.3~0.4초, 5개 동시 약 0.55~0.64초였다. DB가 아니라 API 계층(게이트웨이·PostgREST)에서 쓰이는 시간이고, 동시 요청이 많을수록 전부 느려진다
- **개발 모드 수치는 부풀려진다.** StrictMode가 `useState` 초기화를 두 번 실행해 먼저 보내는 요청이 두 벌 나간다(9개 동시, 약 1.8초). 운영 빌드에서는 한 벌이다
- 리전 불일치는 아니다 — Vercel은 `icn1`에서 응답하고 Supabase 왕복도 90ms대다
- React Query 캐시를 localStorage에 저장하는 방안은 쓰지 않기로 했다. 가계부 데이터가 기기에 남는 것을 피하기 위해서다
- 남은 후보: 첫 화면 요청 5개(membership + 조회 4개)를 RPC 하나로 합치기. 운영 기준 예상 이득이 0.2~0.4초라 보류했다

### 다시 측정할 때 쓰는 방법

로그인 사용자 요청의 응답 시간 — 아래를 터미널에서 실행해 두고, 크롬 Network 탭에서 요청을 우클릭 → Copy as cURL 한 뒤 Enter. `0.000000`은 무시한다.

```sh
read "?크롬에서 Copy as cURL 한 뒤 여기서 Enter: "; for i in 1 2 3 4 5; do eval "$(pbpaste) -s -o /dev/null -w '%{time_starttransfer}\n'" 2>/dev/null & done; wait
```

RLS를 거치는 실행 계획 — Supabase SQL Editor에서 한 번에 실행한다. SQL Editor는 RLS를 우회하는 역할로 돌기 때문에 `authenticated`로 바꿔야 실제 경로가 재현된다.

```sql
select set_config('request.jwt.claims', json_build_object('sub', (select user_id from members where family_id = '<가족 ID>' and user_id is not null limit 1), 'role', 'authenticated')::text, true);
set local role authenticated;
explain (analyze, buffers) select * from transactions where date >= '2026-10-01' and date < '2026-11-01' order by date desc, created_at desc;
```

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
