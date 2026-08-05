# DB 스키마 특이사항

## members 테이블

| 컬럼      | 타입      | 비고                                                            |
| --------- | --------- | --------------------------------------------------------------- |
| `user_id` | `UUID FK` | `auth.users` 참조, `UNIQUE`, nullable. **`ON DELETE SET NULL`** |

`ON DELETE CASCADE`가 아닌 이유가 중요하다. CASCADE면 계정 삭제 → 멤버 삭제 →
`transactions.member_id` CASCADE로 이어져 **그 사람이 입력한 모든 거래가 사라진다.**
가족 공유 가계부에서는 명백히 잘못된 동작이라 `SET NULL`로 둔다.

## family_invites 테이블

가족 참여용 초대 토큰. 6자리 가족 코드(`families.family_code`)를 대체했으며 해당 컬럼은 제거됨.

| 컬럼         | 타입          | 비고                                              |
| ------------ | ------------- | ------------------------------------------------- |
| `token`      | `TEXT UNIQUE` | `gen_random_bytes(24)` → URL-safe base64. 192비트 |
| `expires_at` | `TIMESTAMPTZ` | 기본 발급 시점 + 7일                              |
| `max_uses`   | `INTEGER`     | 기본 1                                            |
| `used_count` | `INTEGER`     | 사용 시 증가                                      |

발급·사용은 RPC 전담이며, 테이블에는 SELECT 정책만 있다.

## RPC 함수

모두 `SECURITY DEFINER`, `authenticated`에만 `GRANT EXECUTE`.

| 함수                                     | 용도                                       |
| ---------------------------------------- | ------------------------------------------ |
| `my_family_id()`                         | RLS 정책 전체가 쓰는 기준값                |
| `create_family(p_nickname)`              | 가족 + 본인 멤버를 한 트랜잭션으로 생성    |
| `create_invite()`                        | 초대 토큰 발급                             |
| `join_family_by_invite(p_token, p_nick)` | 토큰 검증 후 멤버 등록 (`FOR UPDATE` 잠금) |
| `reset_family_data()`                    | 거래·예산·자산·월별메모 전체 삭제          |

설계 근거는 `docs/superpowers/specs/2026-08-05-web-auth-rls-design.md` 참조.

## transactions 테이블

| 컬럼                | 타입         | 비고                                                                            |
| ------------------- | ------------ | ------------------------------------------------------------------------------- |
| `time`              | `VARCHAR(5)` | `HH:mm` 형식, nullable. 사용자가 직접 입력한 시간. 없으면 `created_at`으로 폴백 |
| `type`              | `CHECK`      | `'income' \| 'expense' \| 'savings'`                                            |
| `amount`            | `INTEGER`    | `income`/`expense`는 양수만. `savings`는 0이 아닌 정수(음수 = 저축 인출)        |
| `evaluation`        | `VARCHAR`    | `'consumption' \| 'waste' \| 'investment' \| null`. 지출 타입에만 사용          |
| `payment_source_id` | `UUID FK`    | `payment_sources` 테이블 참조, nullable                                         |
| `category_id`       | `UUID FK`    | 항상 가장 구체적인 레벨(소분류 또는 중분류) ID 저장                             |

## payment_sources 테이블

가족별 결제 수단 (신용카드, 상품권, 현금 등). `sort_order`로 순서 관리.

## monthly_notes 테이블

월별 특이사항 메모. `(family_id, year_month)` unique key로 가족당 월 1행.
저장은 upsert(`onConflict: 'family_id,year_month'`) 방식 사용.

| 컬럼         | 타입         | 비고                        |
| ------------ | ------------ | --------------------------- |
| `family_id`  | `UUID FK`    | families 참조               |
| `year_month` | `VARCHAR(7)` | `YYYY-MM` 형식              |
| `content`    | `TEXT`       | 빈 문자열 허용, 기본값 `''` |

## 마이그레이션 파일

`supabase/migrations/` 디렉토리에 순번 관리:

- `001_hierarchical_categories.sql` — 카테고리 3단계 계층 구조, payment_sources 테이블 추가
- `002_add_time_to_transactions.sql` — `time VARCHAR(5)` 컬럼 추가
- `003_allow_negative_savings.sql` — `savings` 타입에 한해 `amount` 음수 허용 (저축 인출)
- `003_asset_snapshots.sql` — asset_accounts, asset_snapshots 테이블 추가
- `004_monthly_notes.sql` — monthly_notes 테이블 추가
- `005_auth_and_rls.sql` — Supabase Auth 도입. `members.user_id`, `family_invites`, RPC 함수 추가. `anon` 권한 회수 후 `authenticated` 기반 RLS로 교체. `families.family_code` 제거
