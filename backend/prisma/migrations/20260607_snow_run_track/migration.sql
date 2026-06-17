-- SnowRun 에 전체 GPS 트랙 저장 (지도 표시용).
-- JSONB 라 인덱스 없이도 효율적. 한 런 ~50KB.

ALTER TABLE "snow_runs" ADD COLUMN IF NOT EXISTS "trackJson" JSONB;
