const prisma = require("../config/db");

const INCOME_MIDPOINTS = {
  under_1500: 1200,
  "1500_3000": 2250,
  "3000_6000": 4500,
  over_6000: 8000
};

const CATEGORY_KEYWORDS = {
  food: ["mega image", "kaufland", "lidl", "carrefour", "restaurant", "glovo", "tazz"],
  transport: ["bolt", "uber", "taxi", "metrorex", "stb", "petrom", "omv", "mol"],
  shopping: ["emag", "altex", "h&m", "zara", "decathlon", "amazon"],
  utilities: ["enel", "electrica", "engie", "digi", "orange", "vodafone", "factura"],
  housing: ["chirie", "rent", "intretinere", "administrator", "asociatie"],
  entertainment: ["netflix", "spotify", "hbo", "disney", "cinema", "concert"],
  health: ["farmacie", "catena", "doctor", "clinica", "spital", "medical"]
};

function parseProfileCategories(raw) {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function round2(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

function formatDate(date) {
  const d = new Date(date);
  return d.toISOString().slice(0, 10);
}

function startOfMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function monthDiff(a, b) {
  return b.getMonth() - a.getMonth() + 12 * (b.getFullYear() - a.getFullYear());
}

function parseCategory(tx) {
  const explicit = tx.category || tx.inferredCategory;
  if (explicit) return explicit;

  const text = `${tx.creditorName || ""} ${tx.debtorName || ""} ${tx.remittanceInfo || tx.remittanceInformationUnstructured || ""}`.toLowerCase();
  for (const [cat, words] of Object.entries(CATEGORY_KEYWORDS)) {
    if (words.some((w) => text.includes(w))) return cat;
  }
  return "other";
}

function toEntry(raw, source = "synced") {
  const amount = Number(raw.amount || raw.transactionAmount?.amount || 0);
  const isExpense = source === "manual" ? Boolean(raw.isExpense) : amount < 0;
  const absAmount = Math.abs(amount);
  const bookingDate = raw.bookingDate || raw.valueDate || raw.date;
  const merchant =
  raw.merchantNormalized ||
  raw.creditorName ||
  raw.debtorName ||
  raw.description ||
  "Unknown";

  return {
    id: raw.id || raw.transactionId,
    source,
    amount: round2(absAmount),
    signedAmount: amount,
    isExpense,
    date: new Date(bookingDate),
    dateIso: formatDate(bookingDate),
    merchant,
    category: parseCategory(raw),
    description:
    raw.remittanceInfo || raw.remittanceInformationUnstructured || raw.description || ""
  };
}

async function loadUserEntries(userId) {
  const [synced, manual] = await Promise.all([
  prisma.transaction.findMany({
    where: {
      bankConnection: { userId },
      isDuplicate: false
    },
    select: {
      id: true,
      transactionId: true,
      amount: true,
      bookingDate: true,
      valueDate: true,
      creditorName: true,
      debtorName: true,
      remittanceInfo: true,
      category: true,
      inferredCategory: true,
      merchantNormalized: true
    },
    orderBy: { bookingDate: "desc" },
    take: 1000
  }),
  prisma.manualTransaction.findMany({
    where: { userId },
    select: {
      id: true,
      amount: true,
      date: true,
      description: true,
      category: true,
      isExpense: true
    },
    orderBy: { date: "desc" },
    take: 500
  })]
  );

  const syncedEntries = synced.
  filter((tx) => tx.bookingDate || tx.valueDate).
  map((tx) => toEntry(tx, "synced"));

  const manualEntries = manual.
  filter((tx) => tx.date).
  map((tx) =>
  toEntry(
    {
      ...tx,
      amount: tx.isExpense ? -Math.abs(Number(tx.amount)) : Math.abs(Number(tx.amount))
    },
    "manual"
  )
  );

  return [...syncedEntries, ...manualEntries].sort((a, b) => b.date - a.date);
}

function detectSubscriptions(expenses) {
  const byMerchant = new Map();
  for (const tx of expenses) {
    const key = tx.merchant.toLowerCase().trim();
    if (!byMerchant.has(key)) byMerchant.set(key, []);
    byMerchant.get(key).push(tx);
  }

  const subscriptions = [];
  for (const [merchantKey, items] of byMerchant.entries()) {
    if (items.length < 2) continue;
    const sorted = [...items].sort((a, b) => a.date - b.date);
    const amountAvg = sorted.reduce((s, t) => s + t.amount, 0) / sorted.length;
    const amountVariance =
    sorted.reduce((s, t) => s + Math.abs(t.amount - amountAvg), 0) /
    Math.max(sorted.length, 1);

    const gaps = [];
    for (let i = 1; i < sorted.length; i += 1) {
      const prev = sorted[i - 1].date;
      const next = sorted[i].date;
      gaps.push(Math.round((next - prev) / (1000 * 60 * 60 * 24)));
    }

    const avgGap = gaps.length ?
    gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length :
    null;

    const isRecurring = avgGap && avgGap >= 20 && avgGap <= 40;
    const isStableAmount = amountVariance <= amountAvg * 0.25;

    if (!isRecurring || !isStableAmount) continue;

    const latest = sorted[sorted.length - 1];
    const nextDue = new Date(latest.date);
    nextDue.setDate(nextDue.getDate() + Math.round(avgGap));

    subscriptions.push({
      id: `sub_${merchantKey}`,
      merchant: latest.merchant,
      amount: round2(amountAvg),
      avgGapDays: Math.round(avgGap),
      nextDueDate: formatDate(nextDue),
      occurrences: sorted.length,
      category: latest.category
    });
  }

  return subscriptions.sort((a, b) => b.amount - a.amount);
}

function categorySpend(entries) {
  return entries.reduce((acc, tx) => {
    if (!tx.isExpense) return acc;
    acc[tx.category] = (acc[tx.category] || 0) + tx.amount;
    return acc;
  }, {});
}

function detectSpendingSpikes(expenses, now = new Date()) {
  const currentMonthStart = startOfMonth(now);

  const currentMonth = expenses.filter((tx) => tx.date >= currentMonthStart);
  const history = expenses.filter(
    (tx) => tx.date < currentMonthStart && monthDiff(tx.date, now) <= 3
  );

  const currentByCat = categorySpend(currentMonth);
  const histByCat = history.reduce((acc, tx) => {
    const monthKey = `${tx.date.getFullYear()}-${tx.date.getMonth()}`;
    if (!acc[monthKey]) acc[monthKey] = {};
    acc[monthKey][tx.category] = (acc[monthKey][tx.category] || 0) + tx.amount;
    return acc;
  }, {});

  const historicalAverages = {};
  const months = Object.values(histByCat);
  months.forEach((monthTotals) => {
    Object.entries(monthTotals).forEach(([cat, amount]) => {
      if (!historicalAverages[cat]) historicalAverages[cat] = [];
      historicalAverages[cat].push(amount);
    });
  });

  const spikes = [];
  Object.entries(currentByCat).forEach(([cat, amount]) => {
    const historyValues = historicalAverages[cat] || [];
    if (historyValues.length === 0) return;
    const avg = historyValues.reduce((s, v) => s + v, 0) / historyValues.length;
    if (avg < 100) return;

    const ratio = amount / avg;
    if (ratio >= 1.35 && amount - avg >= 100) {
      spikes.push({
        id: `spike_${cat}`,
        category: cat,
        currentAmount: round2(amount),
        baselineAmount: round2(avg),
        deltaAmount: round2(amount - avg),
        deltaPct: Math.round((ratio - 1) * 100)
      });
    }
  });

  return spikes.sort((a, b) => b.deltaAmount - a.deltaAmount);
}

function detectRecurringAnomalies(expenses, subscriptions, now = new Date()) {
  const currentMonthStart = startOfMonth(now);
  const currentMonth = expenses.filter((tx) => tx.date >= currentMonthStart);

  const byMerchant = new Map();
  for (const tx of currentMonth) {
    const key = tx.merchant.toLowerCase().trim();
    if (!byMerchant.has(key)) byMerchant.set(key, []);
    byMerchant.get(key).push(tx);
  }

  const anomalies = [];
  subscriptions.forEach((sub) => {
    const merchantKey = sub.merchant.toLowerCase().trim();
    const items = byMerchant.get(merchantKey) || [];
    const latest = items.sort((a, b) => b.date - a.date)[0];
    if (!latest) return;

    if (latest.amount > sub.amount * 1.4) {
      anomalies.push({
        id: `anomaly_${merchantKey}`,
        merchant: sub.merchant,
        expectedAmount: round2(sub.amount),
        observedAmount: round2(latest.amount),
        deltaAmount: round2(latest.amount - sub.amount),
        deltaPct: Math.round((latest.amount - sub.amount) / sub.amount * 100)
      });
    }
  });

  return anomalies.sort((a, b) => b.deltaAmount - a.deltaAmount);
}

function computeOverspendPrediction(entries, profile, now = new Date()) {
  const currentMonthStart = startOfMonth(now);
  const currentExpenses = entries.
  filter((tx) => tx.isExpense && tx.date >= currentMonthStart).
  reduce((sum, tx) => sum + tx.amount, 0);

  const dayOfMonth = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const elapsedRatio = Math.max(dayOfMonth / daysInMonth, 0.15);
  const projectedExpenses = currentExpenses / elapsedRatio;

  const incomeCurrentMonth = entries.
  filter((tx) => !tx.isExpense && tx.date >= currentMonthStart).
  reduce((sum, tx) => sum + tx.amount, 0);

  const expectedIncome =
  incomeCurrentMonth > 0 ?
  incomeCurrentMonth :
  INCOME_MIDPOINTS[profile?.incomeRange] || 2250;

  const projectedNet = expectedIncome - projectedExpenses;
  const overspendAmount = Math.max(projectedExpenses - expectedIncome, 0);

  let risk = "info";
  if (overspendAmount > expectedIncome * 0.2) risk = "critical";else
  if (overspendAmount > 0) risk = "warning";

  return {
    currentExpenses: round2(currentExpenses),
    projectedExpenses: round2(projectedExpenses),
    expectedIncome: round2(expectedIncome),
    projectedNet: round2(projectedNet),
    overspendAmount: round2(overspendAmount),
    risk
  };
}

function buildGoalSuggestions(profile, overspendPrediction, topCategories) {
  const baseIncome = INCOME_MIDPOINTS[profile?.incomeRange] || 2250;
  const discretionaryRatio = overspendPrediction.risk === "critical" ? 0.07 : 0.12;
  const monthlySuggestion = round2(Math.max(baseIncome * discretionaryRatio, 120));

  const scenarios = {
    conservative: round2(monthlySuggestion * 0.8),
    realistic: round2(monthlySuggestion),
    accelerated: round2(monthlySuggestion * 1.35)
  };

  const weeklyContribution = round2(scenarios.realistic / 4.33);
  const topCategory = topCategories[0]?.category || "other";

  return {
    primaryGoal: profile?.goal || "savings",
    topOptimizationCategory: topCategory,
    rationale:
    overspendPrediction.risk === "critical" ?
    "Reduce short-term overspend before accelerating contributions." :
    "You can allocate a stable weekly contribution without harming liquidity.",
    scenarios,
    weeklyContribution
  };
}

function buildInsightsPayload({
  subscriptions,
  spendingSpikes,
  recurringAnomalies,
  overspendPrediction,
  upcomingBills,
  goalSuggestions
}) {
  const insights = [];

  subscriptions.slice(0, 3).forEach((sub) => {
    insights.push({
      id: `ins_sub_${sub.id}`,
      type: "subscription",
      priority: "info",
      title: `Subscription detected: ${sub.merchant}`,
      summary: `${sub.amount.toFixed(2)} RON every ~${sub.avgGapDays} days.`,
      rationale: `${sub.occurrences} similar charges were detected with stable values.`,
      cta: {
        type: "review_subscription",
        label: "Review recurring charge",
        payload: { merchant: sub.merchant }
      }
    });
  });

  spendingSpikes.slice(0, 3).forEach((spike) => {
    insights.push({
      id: `ins_spike_${spike.id}`,
      type: "spending_spike",
      priority: spike.deltaPct >= 60 ? "warning" : "info",
      title: `Spending spike in ${spike.category}`,
      summary: `${spike.currentAmount.toFixed(2)} RON this month (${spike.deltaPct}% vs baseline).`,
      rationale: `Baseline over prior months is ${spike.baselineAmount.toFixed(2)} RON.`,
      cta: {
        type: "set_budget",
        label: "Set/update budget",
        payload: { category: spike.category }
      }
    });
  });

  recurringAnomalies.slice(0, 2).forEach((anomaly) => {
    insights.push({
      id: `ins_anomaly_${anomaly.id}`,
      type: "recurring_anomaly",
      priority: "warning",
      title: `Recurring anomaly: ${anomaly.merchant}`,
      summary: `${anomaly.observedAmount.toFixed(2)} RON charged, ${anomaly.deltaPct}% above usual value.`,
      rationale: `Expected around ${anomaly.expectedAmount.toFixed(2)} RON from prior recurring history.`,
      cta: {
        type: "inspect_transaction",
        label: "Inspect transaction",
        payload: { merchant: anomaly.merchant }
      }
    });
  });

  if (overspendPrediction.overspendAmount > 0) {
    insights.push({
      id: "ins_overspend_prediction",
      type: "overspend_prediction",
      priority: overspendPrediction.risk,
      title: "Potential overspend by month-end",
      summary: `Projected expenses ${overspendPrediction.projectedExpenses.toFixed(2)} RON vs expected income ${overspendPrediction.expectedIncome.toFixed(2)} RON.`,
      rationale: `Current pace implies ~${overspendPrediction.overspendAmount.toFixed(2)} RON overspend if unchanged.`,
      cta: {
        type: "reduce_spend_plan",
        label: "Generate reduction plan",
        payload: { overspendAmount: overspendPrediction.overspendAmount }
      }
    });
  }

  return {
    insights,
    overspendPrediction,
    upcomingBills,
    goalSuggestions
  };
}

function relevanceScore(insight, profile = {}) {
  const priorityScore =
  insight.priority === "critical" ?
  55 :
  insight.priority === "warning" ?
  40 :
  24;

  let actionabilityScore = insight.cta ? 20 : 0;
  let profileScore = 0;
  const preferred = Array.isArray(profile.priorityCategories) ?
  new Set(profile.priorityCategories) :
  new Set();

  const text = `${insight.title || ""} ${insight.summary || ""}`.toLowerCase();
  if (preferred.size > 0) {
    for (const category of preferred) {
      if (text.includes(category.toLowerCase())) {
        profileScore = 15;
        break;
      }
    }
  }

  let urgencyScore = 0;
  if (insight.type === "overspend_prediction") urgencyScore += 12;
  if (insight.type === "recurring_anomaly") urgencyScore += 10;
  if (insight.type === "spending_spike") urgencyScore += 8;


  if (!/\d/.test(insight.summary || "")) {
    actionabilityScore -= 5;
  }

  return priorityScore + actionabilityScore + profileScore + urgencyScore;
}

function tuneInsightRelevance(insights, profile) {
  const ranked = (insights || []).
  map((insight) => ({
    ...insight,
    relevanceScore: relevanceScore(insight, profile)
  })).
  sort((a, b) => b.relevanceScore - a.relevanceScore);


  const filtered = ranked.filter((insight, index) => {
    if (index < 4) return true;
    return insight.relevanceScore >= 52;
  });

  return filtered.slice(0, 7);
}

function pickBestNextAction(insights = []) {
  const top = insights.find((insight) => insight.cta);
  if (!top) return null;

  return {
    id: `best_${top.id}`,
    insightId: top.id,
    priority: top.priority,
    title: top.cta.label,
    benefit: top.summary,
    rationale: top.rationale,
    action: top.cta
  };
}

function buildActionCenter(feed) {
  const tasks = [];

  feed.insights.slice(0, 4).forEach((insight) => {
    tasks.push({
      id: `task_${insight.id}`,
      insightId: insight.id,
      priority: insight.priority,
      title: insight.cta.label,
      benefit: insight.summary,
      metric: insight.rationale,
      action: insight.cta
    });
  });

  tasks.push({
    id: "task_goal_weekly_contribution",
    priority: "info",
    title: "Plan weekly contribution",
    benefit: `Set ${feed.goalSuggestions.weeklyContribution.toFixed(2)} RON/week towards your goal.`,
    metric: `Realistic scenario: ${feed.goalSuggestions.scenarios.realistic.toFixed(2)} RON/month.`,
    action: {
      type: "save_goal",
      label: "Open goals",
      payload: {
        weeklyContribution: feed.goalSuggestions.weeklyContribution
      }
    }
  });

  return tasks;
}

async function generateInsightsForUser(userId) {
  const [entries, user] = await Promise.all([
  loadUserEntries(userId),
  prisma.user.findUnique({
    where: { id: userId },
    select: {
      profileGoal: true,
      profileIncomeRange: true,
      profileCategories: true
    }
  })]
  );

  const profile = {
    goal: user?.profileGoal || null,
    incomeRange: user?.profileIncomeRange || null,
    priorityCategories: parseProfileCategories(user?.profileCategories)
  };

  const expenses = entries.filter((e) => e.isExpense);
  const subscriptions = detectSubscriptions(expenses);
  const spendingSpikes = detectSpendingSpikes(expenses);
  const recurringAnomalies = detectRecurringAnomalies(expenses, subscriptions);
  const overspendPrediction = computeOverspendPrediction(entries, profile);
  const upcomingBills = subscriptions.
  filter((sub) => {
    const due = new Date(sub.nextDueDate);
    const now = new Date();
    const days = Math.round((due - now) / (1000 * 60 * 60 * 24));
    return days >= 0 && days <= 21;
  }).
  map((sub) => ({
    merchant: sub.merchant,
    amount: sub.amount,
    dueDate: sub.nextDueDate,
    daysUntilDue: Math.max(
      0,
      Math.round((new Date(sub.nextDueDate) - new Date()) / (1000 * 60 * 60 * 24))
    )
  })).
  sort((a, b) => a.daysUntilDue - b.daysUntilDue);

  const topCategories = Object.entries(categorySpend(expenses)).
  map(([category, total]) => ({ category, total })).
  sort((a, b) => b.total - a.total).
  slice(0, 3);

  const goalSuggestions = buildGoalSuggestions(profile, overspendPrediction, topCategories);

  const feed = buildInsightsPayload({
    subscriptions,
    spendingSpikes,
    recurringAnomalies,
    overspendPrediction,
    upcomingBills,
    goalSuggestions
  });

  const tunedInsights = tuneInsightRelevance(feed.insights, profile);
  const feedWithTuning = {
    ...feed,
    insights: tunedInsights
  };
  const bestNextAction = pickBestNextAction(tunedInsights);

  return {
    generatedAt: new Date().toISOString(),
    profile,
    ...feedWithTuning,
    actionCenter: buildActionCenter(feedWithTuning),
    bestNextAction
  };
}

module.exports = {
  generateInsightsForUser
};