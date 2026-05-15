-- 003: 자산 스냅샷 (계좌별 월말 잔고 기록)

-- 계좌 목록
CREATE TABLE asset_accounts (
  id UUID PRIMARY KEY,
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  name VARCHAR NOT NULL,
  account_type VARCHAR NOT NULL CHECK (account_type IN ('cash', 'bank', 'savings', 'investment', 'other', 'liability')),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_asset_accounts_family ON asset_accounts(family_id);
ALTER TABLE asset_accounts ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON asset_accounts TO anon;
CREATE POLICY "Allow all for anon" ON asset_accounts FOR ALL TO anon USING (true) WITH CHECK (true);

-- 월별 잔고 스냅샷
CREATE TABLE asset_snapshots (
  id UUID PRIMARY KEY,
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES asset_accounts(id) ON DELETE CASCADE,
  year_month VARCHAR(7) NOT NULL,
  amount BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(account_id, year_month)
);

CREATE INDEX idx_asset_snapshots_family_month ON asset_snapshots(family_id, year_month);
ALTER TABLE asset_snapshots ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON asset_snapshots TO anon;
CREATE POLICY "Allow all for anon" ON asset_snapshots FOR ALL TO anon USING (true) WITH CHECK (true);

-- Realtime 구독
ALTER PUBLICATION supabase_realtime ADD TABLE asset_accounts;
ALTER PUBLICATION supabase_realtime ADD TABLE asset_snapshots;
