-- 실시간 웹캠 테이블
CREATE TABLE IF NOT EXISTS "webcams" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "slopes" INTEGER NOT NULL DEFAULT 0,
    "elevation" TEXT,
    "camCount" INTEGER NOT NULL DEFAULT 0,
    "cameras" JSONB,
    "externalUrl" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webcams_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "webcams_slug_key" ON "webcams"("slug");
CREATE INDEX IF NOT EXISTS "webcams_active_order_idx" ON "webcams"("active", "order");
