const prisma = require("../config/db");

function clampMonths(value) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return 6;
  return Math.min(Math.max(parsed, 1), 24);
}

async function getMonthlySummary(req, res) {
  const months = clampMonths(req.query.months);

  const rows = await prisma.monthlyTransactionSummary.findMany({
    where: { userId: req.userId },
    orderBy: { monthStart: "desc" },
    take: months,
    select: {
      monthStart: true,
      currency: true,
      incomeTotal: true,
      expenseTotal: true,
      netTotal: true,
      transactionCount: true,
      manualCount: true,
      syncedCount: true,
      inferredCount: true,
      cachedCount: true,
      sourceUpdatedAt: true
    }
  });

  const monthly = rows.
  map((row) => ({
    monthStart: row.monthStart,
    currency: row.currency,
    income: Number(row.incomeTotal || 0),
    expenses: Number(row.expenseTotal || 0),
    net: Number(row.netTotal || 0),
    transactionCount: row.transactionCount,
    sourceBreakdown: {
      manual: row.manualCount,
      synced: row.syncedCount,
      inferred: row.inferredCount,
      cached: row.cachedCount
    },
    lastUpdatedAt: row.sourceUpdatedAt
  })).
  sort((a, b) => new Date(a.monthStart) - new Date(b.monthStart));

  return res.json({
    months,
    monthly
  });
}

module.exports = {
  getMonthlySummary
};