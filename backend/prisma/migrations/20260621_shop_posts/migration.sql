CREATE TABLE IF NOT EXISTS "shop_posts" (
  "id" TEXT NOT NULL,
  "shopType" TEXT NOT NULL,
  "shopId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "images" TEXT,
  "postType" TEXT NOT NULL DEFAULT 'general',
  "pinned" BOOLEAN NOT NULL DEFAULT false,
  "viewCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "shop_posts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "shop_posts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "shop_posts_shopType_shopId_pinned_createdAt_idx"
  ON "shop_posts"("shopType", "shopId", "pinned", "createdAt");
CREATE INDEX IF NOT EXISTS "shop_posts_userId_createdAt_idx"
  ON "shop_posts"("userId", "createdAt");
