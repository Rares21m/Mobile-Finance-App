const prisma = require("../config/db");

function monthStartForDate(dateLike) {
  const d = new Date(dateLike);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

function transactionDate(tx) {
  return tx.normalizedValueDate || tx.normalizedBookingDate || tx.valueDate || tx.bookingDate;
}

function topKey(countMap) {
  return Object.entries(countMap).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
}

async function rebuildMonthlySummariesForUser(userId) {
  const [bankTxs, manualTxs] = await Promise.all([
  prisma.transaction.findMany({
    where: {
      bankConnection: { userId },
      isDuplicate: false
    },
    select: {
      amount: true,
      currency: true,
      sourceLabel: true,
      category: true,
      merchantNormalized: true,
      normalizedBookingDate: true,
      normalizedValueDate: true,
      bookingDate: true,
      valueDate: true
    }
  }),
  prisma.manualTransaction.findMany({
    where: { userId },
    select: {
      amount: true,
      currency: true,
      category: true,
      description: true,
      date: true,
      isExpense: true
    }
  })]
  );

  const buckets = new Map();

  for (const tx of bankTxs) {
    const date = transactionDate(tx);
    const monthStart = monthStartForDate(date);
    if (!monthStart) continue;

    const key = `${monthStart.toISOString()}|${tx.currency || "RON"}`;
    if (!buckets.has(key)) {
      buckets.set(key, {
        monthStart,
        currency: tx.currency || "RON",
        incomeTotal: 0,
        expenseTotal: 0,
        netTotal: 0,
        transactionCount: 0,
        manualCount: 0,
        syncedCount: 0,
        inferredCount: 0,
        cachedCount: 0,
        categoryCount: {},
        merchantCount: {}
      });
    }

    const bucket = buckets.get(key);
    const amount = Number(tx.amount || 0);

    if (amount >= 0) {
      bucket.incomeTotal += amount;
    } else {
      bucket.expenseTotal += Math.abs(amount);
    }

    bucket.netTotal += amount;
    bucket.transactionCount += 1;

    if (tx.sourceLabel === "inferred") bucket.inferredCount += 1;else
    if (tx.sourceLabel === "cached") bucket.cachedCount += 1;else
    bucket.syncedCount += 1;

    if (tx.category) {
      bucket.categoryCount[tx.category] = (bucket.categoryCount[tx.category] || 0) + 1;
    }

    if (tx.merchantNormalized) {
      bucket.merchantCount[tx.merchantNormalized] =
      (bucket.merchantCount[tx.merchantNormalized] || 0) + 1;
    }
  }

  for (const tx of manualTxs) {
    const monthStart = monthStartForDate(tx.date);
    if (!monthStart) continue;

    const key = `${monthStart.toISOString()}|${tx.currency || "RON"}`;
    if (!buckets.has(key)) {
      buckets.set(key, {
        monthStart,
        currency: tx.currency || "RON",
        incomeTotal: 0,
        expenseTotal: 0,
        netTotal: 0,
        transactionCount: 0,
        manualCount: 0,
        syncedCount: 0,
        inferredCount: 0,
        cachedCount: 0,
        categoryCount: {},
        merchantCount: {}
      });
    }

    const bucket = buckets.get(key);
    const amountValue = Number(tx.amount || 0);
    const signedAmount = tx.isExpense ? -Math.abs(amountValue) : Math.abs(amountValue);

    if (signedAmount >= 0) bucket.incomeTotal += signedAmount;else
    bucket.expenseTotal += Math.abs(signedAmount);

    bucket.netTotal += signedAmount;
    bucket.transactionCount += 1;
    bucket.manualCount += 1;

    if (tx.category) {
      bucket.categoryCount[tx.category] = (bucket.categoryCount[tx.category] || 0) + 1;
    }
    if (tx.description) {
      bucket.merchantCount[tx.description.toLowerCase().trim()] =
      (bucket.merchantCount[tx.description.toLowerCase().trim()] || 0) + 1;
    }
  }

  await prisma.monthlyTransactionSummary.deleteMany({ where: { userId } });

  const summaryRows = Array.from(buckets.values()).map((bucket) => ({
    userId,
    monthStart: bucket.monthStart,
    currency: bucket.currency,
    incomeTotal: Number(bucket.incomeTotal.toFixed(2)),
    expenseTotal: Number(bucket.expenseTotal.toFixed(2)),
    netTotal: Number(bucket.netTotal.toFixed(2)),
    transactionCount: bucket.transactionCount,
    manualCount: bucket.manualCount,
    syncedCount: bucket.syncedCount,
    inferredCount: bucket.inferredCount,
    cachedCount: bucket.cachedCount,
    topCategory: topKey(bucket.categoryCount),
    topMerchant: topKey(bucket.merchantCount),
    sourceUpdatedAt: new Date()
  }));

  if (summaryRows.length > 0) {
    await prisma.monthlyTransactionSummary.createMany({ data: summaryRows });
  }

  return {
    userId,
    months: summaryRows.length,
    transactions: summaryRows.reduce((sum, row) => sum + row.transactionCount, 0)
  };
}

module.exports = {
  rebuildMonthlySummariesForUser
};