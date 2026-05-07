-- 위클리 다이제스트 구독 테이블
CREATE TABLE IF NOT EXISTS "newsletter_subscriptions" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "source" TEXT,
    "unsubToken" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "newsletter_subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "newsletter_subscriptions_email_key" ON "newsletter_subscriptions"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "newsletter_subscriptions_unsubToken_key" ON "newsletter_subscriptions"("unsubToken");
CREATE INDEX IF NOT EXISTS "newsletter_subscriptions_active_idx" ON "newsletter_subscriptions"("active");
