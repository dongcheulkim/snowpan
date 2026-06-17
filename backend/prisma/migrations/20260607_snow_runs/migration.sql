-- 스노우런 트래킹 — GPS 클라이언트가 측정한 런 1회를 기록.
-- 검증된 런만 validated=true + pointsAwarded > 0.

CREATE TABLE IF NOT EXISTS "snow_runs" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL,
  "endedAt" TIMESTAMP(3) NOT NULL,
  "durationSec" INTEGER NOT NULL,
  "distanceM" INTEGER NOT NULL,
  "verticalDropM" INTEGER NOT NULL,
  "maxSpeedKmh" DOUBLE PRECISION,
  "avgSpeedKmh" DOUBLE PRECISION,
  "resortId" TEXT,
  "source" TEXT NOT NULL DEFAULT 'web_gps',
  "validated" BOOLEAN NOT NULL DEFAULT false,
  "pointsAwarded" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "snow_runs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "snow_runs_userId_createdAt_idx" ON "snow_runs"("userId", "createdAt");
ALTER TABLE "snow_runs" ADD CONSTRAINT "snow_runs_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
