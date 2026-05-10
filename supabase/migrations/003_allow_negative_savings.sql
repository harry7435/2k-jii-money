-- savings 타입에 한해 음수 금액 허용 (저축 인출 지원)
-- income/expense는 기존대로 양수만 허용.
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_amount_check;
ALTER TABLE transactions ADD CONSTRAINT transactions_amount_check
  CHECK ((type = 'savings' AND amount != 0) OR (type IN ('income', 'expense') AND amount > 0));
