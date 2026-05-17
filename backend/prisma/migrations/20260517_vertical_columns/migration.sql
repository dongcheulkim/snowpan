-- 모든 주요 모델에 vertical 컬럼 추가 — multi-platform 아키텍처 본격 가동.
-- 기존 데이터는 모두 'snow' default (SNOWPAN 시기 데이터).
-- 향후 BIKEPAN/RUNPAN/SURFPAN/GOLFPAN/CAMPPAN 데이터 추가 시 자연 분리.

ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "vertical" TEXT NOT NULL DEFAULT 'snow';
ALTER TABLE "rentals" ADD COLUMN IF NOT EXISTS "vertical" TEXT NOT NULL DEFAULT 'snow';
ALTER TABLE "lessons" ADD COLUMN IF NOT EXISTS "vertical" TEXT NOT NULL DEFAULT 'snow';
ALTER TABLE "accommodations" ADD COLUMN IF NOT EXISTS "vertical" TEXT NOT NULL DEFAULT 'snow';
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "vertical" TEXT NOT NULL DEFAULT 'snow';
ALTER TABLE "ski_shops" ADD COLUMN IF NOT EXISTS "vertical" TEXT NOT NULL DEFAULT 'snow';
ALTER TABLE "repair_shops" ADD COLUMN IF NOT EXISTS "vertical" TEXT NOT NULL DEFAULT 'snow';
ALTER TABLE "webcams" ADD COLUMN IF NOT EXISTS "vertical" TEXT NOT NULL DEFAULT 'snow';

-- 인덱스: 플랫폼별 핫 쿼리 가속
CREATE INDEX IF NOT EXISTS "products_vertical_category_createdAt_idx" ON "products"("vertical", "category", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "products_vertical_category_subcategory_idx" ON "products"("vertical", "category", "subcategory");
CREATE INDEX IF NOT EXISTS "rentals_vertical_approved_createdAt_idx" ON "rentals"("vertical", "approved", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "lessons_vertical_approved_createdAt_idx" ON "lessons"("vertical", "approved", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "accommodations_vertical_approved_createdAt_idx" ON "accommodations"("vertical", "approved", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "posts_vertical_createdAt_idx" ON "posts"("vertical", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "posts_vertical_category_createdAt_idx" ON "posts"("vertical", "category", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "ski_shops_vertical_approved_isPremium_createdAt_idx" ON "ski_shops"("vertical", "approved", "isPremium", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "repair_shops_vertical_approved_isPremium_createdAt_idx" ON "repair_shops"("vertical", "approved", "isPremium", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "webcams_vertical_active_order_idx" ON "webcams"("vertical", "active", "order");
