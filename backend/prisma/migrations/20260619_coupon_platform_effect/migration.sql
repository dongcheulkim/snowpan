-- Coupon: 플랫폼 자체 발급 쿠폰 효과 필드 추가
ALTER TABLE "coupons" ADD COLUMN IF NOT EXISTS "effect" TEXT;
ALTER TABLE "coupons" ADD COLUMN IF NOT EXISTS "effectValue" INTEGER;

-- UserCoupon: 다회권 남은 횟수
ALTER TABLE "user_coupons" ADD COLUMN IF NOT EXISTS "usesLeft" INTEGER NOT NULL DEFAULT 1;
