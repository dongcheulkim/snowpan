/*
  Warnings:

  - Added the required column `userId` to the `lessons` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `rentals` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_lessons" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "duration" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "maxStudents" INTEGER NOT NULL,
    "image" TEXT NOT NULL,
    "resortId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "lessons_resortId_fkey" FOREIGN KEY ("resortId") REFERENCES "ski_resorts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "lessons_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_lessons" ("createdAt", "duration", "id", "image", "level", "maxStudents", "name", "price", "resortId", "updatedAt") SELECT "createdAt", "duration", "id", "image", "level", "maxStudents", "name", "price", "resortId", "updatedAt" FROM "lessons";
DROP TABLE "lessons";
ALTER TABLE "new_lessons" RENAME TO "lessons";
CREATE TABLE "new_products" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "image" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "rating" REAL,
    "reviewCount" INTEGER,
    "condition" TEXT,
    "usageCount" TEXT,
    "userId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "products_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_products" ("brand", "category", "condition", "createdAt", "description", "id", "image", "name", "price", "rating", "reviewCount", "updatedAt", "usageCount") SELECT "brand", "category", "condition", "createdAt", "description", "id", "image", "name", "price", "rating", "reviewCount", "updatedAt", "usageCount" FROM "products";
DROP TABLE "products";
ALTER TABLE "new_products" RENAME TO "products";
CREATE TABLE "new_rentals" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "duration" TEXT NOT NULL,
    "equipment" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "resortId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "rentals_resortId_fkey" FOREIGN KEY ("resortId") REFERENCES "ski_resorts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "rentals_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_rentals" ("createdAt", "duration", "equipment", "id", "image", "name", "price", "resortId", "updatedAt") SELECT "createdAt", "duration", "equipment", "id", "image", "name", "price", "resortId", "updatedAt" FROM "rentals";
DROP TABLE "rentals";
ALTER TABLE "new_rentals" RENAME TO "rentals";
CREATE TABLE "new_users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "phoneVerified" BOOLEAN NOT NULL DEFAULT false,
    "role" TEXT NOT NULL DEFAULT 'user',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_users" ("createdAt", "email", "id", "name", "password", "phone", "phoneVerified", "updatedAt") SELECT "createdAt", "email", "id", "name", "password", "phone", "phoneVerified", "updatedAt" FROM "users";
DROP TABLE "users";
ALTER TABLE "new_users" RENAME TO "users";
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
