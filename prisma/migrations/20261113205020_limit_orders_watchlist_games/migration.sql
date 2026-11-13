-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('OPEN', 'FILLED', 'CANCELLED');

-- AlterTable
ALTER TABLE "Bet" ADD COLUMN     "choice" TEXT,
ADD COLUMN     "coinId" TEXT,
ADD COLUMN     "entryPrice" DECIMAL(65,30),
ADD COLUMN     "result" TEXT,
ADD COLUMN     "settleAt" TIMESTAMP(3),
ADD COLUMN     "settlePrice" DECIMAL(65,30),
ADD COLUMN     "settledAt" TIMESTAMP(3),
ADD COLUMN     "target" DECIMAL(65,30);

-- CreateTable
CREATE TABLE "LimitOrder" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "coinId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "side" "TradeType" NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "limitPrice" DECIMAL(65,30) NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'OPEN',
    "reservedUSD" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "fillPrice" DECIMAL(65,30),
    "fillTotal" DECIMAL(65,30),
    "tradeId" TEXT,
    "filledAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LimitOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Watchlist" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "coinId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Watchlist_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LimitOrder_status_coinId_idx" ON "LimitOrder"("status", "coinId");

-- CreateIndex
CREATE INDEX "LimitOrder_userId_status_idx" ON "LimitOrder"("userId", "status");

-- CreateIndex
CREATE INDEX "Watchlist_userId_idx" ON "Watchlist"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Watchlist_userId_coinId_key" ON "Watchlist"("userId", "coinId");

-- CreateIndex
CREATE INDEX "Bet_userId_createdAt_idx" ON "Bet"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Bet_outcome_settleAt_idx" ON "Bet"("outcome", "settleAt");

-- AddForeignKey
ALTER TABLE "LimitOrder" ADD CONSTRAINT "LimitOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Watchlist" ADD CONSTRAINT "Watchlist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
