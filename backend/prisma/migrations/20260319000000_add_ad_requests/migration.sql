-- CreateTable
CREATE TABLE "ad_requests" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "category" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "image" TEXT,
    "message" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "adminNote" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ad_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ad_requests_userId_idx" ON "ad_requests"("userId");

-- CreateIndex
CREATE INDEX "ad_requests_status_idx" ON "ad_requests"("status");

-- AddForeignKey
ALTER TABLE "ad_requests" ADD CONSTRAINT "ad_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
