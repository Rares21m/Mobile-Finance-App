-- Sprint 6 foundation: transaction normalization, canonical identity, read model

-- AlterTable
ALTER TABLE "Transaction"
ADD COLUMN "canonicalId" TEXT,
ADD COLUMN "sourceLabel" TEXT NOT NULL DEFAULT 'synced',
ADD COLUMN "merchantNormalized" TEXT,
ADD COLUMN "inferredCategory" TEXT,
ADD COLUMN "normalizedBookingDate" TIMESTAMP(3),
ADD COLUMN "normalizedValueDate" TIMESTAMP(3),
ADD COLUMN "payloadHash" TEXT,
ADD COLUMN "syncBatchId" TEXT,
ADD COLUMN "isDuplicate" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "duplicateOfId" TEXT,
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "ManualTransaction"
ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "MonthlyTransactionSummary" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "monthStart" TIMESTAMP(3) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'RON',
    "incomeTotal" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "expenseTotal" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "netTotal" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "transactionCount" INTEGER NOT NULL DEFAULT 0,
    "manualCount" INTEGER NOT NULL DEFAULT 0,
    "syncedCount" INTEGER NOT NULL DEFAULT 0,
    "inferredCount" INTEGER NOT NULL DEFAULT 0,
    "cachedCount" INTEGER NOT NULL DEFAULT 0,
    "topCategory" TEXT,
    "topMerchant" TEXT,
    "sourceUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MonthlyTransactionSummary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Transaction_bookingDate_desc_idx" ON "Transaction"("bookingDate" DESC);
CREATE INDEX "Transaction_bankConnectionId_bookingDate_desc_idx" ON "Transaction"("bankConnectionId", "bookingDate" DESC);
CREATE INDEX "Transaction_bankConnectionId_valueDate_desc_idx" ON "Transaction"("bankConnectionId", "valueDate" DESC);
CREATE INDEX "Transaction_canonicalId_idx" ON "Transaction"("canonicalId");
CREATE INDEX "Transaction_merchantNormalized_idx" ON "Transaction"("merchantNormalized");
CREATE INDEX "Transaction_isDuplicate_canonicalId_idx" ON "Transaction"("isDuplicate", "canonicalId");

-- Nullable canonicalId keeps unique checks only for known canonical rows.
CREATE UNIQUE INDEX "Transaction_bankConnectionId_canonicalId_key" ON "Transaction"("bankConnectionId", "canonicalId");

CREATE INDEX "ManualTransaction_userId_date_desc_idx" ON "ManualTransaction"("userId", "date" DESC);
CREATE INDEX "TransactionCategoryOverride_userId_updatedAt_desc_idx" ON "TransactionCategoryOverride"("userId", "updatedAt" DESC);

CREATE UNIQUE INDEX "MonthlyTransactionSummary_userId_monthStart_currency_key" ON "MonthlyTransactionSummary"("userId", "monthStart", "currency");
CREATE INDEX "MonthlyTransactionSummary_userId_monthStart_desc_idx" ON "MonthlyTransactionSummary"("userId", "monthStart" DESC);

-- AddForeignKey
ALTER TABLE "Transaction"
ADD CONSTRAINT "Transaction_duplicateOfId_fkey"
FOREIGN KEY ("duplicateOfId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "MonthlyTransactionSummary"
ADD CONSTRAINT "MonthlyTransactionSummary_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
