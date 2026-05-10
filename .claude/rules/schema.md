# DB 스키마 특이사항

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

## 마이그레이션 파일

`supabase/migrations/` 디렉토리에 순번 관리:

- `001_initial_schema.sql`
- `002_add_time_to_transactions.sql` — `time VARCHAR(5)` 컬럼 추가
- `003_allow_negative_savings.sql` — `savings` 타입에 한해 `amount` 음수 허용 (저축 인출)
