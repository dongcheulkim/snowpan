-- 리퍼럴 시스템 — 자기 추천 코드 + 누구의 추천으로 가입했는지
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "referralCode" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "referredById" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "users_referralCode_key" ON "users"("referralCode");
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_referredById_fkey'
  ) THEN
    ALTER TABLE "users" ADD CONSTRAINT "users_referredById_fkey"
      FOREIGN KEY ("referredById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
