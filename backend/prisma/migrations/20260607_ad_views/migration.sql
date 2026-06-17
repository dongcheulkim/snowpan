-- 보상형 광고 시청 기록 — 쿠폰 구매 시 검증용.

CREATE TABLE IF NOT EXISTS "ad_views" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "platform" TEXT NOT NULL,
  "purpose" TEXT NOT NULL DEFAULT 'coupon_purchase',
  "consumed" BOOLEAN NOT NULL DEFAULT false,
  "consumedAt" TIMESTAMP(3),
  "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ad_views_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ad_views_userId_consumed_viewedAt_idx"
  ON "ad_views"("userId", "consumed", "viewedAt");
ALTER TABLE "ad_views" ADD CONSTRAINT "ad_views_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
