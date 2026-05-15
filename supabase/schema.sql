-- 부부 가계부 앱 Supabase 스키마
-- Supabase SQL Editor에서 실행하세요

-- 가족 단위
CREATE TABLE families (
  id UUID PRIMARY KEY,
  family_code VARCHAR(6) UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 가족 구성원
CREATE TABLE members (
  id UUID PRIMARY KEY,
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  nickname VARCHAR NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
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

-- 인덱스
CREATE INDEX idx_members_family ON members(family_id);
CREATE INDEX idx_categories_family ON categories(family_id);
CREATE INDEX idx_categories_parent ON categories(parent_id);
CREATE INDEX idx_transactions_family_date ON transactions(family_id, date);
CREATE INDEX idx_transactions_category ON transactions(category_id);
CREATE INDEX idx_transactions_payment_source ON transactions(payment_source_id);
CREATE INDEX idx_budgets_family_month ON budgets(family_id, year_month);
CREATE INDEX idx_payment_sources_family ON payment_sources(family_id);

-- RLS 정책 (Row Level Security)
-- 주의: 로그인 없이 사용하므로 anon 키로 접근 가능하게 설정
ALTER TABLE families ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_sources ENABLE ROW LEVEL SECURITY;

-- anon 사용자에게 모든 작업 허용 (가족 코드로 접근 제어)
-- GRANT: 2026-05-30 이후 신규 프로젝트, 2026-10-30 이후 전체 프로젝트에서 필수
GRANT SELECT, INSERT, UPDATE, DELETE ON families TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON members TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON transactions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON budgets TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON payment_sources TO anon;

CREATE POLICY "Allow all for anon" ON families FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON members FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON categories FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON transactions FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON budgets FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON payment_sources FOR ALL TO anon USING (true) WITH CHECK (true);

-- 실시간 구독 활성화
ALTER PUBLICATION supabase_realtime ADD TABLE transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE budgets;
ALTER PUBLICATION supabase_realtime ADD TABLE categories;
ALTER PUBLICATION supabase_realtime ADD TABLE members;
ALTER PUBLICATION supabase_realtime ADD TABLE payment_sources;
