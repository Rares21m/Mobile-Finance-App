
require("dotenv").config();

const prisma = require("../src/config/db");
const {
  normalizeMerchantName,
  normalizeDateOnly,
  buildCanonicalTransactionId,
  buildPayloadHash
} = require("../src/utils/transactionNormalization");
const {
  rebuildMonthlySummariesForUser
} = require("../src/services/monthlySummary.service");

function dateOnlyToDate(dateOnly) {
  if (!dateOnly) return null;
  return new Date(`${dateOnly}T00:00:00.000Z`);
}

async function backfillTransactions() {
  const connections = await prisma.bankConnection.findMany({
    include: {
      transactions: {
        orderBy: [{ bookingDate: "desc" }, { createdAt: "desc" }]
      }
    }
  });

  let updatedRows = 0;
  let duplicateRows = 0;

  for (const connection of connections) {
    const seenCanonical = new Set();

    for (const tx of connection.transactions) {
      const normalizedBooking = normalizeDateOnly(tx.bookingDate);
      const normalizedValue = normalizeDateOnly(tx.valueDate);
      const canonicalId = buildCanonicalTransactionId({
        bankName: connection.bankName,
        accountId: connection.id,
        amount: tx.amount,
        currency: tx.currency,
        bookingDate: normalizedBooking,
        valueDate: normalizedValue,
        creditorName: tx.creditorName,
        debtorName: tx.debtorName,
        remittanceInfo: tx.remittanceInfo,
        transactionId: tx.transactionId
      });

      const merchantNormalized = normalizeMerchantName(
        tx.creditorName || tx.debtorName || tx.remittanceInfo
      );

      const isDuplicate = seenCanonical.has(canonicalId);
      if (isDuplicate) {
        duplicateRows += 1;
      } else {
        seenCanonical.add(canonicalId);
      }

      await prisma.transaction.update({
        where: { id: tx.id },
        data: {
          canonicalId,
          merchantNormalized,
          normalizedBookingDate: dateOnlyToDate(normalizedBooking),
          normalizedValueDate: dateOnlyToDate(normalizedValue),
          payloadHash: buildPayloadHash({
            amount: tx.amount,
            currency: tx.currency,
            creditorName: tx.creditorName,
            debtorName: tx.debtorName,
            bookingDate: normalizedBooking,
            valueDate: normalizedValue,
            remittanceInfo: tx.remittanceInfo
          }),
          sourceLabel: tx.sourceLabel || "synced",
          isDuplicate
        }
      });

      updatedRows += 1;
    }
  }

  return { updatedRows, duplicateRows };
}

async function backfillMonthlySummaries() {
  const users = await prisma.user.findMany({ select: { id: true } });
  const result = [];

  for (const user of users) {
    const built = await rebuildMonthlySummariesForUser(user.id);
    result.push(built);
  }

  return result;
}

(async () => {
  try {
    console.log("[DataAccuracy] Backfill started...");

    const txResult = await backfillTransactions();
    console.log(
      `[DataAccuracy] Transactions updated: ${txResult.updatedRows}, duplicates marked: ${txResult.duplicateRows}`
    );

    const summaries = await backfillMonthlySummaries();
    const totalMonths = summaries.reduce((sum, row) => sum + row.months, 0);
    console.log(
      `[DataAccuracy] Monthly summaries rebuilt for ${summaries.length} users (${totalMonths} month rows).`
    );

    console.log("[DataAccuracy] Backfill completed.");
  } catch (err) {
    console.error("[DataAccuracy] Backfill failed:", err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
})();