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

## 마이그레이션 파일의 GRANT 필수

Supabase는 2026-05-30 이후 신규 프로젝트, 2026-10-30 이후 전체 프로젝트에서 `public` 스키마 테이블에 명시적 GRANT가 없으면 Data API(PostgREST/supabase-js) 접근이 차단된다.

새 테이블을 만드는 모든 마이그레이션에 아래 순서로 포함할 것:

```sql
ALTER TABLE {table_name} ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON {table_name} TO anon;
CREATE POLICY "Allow all for anon" ON {table_name} FOR ALL TO anon USING (true) WITH CHECK (true);
```

- GRANT 없이 RLS 정책만 있으면 PostgREST에서 `42501` 에러 발생
- 테스트 환경에서는 통과하고 운영에서만 터지는 유형이라 특히 주의
- 기존 마이그레이션 파일(001, 003_asset_snapshots)과 schema.sql에 소급 적용 완료
