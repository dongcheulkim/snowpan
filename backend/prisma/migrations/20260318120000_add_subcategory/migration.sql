-- AlterTable
ALTER TABLE "products" ADD COLUMN "subcategory" TEXT;

-- CreateIndex
CREATE INDEX "products_category_subcategory_idx" ON "products"("category", "subcategory");

-- MigrateData: brand에 저장된 장비 종류를 subcategory로 이전
UPDATE "products"
SET "subcategory" = "brand", "brand" = ''
WHERE "brand" IN ('ski', 'board', 'boots', 'binding', 'helmet', 'goggles', 'wear', 'etc');
