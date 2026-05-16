-- 5,000 DAU 시즌 피크 대비 핫 쿼리 인덱스 보강
-- 누락된 compound 인덱스 추가 — WHERE + ORDER BY 한 번에 처리하여 sort 비용 제거

-- Product: 시세 통계 (subcategory + brand 필터) 가속
CREATE INDEX IF NOT EXISTS "products_brand_idx" ON "products"("brand");
CREATE INDEX IF NOT EXISTS "products_category_subcategory_brand_idx" ON "products"("category", "subcategory", "brand");

-- Post: 종목별 최신순 + 종목+카테고리 탭
CREATE INDEX IF NOT EXISTS "posts_sport_createdAt_idx" ON "posts"("sport", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "posts_sport_category_createdAt_idx" ON "posts"("sport", "category", "createdAt" DESC);

-- Message: 채팅방 페이지네이션
CREATE INDEX IF NOT EXISTS "messages_roomId_createdAt_idx" ON "messages"("roomId", "createdAt");

-- 승인 + 최신순 (5개 모델 공통 패턴)
CREATE INDEX IF NOT EXISTS "rentals_approved_createdAt_idx" ON "rentals"("approved", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "lessons_approved_createdAt_idx" ON "lessons"("approved", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "accommodations_approved_createdAt_idx" ON "accommodations"("approved", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "ski_shops_approved_isPremium_createdAt_idx" ON "ski_shops"("approved", "isPremium", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "repair_shops_approved_isPremium_createdAt_idx" ON "repair_shops"("approved", "isPremium", "createdAt" DESC);

-- Review: 판매자별 최신 리뷰
CREATE INDEX IF NOT EXISTS "reviews_sellerId_createdAt_idx" ON "reviews"("sellerId", "createdAt" DESC);
