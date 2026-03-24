
require("dotenv").config();

const prisma = require("../src/config/db");

async function timed(label, fn) {
  const started = Date.now();
  const result = await fn();
  const durationMs = Date.now() - started;
  return {
    label,
    durationMs,
    rows: Array.isArray(result) ? result.length : 1
  };
}

function estimatePayloadBytes(value) {
  return Buffer.byteLength(JSON.stringify(value), "utf8");
}

function buildCategoryTotals(transactions) {
  const map = {};
  for (const tx of transactions) {
    const amount = Number(tx.amount || 0);
    if (amount >= 0) continue;
    const key = tx.category || "other";
    map[key] = Number(((map[key] || 0) + Math.abs(amount)).toFixed(2));
  }
  return map;
}

async function main() {
  const firstConnection = await prisma.bankConnection.findFirst({
    where: { status: "active" },
    orderBy: { createdAt: "desc" },
    select: { id: true, userId: true }
  });

  if (!firstConnection) {
    console.log("[DataAccuracy] Profiling skipped: no active bank connection found.");
    return;
  }

  const { userId } = firstConnection;

  const topConnection = await prisma.bankConnection.findFirst({
    where: {
      status: "active",
      userId
    },
    orderBy: {
      transactions: {
        _count: "desc"
      }
    },
    select: { id: true }
  });

  const bankConnectionId = topConnection?.id || firstConnection.id;

  const profiles = [];

  profiles.push(
    await timed("transactions.byConnection.dateDesc", () =>
    prisma.transaction.findMany({
      where: { bankConnectionId },
      orderBy: { bookingDate: "desc" },
      take: 500,
      select: {
        bookingDate: true,
        valueDate: true,
        amount: true,
        category: true
      }
    })
    )
  );

  profiles.push(
    await timed("manual.byUser.dateDesc", () =>
    prisma.manualTransaction.findMany({
      where: { userId },
      orderBy: { date: "desc" },
      take: 500,
      select: {
        id: true,
        date: true,
        amount: true,
        category: true
      }
    })
    )
  );

  profiles.push(
    await timed("overrides.byUser.updatedDesc", () =>
    prisma.transactionCategoryOverride.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take: 500
    })
    )
  );

  try {
    profiles.push(
      await timed("monthlySummary.byUser.monthDesc", () =>
      prisma.monthlyTransactionSummary.findMany({
        where: { userId },
        orderBy: { monthStart: "desc" },
        take: 12
      })
      )
    );
  } catch (err) {
    profiles.push({
      label: "monthlySummary.byUser.monthDesc",
      durationMs: -1,
      rows: 0,
      note: `skipped (${err.code || err.name})`
    });
  }

  const chartSource = await prisma.transaction.findMany({
    where: { bankConnectionId },
    orderBy: { bookingDate: "desc" },
    take: 1000,
    select: {
      bookingDate: true,
      valueDate: true,
      amount: true,
      category: true
    }
  });

  const categoryTotals = buildCategoryTotals(chartSource);
  const payloadMetrics = {
    rawTransactionsBytes: estimatePayloadBytes(chartSource),
    categoryTotalsBytes: estimatePayloadBytes(categoryTotals),
    monthlyPoints: Object.keys(categoryTotals).length
  };

  console.log("[DataAccuracy] Query profiling results:");
  console.table(profiles);
  console.log("[DataAccuracy] Chart payload profiling:");
  console.log(JSON.stringify(payloadMetrics, null, 2));
}

main().
catch((err) => {
  console.error("[DataAccuracy] Profiling failed:", err);
  process.exitCode = 1;
}).
finally(async () => {
  await prisma.$disconnect();
});