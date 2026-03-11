-- CreateTable
CREATE TABLE "ManualTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'RON',
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'other',
    "date" TIMESTAMP(3) NOT NULL,
    "isExpense" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ManualTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransactionCategoryOverride" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransactionCategoryOverride_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ManualTransaction_userId_idx" ON "ManualTransaction"("userId");

-- CreateIndex
CREATE INDEX "ManualTransaction_date_idx" ON "ManualTransaction"("date");

-- CreateIndex
CREATE INDEX "TransactionCategoryOverride_userId_idx" ON "TransactionCategoryOverride"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TransactionCategoryOverride_userId_transactionId_key" ON "TransactionCategoryOverride"("userId", "transactionId");

-- AddForeignKey
ALTER TABLE "ManualTransaction" ADD CONSTRAINT "ManualTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionCategoryOverride" ADD CONSTRAINT "TransactionCategoryOverride_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
