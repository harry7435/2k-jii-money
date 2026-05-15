-- 계층형 카테고리, 거래출처, 지출평가 마이그레이션
-- Supabase SQL Editor에서 실행하세요

-- 1. categories 테이블 변경
ALTER TABLE categories ADD COLUMN level INTEGER NOT NULL DEFAULT 2;
ALTER TABLE categories ADD COLUMN parent_id UUID REFERENCES categories(id) ON DELETE CASCADE;
ALTER TABLE categories ADD COLUMN is_fixed BOOLEAN DEFAULT FALSE;
CREATE INDEX idx_categories_parent ON categories(parent_id);

-- 2. payment_sources 테이블 생성
CREATE TABLE payment_sources (
  id UUID PRIMARY KEY,
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  name VARCHAR NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  sort_order INTEGER DEFAULT 0
);
CREATE INDEX idx_payment_sources_family ON payment_sources(family_id);
ALTER TABLE payment_sources ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON payment_sources TO anon;
CREATE POLICY "Allow all for anon" ON payment_sources FOR ALL TO anon USING (true) WITH CHECK (true);
ALTER PUBLICATION supabase_realtime ADD TABLE payment_sources;

-- 3. transactions 테이블 변경
ALTER TABLE transactions DROP CONSTRAINT transactions_type_check;
ALTER TABLE transactions ADD CONSTRAINT transactions_type_check CHECK (type IN ('income', 'expense', 'savings'));
ALTER TABLE transactions ADD COLUMN payment_source_id UUID REFERENCES payment_sources(id);
ALTER TABLE transactions ADD COLUMN evaluation VARCHAR CHECK (evaluation IN ('consumption', 'waste', 'investment'));
CREATE INDEX idx_transactions_payment_source ON transactions(payment_source_id);

-- 4. budgets 테이블: category_id nullable로 변경 (월 총예산 지원)
-- 이미 nullable일 수 있으므로 에러 무시
ALTER TABLE budgets ALTER COLUMN category_id DROP NOT NULL;

-- 5. 기존 데이터 마이그레이션: 각 가족별로 대분류 카테고리 생성 및 기존 카테고리를 중분류로 연결
-- 주의: 이 부분은 앱 코드(createDefaultCategories)에서 새 가족 생성 시 자동 처리됨
-- 기존 가족의 데이터는 아래 스크립트로 마이그레이션

DO $$
DECLARE
  fam RECORD;
  major_income_id UUID;
  major_savings_id UUID;
  major_expense_id UUID;
BEGIN
  FOR fam IN SELECT DISTINCT family_id FROM categories LOOP
    -- 대분류 생성
    major_income_id := gen_random_uuid();
    major_savings_id := gen_random_uuid();
    major_expense_id := gen_random_uuid();

    INSERT INTO categories (id, family_id, name, icon, color, is_default, level, parent_id)
    VALUES
      (major_income_id, fam.family_id, '수입', 'trending_up', '#82E0AA', true, 1, NULL),
      (major_savings_id, fam.family_id, '저축', 'savings', '#45B7D1', true, 1, NULL),
      (major_expense_id, fam.family_id, '지출', 'trending_down', '#FF6B6B', true, 1, NULL);

    -- 기존 카테고리를 중분류로 설정
    UPDATE categories
    SET level = 2,
        parent_id = CASE
          WHEN name IN ('급여', '기타수입') THEN major_income_id
          ELSE major_expense_id
        END
    WHERE family_id = fam.family_id
      AND level = 2
      AND parent_id IS NULL;
  END LOOP;
END $$;
