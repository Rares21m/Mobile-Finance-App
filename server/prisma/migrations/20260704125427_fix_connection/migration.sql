-- DropIndex
DROP INDEX "Transaction_bookingDate_idx";

-- AlterTable
ALTER TABLE "ManualTransaction" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "MonthlyTransactionSummary" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Transaction" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- RenameIndex
ALTER INDEX "ManualTransaction_userId_date_desc_idx" RENAME TO "ManualTransaction_userId_date_idx";

-- RenameIndex
ALTER INDEX "MonthlyTransactionSummary_userId_monthStart_desc_idx" RENAME TO "MonthlyTransactionSummary_userId_monthStart_idx";

-- RenameIndex
ALTER INDEX "Transaction_bankConnectionId_bookingDate_desc_idx" RENAME TO "Transaction_bankConnectionId_bookingDate_idx";

-- RenameIndex
ALTER INDEX "Transaction_bankConnectionId_valueDate_desc_idx" RENAME TO "Transaction_bankConnectionId_valueDate_idx";

-- RenameIndex
ALTER INDEX "TransactionCategoryOverride_userId_updatedAt_desc_idx" RENAME TO "TransactionCategoryOverride_userId_updatedAt_idx";
