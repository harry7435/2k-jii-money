-- transactions 테이블에 time 컬럼 추가 (HH:mm 형식, nullable)
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS time VARCHAR(5);
