-- 미출시 5종목 사전 가입 테이블
CREATE TABLE IF NOT EXISTS "pre_registers" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "name" TEXT,
  "sport" TEXT NOT NULL,
  "interestedFeatures" JSONB NOT NULL DEFAULT '[]',
  "ip" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "pre_registers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "pre_registers_email_sport_key" ON "pre_registers"("email", "sport");
CREATE INDEX IF NOT EXISTS "pre_registers_sport_createdAt_idx" ON "pre_registers"("sport", "createdAt");
