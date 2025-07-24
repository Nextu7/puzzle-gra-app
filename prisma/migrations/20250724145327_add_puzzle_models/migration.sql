-- CreateTable
CREATE TABLE "Player" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerId" TEXT,
    "nickname" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Score" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playerId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL,
    "timeInSeconds" INTEGER NOT NULL,
    "shop" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Score_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PuzzleConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "imageUrl" TEXT,
    "previewUrl" TEXT,
    "difficulties" TEXT NOT NULL DEFAULT 'p30,p56,p99,p143,p304',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "GameSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playerId" TEXT,
    "productId" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    "timeSpent" INTEGER,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "GameSession_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Player_customerId_key" ON "Player"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "Player_customerId_shop_key" ON "Player"("customerId", "shop");

-- CreateIndex
CREATE INDEX "Score_productId_difficulty_timeInSeconds_idx" ON "Score"("productId", "difficulty", "timeInSeconds");

-- CreateIndex
CREATE INDEX "Score_shop_productId_idx" ON "Score"("shop", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "PuzzleConfig_productId_shop_key" ON "PuzzleConfig"("productId", "shop");

-- CreateIndex
CREATE INDEX "GameSession_shop_productId_idx" ON "GameSession"("shop", "productId");
