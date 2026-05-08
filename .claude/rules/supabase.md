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
