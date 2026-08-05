# 웹 인증 도입 및 RLS 재설계

작성일: 2026-08-05

## 배경

앱을 포트폴리오 사이트에 공개하고 싶지만, 현재는 비밀번호를 모르면 내부 화면을 볼 수 없어 공개의 의미가 없다.

조사 과정에서 더 심각한 문제가 드러났다. **현재의 비밀번호는 화면만 가리고 데이터는 가리지 못한다.**

- `NEXT_PUBLIC_SUPABASE_ANON_KEY`가 웹 번들에 그대로 실려 있다
- `supabase/schema.sql:89-101`에서 `anon` 역할에 9개 테이블 전체 CRUD가 열려 있다 (`USING (true)`)
- 즉 사이트 주소만 알면 브라우저 콘솔에서 키를 꺼내 **모든 가족의 거래내역을 읽거나 삭제**할 수 있다

따라서 이 작업의 목표는 두 가지다.

1. **실제 목표**: 개인 금융 데이터를 계정 단위로 격리해 공개해도 안전한 상태로 만든다
2. **부수 목표**: 방문자가 가입해서 채워진 화면을 직접 조작해볼 수 있게 한다

## 범위

포함:

- Supabase Auth(이메일 + 비밀번호) 도입
- `auth.uid()` 기반 RLS 재설계 및 `anon` 권한 회수
- 회원가입 → 가족 생성/참여 2단계 온보딩
- 샘플 데이터 3개월치 생성 옵션 및 전체 초기화
- `apps/mobile` (Flutter) 삭제

제외:

- PWA 설정 — 별도 작업으로 분리 (현재 저장소에 PWA 설정이 존재하지 않음을 확인)
- React Native 앱 — 추후 별도 작업
- 소셜 로그인(Google 등)
- 공용 데모 계정 — 가입 후 샘플 데이터로 대체

## 설계 결정과 근거

### 계정 = 멤버 1:1

`members`에 `user_id`를 추가해 로그인 사용자와 멤버 행을 1:1로 묶는다. 한 사용자는 한 가족에만 속한다.

현재 welcome 화면의 "누구로 입장할까요?" 멤버 선택 단계는 사라진다. 계정이 곧 멤버이기 때문이다.

### 가족 생성/참여만 RLS 바깥으로

RLS를 켜면 `families` 조회 정책은 `USING (id = my_family_id())`가 된다. 즉 _이미 속한 가족만_ 보인다. 그런데 가족 참여는 정의상 **아직 속하지 않은 가족을 코드로 찾아내는 동작**이라 이 정책과 논리적으로 충돌한다.

이를 클라이언트에서 처리하려면 `families` 조회를 모든 로그인 사용자에게 열어야 하는데, 그 순간 두 구멍이 맞물린다.

1. 아무 로그인 사용자나 `families`를 덤프해 모든 가족의 UUID를 확보
2. `members` INSERT 정책은 `WITH CHECK (user_id = auth.uid())`가 될 수밖에 없다 — "내 user_id로만 넣어라"는 검증되지만 **어느 family_id에 넣는지는 검증할 수단이 없다**

둘을 합치면 남의 `family_id`로 자신을 멤버 등록해 그 가족의 데이터를 전부 열 수 있다. `anon` 구멍을 막고 `authenticated` 구멍을 새로 여는 셈이다.

`SECURITY DEFINER` 함수로 빼면 함수 내부에서만 RLS를 우회하고, 밖으로 나오는 것은 "당신을 이 가족의 멤버로 등록했다"는 결과뿐이다. 사용자가 `family_id`를 직접 지정할 수 없으므로 `families` 조회를 열 필요가 없고 `members` 직접 INSERT도 전면 금지할 수 있다.

`create_family`도 같은 방식으로 두는 이유:

- **원자성** — 가족 INSERT와 멤버 INSERT 사이에서 실패하면 멤버가 0명인 가족이 남는다. `my_family_id()`로 도달할 수 없으므로 영구 고아 행이 된다
- **일관성** — 참여가 함수라면 생성만 직접 INSERT로 남길 이유가 없고, `members` INSERT를 통째로 막을 수 있어 정책이 단순해진다

### 공용 데모 계정 대신 가입 시 샘플 데이터

공용 데모 계정은 방문자가 데이터를 오염시킬 수 있어 주기적 리셋 cron이 필요하다. 계정별 샘플 데이터는 격리되어 있어 오염이 원천적으로 불가능하고 cron도 필요 없다.

대가는 "가입해야 볼 수 있다"는 장벽이며, 이를 감수하기로 결정했다.

### 초기화는 전체 삭제

"샘플만 골라 삭제"는 `is_sample` 플래그 컬럼을 3개 테이블에 추가해야 한다. 실제 사용 흐름은 "샘플로 둘러보기 → 이것저것 눌러보기 → 깨끗하게 밀고 진짜로 쓰기 시작"이므로 테스트로 넣은 데이터까지 함께 지우는 편이 맞다. 플래그 컬럼이 불필요해져 스키마도 단순해진다.

## 데이터 모델

### 스키마 변경

```sql
ALTER TABLE members
  ADD COLUMN user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX idx_members_user ON members(user_id);
```

`user_id`는 nullable로 둔다. 기존 멤버 행을 계정과 연결하기 전까지 `null`이어야 하기 때문이다.

`ON DELETE SET NULL`을 쓰는 이유가 중요하다. `CASCADE`로 두면 auth 계정 삭제가 멤버 행 삭제로 이어지고, `transactions.member_id`가 `ON DELETE CASCADE`이므로 **그 사람이 입력한 모든 거래가 함께 사라진다.** 가족 공유 가계부에서 한 사람의 계정 삭제가 가족 전체의 기록을 지우는 것은 명백히 잘못된 동작이다. `SET NULL`이면 멤버 행이 계정과 분리된 채 남아 거래 기록이 보존된다.

### 헬퍼 함수

```sql
CREATE FUNCTION my_family_id() RETURNS uuid
  LANGUAGE sql SECURITY DEFINER STABLE
  SET search_path = public, pg_temp
AS $$ SELECT family_id FROM members WHERE user_id = auth.uid() LIMIT 1 $$;

REVOKE EXECUTE ON FUNCTION my_family_id() FROM public;
GRANT EXECUTE ON FUNCTION my_family_id() TO authenticated;
```

`SECURITY DEFINER`가 필수인 이유: `members` 정책 내부에서 `members`를 조회하면 무한 재귀가 발생한다.

`SET search_path`는 `SECURITY DEFINER` 함수의 표준 방어책이다. 이것이 없으면 호출자가 `search_path`를 조작해 함수 내부의 테이블 참조를 가로챌 수 있다.

### RLS 정책

대상 테이블 9개: `families`, `members`, `categories`, `transactions`, `budgets`, `payment_sources`, `asset_accounts`, `asset_snapshots`, `monthly_notes`.

`families`를 제외한 8개는 모두 `family_id` 컬럼을 가지므로 정책이 완전히 균일하다.

| 테이블     | SELECT / INSERT / UPDATE / DELETE                                                        |
| ---------- | ---------------------------------------------------------------------------------------- |
| `families` | `USING (id = my_family_id())` — SELECT만. INSERT/UPDATE/DELETE 전부 금지                 |
| `members`  | `USING (family_id = my_family_id())` — SELECT, UPDATE만. INSERT/DELETE 금지              |
| 나머지 7개 | `USING (family_id = my_family_id()) WITH CHECK (family_id = my_family_id())` — 전체 CRUD |

`families`가 SELECT 전용인 이유는 컬럼이 `id`, `family_code`, `created_at`뿐이라 사용자가 정당하게 수정할 값이 없기 때문이다. 가족 생성은 RPC가 담당한다.

`members`의 UPDATE는 닉네임 변경 용도이며, 이 경우에도 `WITH CHECK (family_id = my_family_id())`를 함께 건다.

`WITH CHECK`가 `USING`과 같아야 하는 이유: `USING`만 있으면 자기 가족의 행을 **남의 `family_id`로 바꿔치기**하는 UPDATE를 막지 못한다.

`GRANT`는 프로젝트 규칙(`.claude/rules/supabase.md`)에 따라 `authenticated` 역할에 명시적으로 부여한다.

### RPC 함수

모두 `SECURITY DEFINER`이며 `authenticated`에만 `GRANT EXECUTE`한다.

**`create_family(p_nickname text) RETURNS families`**

1. `auth.uid()`가 `null`이면 예외
2. 이미 어떤 가족의 멤버면 예외
3. 6자리 가족 코드를 중복 없이 생성 (충돌 시 재시도 루프)
4. `families` INSERT → `members` INSERT (`user_id = auth.uid()`)
5. 생성된 family 반환

**`join_family_by_code(p_code text, p_nickname text) RETURNS families`**

1. `auth.uid()`가 `null`이면 예외
2. 이미 어떤 가족의 멤버면 예외
3. 코드로 가족 조회, 없으면 예외
4. `members` INSERT
5. 해당 family 반환

**`reset_family_data() RETURNS void`**

`my_family_id()`에 해당하는 가족의 `transactions`, `budgets`, `asset_snapshots`, `asset_accounts`, `monthly_notes`를 삭제한다. `categories`와 `payment_sources`는 기본값이므로 보존한다.

단일 함수로 두는 이유는 원자성과 왕복 횟수(5회 → 1회) 때문이다.

### 알려진 한계

가족 코드는 6자리이므로 자동화된 대입 공격으로 남의 가족에 참여할 이론적 가능성이 있다. 이는 현재 구조에도 이미 존재하는 위험이며 이번 작업에서 해결하지 않는다. 향후 개선안은 만료 시간과 사용 횟수 제한이 있는 초대 토큰 테이블이다.

## 웹 애플리케이션

### 세션 관리

`@supabase/ssr`의 `createBrowserClient` / `createServerClient`를 이미 사용 중이므로 쿠키 기반 세션이 추가 설정 없이 동작한다.

`apps/web/middleware.ts`를 신규 추가해 토큰 갱신과 라우트 가드를 한곳에서 처리한다.

- 미로그인 상태로 `/home/*` 접근 → `/welcome`
- 로그인했으나 가족 없음 → `/family-setup`
- 로그인 + 가족 있음으로 `/welcome` 또는 `/family-setup` 접근 → `/home`

`/family-setup`은 신규 페이지로, "가족 만들기"와 "가족 참여하기" 두 버튼만 두고 각각 기존 `/create-family`, `/join-family`로 분기한다. 가족 유무 판정은 `my_family_id()` 결과가 `null`인지로 한다.

현재 `app/home/layout.tsx`에서 클라이언트로 수행하던 리다이렉트가 서버로 올라가므로, 미로그인 사용자에게 화면이 잠깐 노출되는 깜빡임이 사라진다.

### familyStore

`useFamilyStore`는 11개 파일에서 사용 중이다. **인터페이스는 그대로 유지하고 `persist` 미들웨어만 제거한다.** 따라서 9개 페이지의 `useFamilyStore((s) => s.family)` 호출은 변경되지 않는다.

현재는 localStorage가 진실의 원천이라 로그아웃 후에도 데이터가 남고 계정 전환 시 이전 가족이 남는다. 대신 `app/home/layout.tsx`에서 로그인 사용자의 가족·멤버를 한 번 조회해 store에 채운다.

부수 효과로 `.claude/rules/zustand-hydration.md`가 다루는 hydration 문제 자체가 사라지므로 `useHasHydrated()` 훅과 해당 규칙 문서를 함께 정리한다.

### 화면 변경

| 경로                         | 변경                                                                   |
| ---------------------------- | ---------------------------------------------------------------------- |
| `app/welcome/page.tsx`       | 로그인 / 회원가입 화면으로 교체. 비밀번호 게이트와 멤버 선택 단계 삭제 |
| `app/family-setup/page.tsx`  | 신규. "가족 만들기 / 참여하기" 분기 화면                               |
| `app/create-family/page.tsx` | `create_family` RPC 호출. "샘플 데이터로 시작하기" 체크박스 추가       |
| `app/join-family/page.tsx`   | `join_family_by_code` RPC 호출                                         |
| `app/home/layout.tsx`        | 클라이언트 리다이렉트 제거, store 초기화 담당                          |
| `app/home/settings/page.tsx` | 로그아웃 버튼, "데이터 초기화" 버튼(확인 모달) 추가                    |
| `middleware.ts`              | 신규                                                                   |

삭제 대상: `app/api/verify-password/`, 환경변수 `APP_PASSWORD`, `NEXT_PUBLIC_FAMILY_CODE`.

### 샘플 데이터

`src/lib/utils/sampleData.ts`에 순수 함수로 생성기를 둔다. DOM·DB 의존이 없으므로 `timeUtils.ts`와 동일하게 단위 테스트로 커버한다.

- 기간: 당월 + 직전 2개월 (3개월)
- 분량: 월 30건 안팎, 총 90건 내외
- 대상: `transactions`, `budgets`, `asset_accounts`, `asset_snapshots`
- 카테고리·결제수단은 기본값을 그대로 사용하며 새로 만들지 않는다
- 금액은 실제 소비 패턴이 아닌 그럴듯한 가상 값

생성된 배열을 테이블별 batch insert로 밀어넣어 왕복 횟수를 최소화한다.

### 이메일 확인

Supabase 대시보드에서 이메일 확인(confirm email)을 **끈다.** 기본 SMTP는 시간당 발송 제한이 엄격해, 여러 방문자가 동시에 가입하면 메일이 도달하지 않아 가입이 막힌다.

## 마이그레이션 및 롤아웃

Flutter 앱을 삭제하므로 `anon` 권한 회수를 미룰 이유가 없다. 마이그레이션은 `005_auth_and_rls.sql` 하나로 끝난다.

### `005_auth_and_rls.sql` 내용

1. `members.user_id` 컬럼 및 인덱스 추가
2. `my_family_id()` 생성
3. `create_family`, `join_family_by_code`, `reset_family_data` 생성
4. 기존 `"Allow all for anon"` 정책 9개 DROP
5. 기존 `anon` GRANT 9개 REVOKE
6. `authenticated` GRANT 및 신규 정책 생성

`supabase/schema.sql`에도 동일한 최종 상태를 반영한다 (단일 진실 공급원).

### 롤아웃 순서

1. 웹 배포 준비 (빌드 확인)
2. Supabase SQL 에디터에서 `005` 실행
3. 웹 배포
4. 두 사용자가 각각 회원가입
5. SQL 에디터에서 기존 멤버 행에 `user_id` 연결 (일회성 UPDATE)

2단계와 5단계 사이 몇 분간 기존 사용자가 앱을 사용할 수 없다. 실사용자가 2명이므로 수용 가능하다.

`apps/mobile` 삭제는 별도 커밋으로 분리하되 같은 배포에 포함한다.

## 검증

### 자동화

- `sampleData.ts` 순수 함수 단위 테스트 (vitest)
- `pnpm build:web` 통과

### 수동 (RLS 교차 검증)

RLS는 코드를 읽어서 정확성을 확인할 수 없으므로 실제 시도가 필요하다. 계정 A(가족 1)와 계정 B(가족 2)를 만들고 A 세션에서 다음을 모두 시도해 전부 차단되는지 확인한다.

1. B의 거래 SELECT → 0건이어야 함
2. B의 `family_id`로 거래 INSERT → 거부
3. 자기 거래를 B의 `family_id`로 UPDATE → 거부 (`WITH CHECK` 검증)
4. B의 거래 DELETE → 0건 영향
5. `families` 전체 SELECT → 자기 가족 1건만
6. `members` 직접 INSERT → 거부
7. 이미 가족이 있는 상태에서 `join_family_by_code` 호출 → 예외
8. 로그아웃 상태(anon)에서 모든 테이블 SELECT → 거부

### 문서 갱신

- `.claude/rules/zustand-hydration.md` — hydration 절 삭제, 서버 기반 초기화로 교체
- `.claude/rules/supabase.md` — GRANT 규칙을 `authenticated` 기준으로 수정, 인증 패턴 추가
- `.claude/rules/schema.md` — `members.user_id`, RPC 함수, `005` 마이그레이션 추가
- `apps/web/CLAUDE.md` — "인증 미구현" 서술 수정, `middleware.ts` 추가
- `README.md` — Flutter 앱 관련 서술 제거, 인증 방식 갱신
