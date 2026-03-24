
require("dotenv").config();

const prisma = require("../src/config/db");

function round2(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function monthBounds(now = new Date()) {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));
  return { start, end };
}

function toDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

async function main() {
  const connection = await prisma.bankConnection.findFirst({
    where: { status: "active" },
    select: { id: true, userId: true },
    orderBy: { createdAt: "desc" }
  });

  if (!connection) {
    console.log("[DataAccuracy] Parity integration skipped: no active connection found.");
    return;
  }

  const { start, end } = monthBounds();

  const activeConnections = await prisma.bankConnection.findMany({
    where: { userId: connection.userId, status: "active" },
    select: { id: true }
  });
  const activeConnectionIds = activeConnections.map((row) => row.id);

  const [bankTx, manualTx, summaries] = await Promise.all([
  prisma.transaction.findMany({
    where: {
      bankConnectionId: { in: activeConnectionIds },
      isDuplicate: false,
      bookingDate: {
        gte: start,
        lte: end
      }
    },
    select: {
      amount: true
    }
  }),
  prisma.manualTransaction.findMany({
    where: {
      userId: connection.userId,
      date: {
        gte: start,
        lte: end
      }
    },
    select: {
      amount: true,
      isExpense: true
    }
  }),
  prisma.monthlyTransactionSummary.findMany({
    where: {
      userId: connection.userId,
      monthStart: start
    },
    select: {
      incomeTotal: true,
      expenseTotal: true,
      netTotal: true,
      transactionCount: true
    }
  })]
  );

  let income = 0;
  let expenses = 0;

  for (const tx of bankTx) {
    const amount = Number(tx.amount || 0);
    if (amount >= 0) income += amount;else
    expenses += Math.abs(amount);
  }

  for (const tx of manualTx) {
    const amount = Number(tx.amount || 0);
    if (tx.isExpense) expenses += Math.abs(amount);else
    income += Math.abs(amount);
  }

  const base = {
    income: round2(income),
    expenses: round2(expenses),
    net: round2(income - expenses),
    transactionCount: bankTx.length + manualTx.length
  };

  const fromReadModel = summaries.reduce(
    (acc, row) => {
      acc.income += Number(row.incomeTotal || 0);
      acc.expenses += Number(row.expenseTotal || 0);
      acc.net += Number(row.netTotal || 0);
      acc.transactionCount += Number(row.transactionCount || 0);
      return acc;
    },
    { income: 0, expenses: 0, net: 0, transactionCount: 0 }
  );

  const readModel = {
    income: round2(fromReadModel.income),
    expenses: round2(fromReadModel.expenses),
    net: round2(fromReadModel.net),
    transactionCount: fromReadModel.transactionCount
  };

  const deltas = {
    income: round2(base.income - readModel.income),
    expenses: round2(base.expenses - readModel.expenses),
    net: round2(base.net - readModel.net),
    transactionCount: base.transactionCount - readModel.transactionCount
  };

  const maxDelta = Math.max(
    Math.abs(deltas.income),
    Math.abs(deltas.expenses),
    Math.abs(deltas.net),
    Math.abs(deltas.transactionCount)
  );

  const result = {
    window: {
      monthStart: start.toISOString(),
      monthEnd: toDate(end)?.toISOString() || null
    },
    connection,
    activeConnectionCount: activeConnectionIds.length,
    base,
    readModel,
    deltas
  };

  if (maxDelta > 0.01) {
    console.error("[DataAccuracy] Integration parity check failed.");
    console.error(JSON.stringify(result, null, 2));
    process.exitCode = 1;
    return;
  }

  console.log("[DataAccuracy] Integration parity check passed.");
  console.log(JSON.stringify(result, null, 2));
}

main().
catch((err) => {
  console.error("[DataAccuracy] Integration parity failed:", err);
  process.exitCode = 1;
}).
finally(async () => {
  await prisma.$disconnect();
});