CREATE TABLE IF NOT EXISTS "polls" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "likes" INTEGER NOT NULL DEFAULT 0,
  "views" INTEGER NOT NULL DEFAULT 0,
  "vertical" TEXT NOT NULL DEFAULT 'snow',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "polls_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "polls_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "polls_vertical_createdAt_idx" ON "polls"("vertical", "createdAt");

CREATE TABLE IF NOT EXISTS "poll_options" (
  "id" TEXT NOT NULL,
  "pollId" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "order" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "poll_options_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "poll_options_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "polls"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "poll_options_pollId_order_idx" ON "poll_options"("pollId", "order");

CREATE TABLE IF NOT EXISTS "poll_votes" (
  "id" TEXT NOT NULL,
  "pollId" TEXT NOT NULL,
  "optionId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "poll_votes_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "poll_votes_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "polls"("id") ON DELETE CASCADE,
  CONSTRAINT "poll_votes_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "poll_options"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "poll_votes_pollId_userId_key" ON "poll_votes"("pollId", "userId");
CREATE INDEX IF NOT EXISTS "poll_votes_optionId_idx" ON "poll_votes"("optionId");
