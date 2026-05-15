-- 004: 월별 메모 (그 달의 특이사항 기록)

CREATE TABLE monthly_notes (
  id UUID PRIMARY KEY,
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  year_month VARCHAR(7) NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(family_id, year_month)
);

CREATE INDEX idx_monthly_notes_family_month ON monthly_notes(family_id, year_month);
ALTER TABLE monthly_notes ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON monthly_notes TO anon;
CREATE POLICY "Allow all for anon" ON monthly_notes FOR ALL TO anon USING (true) WITH CHECK (true);
