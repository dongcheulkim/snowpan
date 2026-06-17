-- 포인트 시스템: User.points + PointTransaction + Coupon + UserCoupon
-- 모든 적립/사용을 PointTransaction 으로 감사 가능하게 기록.

-- 1) users.points 컬럼 (캐시된 잔액). 진실은 PointTransaction 누적.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "points" INTEGER NOT NULL DEFAULT 0;

-- 2) PointTransaction — 적립/사용 이력
CREATE TABLE IF NOT EXISTS "point_transactions" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "balanceAfter" INTEGER NOT NULL,
  "source" TEXT NOT NULL,
  "refId" TEXT,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "point_transactions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "point_transactions_userId_createdAt_idx"
  ON "point_transactions"("userId", "createdAt");
ALTER TABLE "point_transactions" ADD CONSTRAINT "point_transactions_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 3) Coupon — 카탈로그 (운영자 발행)
CREATE TABLE IF NOT EXISTS "coupons" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "pointsCost" INTEGER NOT NULL,
  "partnerType" TEXT NOT NULL,
  "partnerId" TEXT,
  "discountType" TEXT NOT NULL,
  "discountValue" INTEGER NOT NULL,
  "image" TEXT,
  "validDays" INTEGER NOT NULL DEFAULT 30,
  "stock" INTEGER,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "vertical" TEXT NOT NULL DEFAULT 'snow',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "coupons_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "coupons_vertical_active_idx" ON "coupons"("vertical", "active");

-- 4) UserCoupon — 사용자가 보유한 쿠폰
CREATE TABLE IF NOT EXISTS "user_coupons" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "couponId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active',
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "purchasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_coupons_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "user_coupons_code_key" ON "user_coupons"("code");
CREATE INDEX IF NOT EXISTS "user_coupons_userId_status_idx" ON "user_coupons"("userId", "status");
ALTER TABLE "user_coupons" ADD CONSTRAINT "user_coupons_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "user_coupons" ADD CONSTRAINT "user_coupons_couponId_fkey"
  FOREIGN KEY ("couponId") REFERENCES "coupons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
