-- CreateIndex
CREATE INDEX "accommodations_resortId_idx" ON "accommodations"("resortId");

-- CreateIndex
CREATE INDEX "accommodations_userId_idx" ON "accommodations"("userId");

-- CreateIndex
CREATE INDEX "lessons_resortId_idx" ON "lessons"("resortId");

-- CreateIndex
CREATE INDEX "lessons_userId_idx" ON "lessons"("userId");

-- CreateIndex
CREATE INDEX "messages_roomId_idx" ON "messages"("roomId");

-- CreateIndex
CREATE INDEX "messages_senderId_idx" ON "messages"("senderId");

-- CreateIndex
CREATE INDEX "posts_sport_idx" ON "posts"("sport");

-- CreateIndex
CREATE INDEX "posts_category_idx" ON "posts"("category");

-- CreateIndex
CREATE INDEX "posts_userId_idx" ON "posts"("userId");

-- CreateIndex
CREATE INDEX "posts_createdAt_idx" ON "posts"("createdAt");

-- CreateIndex
CREATE INDEX "products_category_idx" ON "products"("category");

-- CreateIndex
CREATE INDEX "products_userId_idx" ON "products"("userId");

-- CreateIndex
CREATE INDEX "products_createdAt_idx" ON "products"("createdAt");

-- CreateIndex
CREATE INDEX "rentals_resortId_idx" ON "rentals"("resortId");

-- CreateIndex
CREATE INDEX "rentals_userId_idx" ON "rentals"("userId");
