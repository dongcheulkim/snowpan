-- 성능 인덱스 보강.
-- 1) PointTransaction: 일일 출석체크 idempotency 조회
--    (userId + source='daily_checkin' + createdAt>=오늘) 매 checkin 마다 호출.
CREATE INDEX IF NOT EXISTS "point_transactions_userId_source_createdAt_idx"
  ON "point_transactions"("userId", "source", "createdAt");

-- 2) Coupon: listCoupons 파트너 타입 필터
--    (vertical + active + partnerType) — 쿠폰샵 파트너 카테고리 별 조회.
CREATE INDEX IF NOT EXISTS "coupons_vertical_active_partnerType_idx"
  ON "coupons"("vertical", "active", "partnerType");
