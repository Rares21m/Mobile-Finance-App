
const assert = require("assert");

function parseDate(value) {
  if (!value) return null;
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function filterCurrentMonth(transactions, now = new Date("2026-03-15T12:00:00Z")) {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  return transactions.filter((tx) => {
    const d = parseDate(tx.bookingDate || tx.valueDate);
    return d && d >= start && d <= now;
  });
}

function explainTotals(transactions) {
  let income = 0;
  let expenses = 0;
  for (const tx of transactions) {
    const amount = Number(tx.amount || 0);
    if (amount > 0) income += amount;else
    expenses += Math.abs(amount);
  }

  return {
    income: Number(income.toFixed(2)),
    expenses: Number(expenses.toFixed(2)),
    net: Number((income - expenses).toFixed(2))
  };
}

function budgetSpentByCategory(transactions) {
  const map = {};
  for (const tx of transactions) {
    const amount = Number(tx.amount || 0);
    if (amount >= 0) continue;
    const key = tx.category || "other";
    map[key] = Number(((map[key] || 0) + Math.abs(amount)).toFixed(2));
  }
  return map;
}

const fixture = [
{ id: "t1", amount: 6500, category: "salary", bookingDate: "2026-03-05", sourceLabel: "synced" },
{ id: "t2", amount: -320, category: "food", bookingDate: "2026-03-06", sourceLabel: "synced" },
{ id: "t3", amount: -120, category: "transport", bookingDate: "2026-03-08", sourceLabel: "manual" },
{ id: "t4", amount: -450, category: "housing", bookingDate: "2026-03-09", sourceLabel: "synced" },
{ id: "t5", amount: -110, category: "entertainment", bookingDate: "2026-03-10", sourceLabel: "cached" },
{ id: "t6", amount: 1300, category: "salary", bookingDate: "2026-03-12", sourceLabel: "inferred" },
{ id: "t7", amount: -210, category: "utilities", bookingDate: "2026-03-12", sourceLabel: "synced" },
{ id: "t8", amount: -95, category: "health", bookingDate: "2026-03-13", sourceLabel: "manual" }];


const monthly = filterCurrentMonth(fixture);


const home = explainTotals(monthly);
const analytics = explainTotals(monthly);

const spendingByCategory = budgetSpentByCategory(monthly);
const budgetTotalSpent = Number(
  Object.values(spendingByCategory).reduce((sum, value) => sum + value, 0).toFixed(2)
);

const snapshot = {
  home,
  analytics,
  budget: {
    totalSpent: budgetTotalSpent,
    byCategory: spendingByCategory
  },
  parityDelta: {
    income: Number((home.income - analytics.income).toFixed(2)),
    expenses: Number((home.expenses - analytics.expenses).toFixed(2)),
    budgetVsAnalyticsExpenses: Number((budgetTotalSpent - analytics.expenses).toFixed(2))
  }
};

const expected = {
  home: { income: 7800, expenses: 1305, net: 6495 },
  analytics: { income: 7800, expenses: 1305, net: 6495 },
  budget: {
    totalSpent: 1305,
    byCategory: {
      food: 320,
      transport: 120,
      housing: 450,
      entertainment: 110,
      utilities: 210,
      health: 95
    }
  },
  parityDelta: {
    income: 0,
    expenses: 0,
    budgetVsAnalyticsExpenses: 0
  }
};

try {
  assert.deepStrictEqual(snapshot, expected);
  console.log("[DataAccuracy] Aggregation snapshot tests passed.");
  console.log(JSON.stringify(snapshot, null, 2));
} catch (err) {
  console.error("[DataAccuracy] Aggregation snapshot tests failed.");
  console.error("Computed:", JSON.stringify(snapshot, null, 2));
  console.error("Expected:", JSON.stringify(expected, null, 2));
  throw err;
}