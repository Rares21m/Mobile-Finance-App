
const CATEGORIES = [
{
  key: "food",
  icon: "restaurant",
  color: "#F59E0B",
  keywords: [
  "mega image",
  "kaufland",
  "lidl",
  "carrefour",
  "auchan",
  "profi",
  "penny",
  "cora",
  "selgros",
  "metro",
  "restaurant",
  "mcdonalds",
  "mcdonald",
  "kfc",
  "burger",
  "pizza",
  "food",
  "glovo",
  "tazz",
  "bolt food",
  "foodpanda",
  "starbucks",
  "cafenea",
  "cafe",
  "coffee",
  "patiserie",
  "brutarie",
  "la doi pasi",
  "alimentara",
  "abc"]

},
{
  key: "transport",
  icon: "car",
  color: "#3B82F6",
  keywords: [
  "bolt",
  "uber",
  "taxi",
  "metrorex",
  "stb",
  "ratb",
  "cfr",
  "petrom",
  "omv",
  "mol",
  "rompetrol",
  "lukoil",
  "benzina",
  "motorina",
  "parcare",
  "parking",
  "e-charge",
  "trotineta"]

},
{
  key: "shopping",
  icon: "bag-handle",
  color: "#8B5CF6",
  keywords: [
  "emag",
  "altex",
  "flanco",
  "dedeman",
  "ikea",
  "jysk",
  "pepco",
  "h&m",
  "zara",
  "reserved",
  "about you",
  "fashion",
  "haine",
  "amazon",
  "aliexpress",
  "decathlon"]

},
{
  key: "utilities",
  icon: "flash",
  color: "#06B6D4",
  keywords: [
  "enel",
  "electrica",
  "engie",
  "eon",
  "digi",
  "rcs",
  "rds",
  "orange",
  "vodafone",
  "telekom",
  "internet",
  "telefon",
  "gaz",
  "curent",
  "apa",
  "nova",
  "upc",
  "factura",
  "abonament"]

},
{
  key: "housing",
  icon: "home",
  color: "#F97316",
  keywords: [
  "chirie",
  "rent",
  "administrator",
  "imobil",
  "bloc",
  "intretinere",
  "proprietar",
  "apartament",
  "casa",
  "locuinta",
  "chiria"]

},
{
  key: "entertainment",
  icon: "game-controller",
  color: "#EC4899",
  keywords: [
  "netflix",
  "spotify",
  "hbo",
  "disney",
  "youtube",
  "gaming",
  "steam",
  "playstation",
  "cinema",
  "cinematograf",
  "teatru",
  "concert",
  "bilet",
  "event",
  "apple music",
  "google play"]

},
{
  key: "health",
  icon: "medkit",
  color: "#EF4444",
  keywords: [
  "farmacia",
  "catena",
  "sensiblu",
  "dona",
  "helpnet",
  "dr max",
  "medic",
  "clinica",
  "spital",
  "hospital",
  "sanatate",
  "doctor",
  "stomatolog",
  "dentist",
  "farmacie",
  "medicover",
  "regina maria"]

},
{
  key: "transfer",
  icon: "swap-horizontal",
  color: "#6366F1",
  keywords: [
  "transfer",
  "revolut",
  "paypal",
  "wise",
  "ing",
  "brd",
  "bcr",
  "raiffeisen",
  "unicredit",
  "cec",
  "alpha bank"]

},
{
  key: "salary",
  icon: "wallet",
  color: "#22C55E",
  keywords: [
  "salariu",
  "salary",
  "venit",
  "income",
  "bonus",
  "prima",
  "plata",
  "wage"]

}];


const DEFAULT_CATEGORY = {
  key: "other",
  icon: "ellipsis-horizontal",
  color: "#6B7280"
};

function parseTransactionDate(dateValue) {
  if (!dateValue) return null;

  if (typeof dateValue === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
    const [y, m, d] = dateValue.split("-").map(Number);

    return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  }

  const parsed = new Date(dateValue);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getTxDate(tx) {
  return parseTransactionDate(tx.bookingDate || tx.valueDate);
}







export function categorizeTransaction(tx) {

  if (tx.category) {
    const explicit = CATEGORIES.find((c) => c.key === tx.category);
    if (explicit)
    return { key: explicit.key, icon: explicit.icon, color: explicit.color };
  }

  const description = [
  tx.remittanceInformationUnstructured || "",
  tx.creditorName || "",
  tx.debtorName || ""].

  join(" ").
  toLowerCase();

  for (const cat of CATEGORIES) {
    for (const keyword of cat.keywords) {
      if (description.includes(keyword)) {
        return { key: cat.key, icon: cat.icon, color: cat.color };
      }
    }
  }

  return DEFAULT_CATEGORY;
}






export function getCategoryBreakdown(transactions) {
  const expenses = transactions.filter((tx) => {
    const amt = parseFloat(tx.transactionAmount?.amount || tx.amount || 0);
    return amt < 0;
  });

  const groups = {};
  let grandTotal = 0;

  for (const tx of expenses) {
    const cat = categorizeTransaction(tx);
    const amount = Math.abs(parseFloat(tx.transactionAmount?.amount || tx.amount || 0));
    grandTotal += amount;

    if (!groups[cat.key]) {
      groups[cat.key] = {
        key: cat.key,
        icon: cat.icon,
        color: cat.color,
        total: 0,
        count: 0
      };
    }
    groups[cat.key].total += amount;
    groups[cat.key].count += 1;
  }

  return Object.values(groups).
  map((g) => ({
    ...g,
    total: Math.round(g.total * 100) / 100,
    percentage: grandTotal > 0 ? Math.round(g.total / grandTotal * 100) : 0
  })).
  sort((a, b) => b.total - a.total);
}





export function getDailyExpenses(transactions) {
  const expenses = transactions.filter((tx) => {
    const amt = parseFloat(tx.transactionAmount?.amount || tx.amount || 0);
    return amt < 0;
  });

  const byDay = {};
  for (const tx of expenses) {
    const date = tx.bookingDate || tx.valueDate;
    if (!date) continue;
    const amount = Math.abs(parseFloat(tx.transactionAmount?.amount || tx.amount || 0));
    if (!byDay[date]) byDay[date] = 0;
    byDay[date] += amount;
  }

  return Object.entries(byDay).
  map(([date, total]) => ({
    date,
    label: (parseTransactionDate(date) || new Date(date)).getDate().toString(),
    value: Math.round(total * 100) / 100
  })).
  sort((a, b) => parseTransactionDate(a.date) - parseTransactionDate(b.date));
}





export function filterByPeriod(transactions, periodIndex) {
  const now = new Date();
  let startDate;
  let endDate = now;

  switch (periodIndex) {
    case 0:
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      break;
    case 1:
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      break;
    case 2:
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      break;
    default:
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  }

  return transactions.filter((tx) => {
    const txDate = getTxDate(tx);
    if (!txDate) return false;
    return txDate >= startDate && txDate <= endDate;
  });
}





const SUBSCRIPTION_KEYWORDS = [
"netflix",
"spotify",
"hbo",
"disney",
"apple",
"google play",
"youtube",
"deezer",
"amazon prime",
"tidal",
"microsoft",
"adobe",
"dropbox",
"icloud",
"antivirus",
"nordvpn",
"vpn",
"abonament",
"subscription",
"chirie",
"rent",
"chiria",
"intretinere",
"administrator",
"administrator",
"proprietar"];






const NON_RECURRING_KEYWORDS = [
"mcdonald",
"kfc",
"profi",
"carrefour",
"mega image",
"kaufland",
"lidl",
"auchan",
"penny",
"bolt food",
"glovo",
"tazz",
"uber eats",
"h&m",
"zara",
"c&a",

"omv",
"petrom",
"mol",
"rompetrol",
"lukoil",
"benzina",
"motorina",

"bolt",
"uber",
"taxi"];

















export function detectRecurringTransactions(transactions) {
  const expenses = transactions.filter((tx) => {
    const amt = parseFloat(tx.transactionAmount?.amount || tx.amount || 0);
    return amt < 0;
  });


  const groups = {};
  for (const tx of expenses) {
    const raw =
    tx.creditorName || tx.remittanceInformationUnstructured || "unknown";
    const key = raw.toLowerCase().trim().replace(/\s+/g, " ");
    if (!groups[key]) groups[key] = { displayName: raw, txList: [] };
    groups[key].txList.push(tx);
  }

  const recurring = [];

  for (const [key, { displayName, txList }] of Object.entries(groups)) {
    const isKnownSub = SUBSCRIPTION_KEYWORDS.some((kw) => key.includes(kw));
    const isBlacklisted = NON_RECURRING_KEYWORDS.some((kw) => key.includes(kw));

    if (isBlacklisted) continue;
    if (txList.length < 2 && !isKnownSub) continue;


    const sorted = [...txList].sort(
      (a, b) => getTxDate(a) - getTxDate(b)
    );


    const amounts = sorted.map((tx) =>
    Math.abs(parseFloat(tx.transactionAmount?.amount || tx.amount || 0))
    );
    const avgAmount = amounts.reduce((s, a) => s + a, 0) / amounts.length;
    const amountsConsistent = amounts.every(
      (a) => avgAmount === 0 || Math.abs(a - avgAmount) / avgAmount < 0.25
    );
    if (!amountsConsistent && !isKnownSub) continue;


    let frequency = null;
    let monthlyEstimate = avgAmount;

    if (sorted.length >= 2) {
      const intervals = [];
      for (let i = 1; i < sorted.length; i++) {
        const d1 = getTxDate(sorted[i - 1]);
        const d2 = getTxDate(sorted[i]);
        if (!d1 || !d2) continue;
        intervals.push((d2 - d1) / (1000 * 60 * 60 * 24));
      }
      const avgInterval =
      intervals.reduce((s, v) => s + v, 0) / intervals.length;

      if (avgInterval >= 5 && avgInterval <= 10) {
        frequency = "weekly";
        monthlyEstimate = avgAmount * 4.33;
      } else if (avgInterval >= 11 && avgInterval <= 18) {
        frequency = "biweekly";
        monthlyEstimate = avgAmount * 2;
      } else if (avgInterval >= 25 && avgInterval <= 40) {
        frequency = "monthly";
        monthlyEstimate = avgAmount;
      } else if (isKnownSub) {

        frequency = "monthly";
        monthlyEstimate = avgAmount;
      }
    } else {

      frequency = "monthly";
      monthlyEstimate = avgAmount;
    }

    if (!frequency) continue;


    const lastTx = sorted[sorted.length - 1];
    const lastDate = getTxDate(lastTx);
    if (!lastDate) continue;
    const nextDate = new Date(lastDate);
    if (frequency === "weekly") nextDate.setDate(nextDate.getDate() + 7);else
    if (frequency === "biweekly")
    nextDate.setDate(nextDate.getDate() + 14);else
    nextDate.setMonth(nextDate.getMonth() + 1);

    const cat = categorizeTransaction(lastTx);

    recurring.push({
      name: displayName,
      amount: Math.round(avgAmount * 100) / 100,
      monthlyEstimate: Math.round(monthlyEstimate * 100) / 100,
      frequency,
      occurrences: txList.length,
      lastDate: lastTx.bookingDate || lastTx.valueDate,
      nextDate: nextDate.toISOString().split("T")[0],
      category: cat
    });
  }

  return recurring.sort((a, b) => b.monthlyEstimate - a.monthlyEstimate);
}








export function getMonthlyComparison(transactions) {
  const now = new Date();
  const currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  const currentTx = transactions.filter((tx) => {
    const d = getTxDate(tx);
    if (!d) return false;
    return d >= currentStart && d <= now;
  });
  const prevTx = transactions.filter((tx) => {
    const d = getTxDate(tx);
    if (!d) return false;
    return d >= prevStart && d <= prevEnd;
  });

  const sumByCategory = (txList) => {
    const map = {};
    for (const tx of txList) {
      const amt = parseFloat(tx.transactionAmount?.amount || tx.amount || 0);
      if (amt >= 0) continue;
      const cat = categorizeTransaction(tx);
      if (!map[cat.key])
      map[cat.key] = {
        key: cat.key,
        icon: cat.icon,
        color: cat.color,
        total: 0
      };
      map[cat.key].total += Math.abs(amt);
    }
    return map;
  };

  const curr = sumByCategory(currentTx);
  const prev = sumByCategory(prevTx);

  const allKeys = new Set([...Object.keys(curr), ...Object.keys(prev)]);
  const result = [];

  for (const key of allKeys) {
    const currentTotal = Math.round((curr[key]?.total || 0) * 100) / 100;
    const previousTotal = Math.round((prev[key]?.total || 0) * 100) / 100;
    const meta = curr[key] || prev[key];
    const diff = currentTotal - previousTotal;
    const diffPct =
    previousTotal > 0 ? Math.round(diff / previousTotal * 100) : null;

    result.push({
      key,
      icon: meta.icon,
      color: meta.color,
      current: currentTotal,
      previous: previousTotal,
      diff: Math.round(diff * 100) / 100,
      diffPct
    });
  }

  return result.sort((a, b) => b.current - a.current);
}















export function getCashFlowForecast(transactions, currentBalance = 0) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const totalDays = monthEnd.getDate();
  const daysElapsed = now.getDate();
  const daysLeft = Math.max(1, totalDays - daysElapsed);
  const robustForecast = buildRobustMonthlyForecast(transactions, now);

  const currentMonthTx = transactions.filter((tx) => {
    const d = getTxDate(tx);
    if (!d) return false;
    return d >= monthStart && d <= now && !isForecastTransfer(tx);
  });

  let incomeToDate = 0;
  let expensesToDate = 0;
  for (const tx of currentMonthTx) {
    const amt = parseFloat(tx.transactionAmount?.amount || tx.amount || 0);
    if (amt > 0) incomeToDate += amt;else
    expensesToDate += Math.abs(amt);
  }
  incomeToDate = Math.round(incomeToDate * 100) / 100;
  expensesToDate = Math.round(expensesToDate * 100) / 100;

  const extrapolatedIncome = roundMoney(
    Math.max(0, robustForecast.projectedIncome - incomeToDate)
  );
  const extrapolatedExpenses = roundMoney(
    Math.max(0, robustForecast.projectedExpenses - expensesToDate)
  );


  const recurring = detectRecurringTransactions(transactions);
  const recurringItems = recurring.filter((r) => {
    const next = new Date(r.nextDate);
    return (
      next > now &&
      next.getMonth() === now.getMonth() &&
      next.getFullYear() === now.getFullYear());

  });
  const remainingRecurring =
  Math.round(recurringItems.reduce((s, r) => s + r.amount, 0) * 100) / 100;

  const projectedNet = roundMoney(extrapolatedIncome - extrapolatedExpenses);

  const savingsRateToDate =
  incomeToDate > 0 ?
  Math.round((incomeToDate - expensesToDate) / incomeToDate * 100) :
  0;

  const dailyPoints = [];
  let runningNet = 0;
  const dailyNet = projectedNet / daysLeft;


  dailyPoints.push({
    value: Math.round(runningNet * 100) / 100,
    label: now.getDate().toString()
  });


  for (let i = 1; i <= daysLeft; i++) {
    const dayDate = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + i
    );


    runningNet += dailyNet;

    dailyPoints.push({
      value: Math.round(runningNet * 100) / 100,
      label: dayDate.getDate().toString()
    });
  }

  return {
    projectedNet,
    incomeToDate,
    expensesToDate,
    extrapolatedIncome,
    extrapolatedExpenses,
    remainingRecurring,
    recurringItems,
    dailyPoints,
    daysLeft,
    daysElapsed,
    totalDays,
    savingsRateToDate,
    currentBalance
  };
}

















function roundMoney(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function median(values) {
  const sorted = values.
  filter((v) => Number.isFinite(v)).
  sort((a, b) => a - b);
  if (sorted.length === 0) return 0;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ?
  (sorted[mid - 1] + sorted[mid]) / 2 :
  sorted[mid];
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function monthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthRange(now, monthsBack) {
  const months = [];
  for (let i = monthsBack; i >= 1; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(monthKey(date));
  }
  return months;
}

function isForecastTransfer(tx) {
  if (tx.isDuplicate) return true;
  if (tx.sourceLabel === "demo-transfer") return true;
  if (tx.category === "transfer" || tx.inferredCategory === "transfer") {
    return true;
  }
  return categorizeTransaction(tx).key === "transfer";
}

function clampOutliers(values) {
  const clean = values.filter((v) => Number.isFinite(v) && v >= 0);
  if (clean.length < 3) return clean;
  const base = median(clean);
  if (base <= 0) return clean;
  return clean.map((value) => clamp(value, base * 0.35, base * 1.85));
}

function limitedTrend(values) {
  if (values.length < 3) return 0;
  const previous = median(values.slice(0, -1));
  const latest = values[values.length - 1];
  if (previous <= 0) return 0;
  return clamp((latest - previous) / previous, -0.12, 0.12);
}

function buildRobustMonthlyForecast(transactions, now = new Date()) {
  const months = monthRange(now, 6);
  const monthly = months.map((key) => ({
    key,
    income: 0,
    expenses: 0
  }));
  const byKey = Object.fromEntries(monthly.map((item) => [item.key, item]));

  for (const tx of transactions) {
    const txDate = getTxDate(tx);
    if (!txDate || txDate > now || isForecastTransfer(tx)) continue;

    const key = monthKey(txDate);
    if (!byKey[key]) continue;

    const amount = parseFloat(tx.transactionAmount?.amount || tx.amount || 0);
    if (!Number.isFinite(amount) || amount === 0) continue;

    if (amount > 0) {
      byKey[key].income += amount;
    } else {
      byKey[key].expenses += Math.abs(amount);
    }
  }

  const incomes = monthly.map((item) => item.income);
  const expenses = monthly.map((item) => item.expenses);
  const incomeBase = median(clampOutliers(incomes));
  const expenseBase = median(clampOutliers(expenses));
  const incomeTrend = limitedTrend(incomes);
  const expenseTrend = limitedTrend(expenses);

  const recurringExpenses = detectRecurringTransactions(transactions).
  filter((item) => item.amount > 0 && item.category?.key !== "salary").
  reduce((sum, item) => sum + item.monthlyEstimate, 0);

  const projectedIncome = Math.max(
    0,
    incomeBase * (1 + incomeTrend)
  );
  const projectedExpenses = Math.max(
    0,
    Math.max(expenseBase * (1 + expenseTrend), recurringExpenses)
  );

  const confidence = monthly.filter(
    (item) => item.income > 0 || item.expenses > 0
  ).length;

  return {
    monthly,
    projectedIncome: roundMoney(projectedIncome),
    projectedExpenses: roundMoney(projectedExpenses),
    projectedNet: roundMoney(projectedIncome - projectedExpenses),
    dailyNet: roundMoney((projectedIncome - projectedExpenses) / 30),
    confidence: confidence >= 5 ? "high" : confidence >= 3 ? "medium" : "low",
    method: "median_clamped_trend",
    explanation:
    "Estimare bazata pe mediana ultimelor luni, cu outlieri limitati si ajustare pentru tranzactii recurente."
  };
}

function getCurrentMonthTotals(transactions, now = new Date()) {
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  let incomeToDate = 0;
  let expensesToDate = 0;

  for (const tx of transactions) {
    const txDate = getTxDate(tx);
    if (!txDate || txDate < monthStart || txDate > now || isForecastTransfer(tx)) {
      continue;
    }

    const amount = parseFloat(tx.transactionAmount?.amount || tx.amount || 0);
    if (!Number.isFinite(amount) || amount === 0) continue;

    if (amount > 0) {
      incomeToDate += amount;
    } else {
      expensesToDate += Math.abs(amount);
    }
  }

  return {
    incomeToDate: roundMoney(incomeToDate),
    expensesToDate: roundMoney(expensesToDate)
  };
}

export function getAdvancedRegressionForecast(transactions, currentBalance = 0) {
  const now = new Date();
  const dayMs = 24 * 60 * 60 * 1000;
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const projectDays = Math.max(1, monthEnd.getDate() - now.getDate());
  const robustForecast = buildRobustMonthlyForecast(transactions, now);
  const { incomeToDate, expensesToDate } = getCurrentMonthTotals(
    transactions,
    now
  );
  const remainingIncome = Math.max(
    0,
    robustForecast.projectedIncome - incomeToDate
  );
  const remainingExpenses = Math.max(
    0,
    robustForecast.projectedExpenses - expensesToDate
  );
  const remainingNet = roundMoney(remainingIncome - remainingExpenses);


  const dailyPoints = [];
  let projectedRemainingNet = 0;
  const dailyNet = roundMoney(remainingNet / projectDays);


  dailyPoints.push({
    value: 0,
    label: now.getDate().toString()
  });

  for (let i = 1; i <= projectDays; i++) {
    const projDate = new Date(now.getTime() + i * dayMs);



    projectedRemainingNet += dailyNet;


    const showLabel = i % 5 === 0 || i === projectDays;
    dailyPoints.push({
      value: Math.round(projectedRemainingNet),
      label: showLabel ? projDate.getDate().toString() : ""
    });
  }


  const endBalance = roundMoney(currentBalance + remainingNet);
  const netChange = endBalance - currentBalance;
  const lowestPoint = Math.min(...dailyPoints.map((p) => p.value));
  const volatility = robustForecast.confidence === "low" ? "high" : "stable";

  let insightKey = "stable";
  if (netChange < -Math.abs(currentBalance) * 0.15) insightKey = "warning";else
  if (netChange > Math.abs(currentBalance) * 0.05) insightKey = "positive";

  return {
    dailyPoints,
    slope: dailyNet,
    intercept: currentBalance,
    projectedEndBalance: endBalance,
    netChange,
    volatility,
    insightKey,
    lowestPoint,
    projectedIncome: robustForecast.projectedIncome,
    projectedExpenses: robustForecast.projectedExpenses,
    projectedNet: robustForecast.projectedNet,
    remainingIncome: roundMoney(remainingIncome),
    remainingExpenses: roundMoney(remainingExpenses),
    remainingNetThisMonth: remainingNet,
    incomeToDate,
    expensesToDate,
    daysLeft: projectDays,
    confidence: robustForecast.confidence,
    method: robustForecast.method,
    explanation: robustForecast.explanation
  };
}






export function getMonthlyIncomeTrend(transactions, months = 6) {
  const now = new Date();
  const result = [];

  for (let i = months - 1; i >= 0; i--) {
    const baseMonth = now.getMonth() - i;
    const start = new Date(now.getFullYear(), baseMonth, 1);
    const end = new Date(now.getFullYear(), baseMonth + 1, 0);

    let income = 0;
    let expenses = 0;
    for (const tx of transactions) {
      const d = getTxDate(tx);
      if (!d) continue;
      if (d < start || d > end) continue;
      const amt = parseFloat(tx.transactionAmount?.amount || tx.amount || 0);
      if (amt > 0) income += amt;else
      expenses += Math.abs(amt);
    }

    const label = start.toLocaleDateString("default", { month: "short" });
    result.push({
      label,
      income: Math.round(income * 100) / 100,
      expenses: Math.round(expenses * 100) / 100
    });
  }

  return result;
}

export function getTransactionSourceLabel(tx) {
  if (tx?.sourceLabel) return tx.sourceLabel;
  if (tx?.isManual || String(tx?.transactionId || "").startsWith("manual_")) {
    return "manual";
  }
  if (String(tx?.transactionId || "").startsWith("mock_")) return "cached";
  return "synced";
}

export function getSourceBreakdown(transactions) {
  const base = {
    manual: { label: "manual", count: 0, amount: 0 },
    synced: { label: "synced", count: 0, amount: 0 },
    inferred: { label: "inferred", count: 0, amount: 0 },
    cached: { label: "cached", count: 0, amount: 0 }
  };

  for (const tx of transactions) {
    const key = getTransactionSourceLabel(tx);
    if (!base[key]) {
      base[key] = { label: key, count: 0, amount: 0 };
    }

    const amount = Math.abs(parseFloat(tx?.transactionAmount?.amount || tx?.amount || 0));
    base[key].count += 1;
    base[key].amount += amount;
  }

  return Object.values(base).
  filter((row) => row.count > 0).
  map((row) => ({
    ...row,
    amount: Math.round(row.amount * 100) / 100
  })).
  sort((a, b) => b.amount - a.amount);
}

export function explainTotals(transactions) {
  let income = 0;
  let expenses = 0;

  for (const tx of transactions) {
    const amount = parseFloat(tx?.transactionAmount?.amount || tx?.amount || 0);
    if (amount > 0) income += amount;else
    expenses += Math.abs(amount);
  }

  income = Math.round(income * 100) / 100;
  expenses = Math.round(expenses * 100) / 100;

  return {
    income,
    expenses,
    net: Math.round((income - expenses) * 100) / 100,
    transactionCount: transactions.length,
    sourceBreakdown: getSourceBreakdown(transactions)
  };
}










export function getFinancialHealthScore(
transactions,
limits = {},
currentMonthSpending = {},
goals = [])
{

  const cashFlow = getCashFlowForecast(transactions);
  const savingsRatePct = cashFlow.savingsRateToDate;
  let savingsRate = 0;
  if (savingsRatePct >= 25) savingsRate = 35;else
  if (savingsRatePct >= 20) savingsRate = 30;else
  if (savingsRatePct >= 15) savingsRate = 25;else
  if (savingsRatePct >= 10) savingsRate = 18;else
  if (savingsRatePct >= 5) savingsRate = 10;else
  if (savingsRatePct > 0) savingsRate = 5;


  const budgetedKeys = Object.keys(limits).filter((k) => limits[k] > 0);
  let budgetAdherence = 0;
  if (budgetedKeys.length > 0) {
    const onTrack = budgetedKeys.filter(
      (k) => (currentMonthSpending[k] || 0) <= limits[k]
    ).length;
    budgetAdherence = Math.round(onTrack / budgetedKeys.length * 25);
  } else {
    budgetAdherence = 12;
  }


  const breakdown = getCategoryBreakdown(
    filterByPeriod(transactions, 0)
  );
  let spendingDiversity = 15;
  if (breakdown.length > 0) {
    const total = breakdown.reduce((s, c) => s + c.total, 0);
    if (total > 0) {
      const hhi = breakdown.reduce((s, c) => s + (c.total / total) ** 2, 0);

      if (hhi > 0.5) spendingDiversity = 3;else
      if (hhi > 0.35) spendingDiversity = 7;else
      if (hhi > 0.25) spendingDiversity = 10;else
      spendingDiversity = 15;
    }
  }


  const trend = getMonthlyIncomeTrend(transactions, 4);
  let monthlyTrend = 12;
  if (trend.length >= 2) {
    const currentExpenses = trend[trend.length - 1]?.expenses || 0;
    const avgPrev =
    trend.slice(0, -1).reduce((s, m) => s + m.expenses, 0) / (
    trend.length - 1);
    if (avgPrev > 0) {
      const change = (currentExpenses - avgPrev) / avgPrev * 100;
      if (change <= -15) monthlyTrend = 25;else
      if (change <= -5) monthlyTrend = 20;else
      if (change <= 5) monthlyTrend = 15;else
      if (change <= 15) monthlyTrend = 8;else
      monthlyTrend = 3;
    }
  }

  const score = Math.min(
    100,
    Math.max(0, savingsRate + budgetAdherence + spendingDiversity + monthlyTrend)
  );

  let grade = "A";
  if (score >= 80) grade = "A";else
  if (score >= 65) grade = "B";else
  if (score >= 50) grade = "C";else
  if (score >= 35) grade = "D";else
  grade = "F";

  return {
    score,
    grade,
    components: {
      savingsRate: { points: savingsRate, max: 35, pct: savingsRatePct },
      budgetAdherence: {
        points: budgetAdherence,
        max: 25,
        onTrack: budgetedKeys.filter(
          (k) => (currentMonthSpending[k] || 0) <= limits[k]
        ).length,
        total: budgetedKeys.length
      },
      spendingDiversity: { points: spendingDiversity, max: 15 },
      monthlyTrend: { points: monthlyTrend, max: 25 }
    }
  };
}









export function detectAnomalies(
transactions,
limits = {},
currentMonthSpending = {})
{
  const anomalies = [];


  const comparison = getMonthlyComparison(transactions);
  for (const cat of comparison) {
    if (cat.diffPct !== null && cat.diffPct > 50 && cat.current > 50) {
      anomalies.push({
        type: "spike",
        severity: cat.diffPct > 100 ? "high" : "medium",
        message: `${cat.key}: +${cat.diffPct}%`,
        messageKey: "analytics.anomaly.spike",
        messageParams: { category: cat.key, pct: cat.diffPct },
        icon: "trending-up",
        color: "#F43F5E",
        categoryKey: cat.key
      });
    }
  }


  const budgetedKeys = Object.keys(limits).filter((k) => limits[k] > 0);
  for (const key of budgetedKeys) {
    const spent = currentMonthSpending[key] || 0;
    const limit = limits[key];
    if (spent > limit) {
      const overPct = Math.round((spent - limit) / limit * 100);
      anomalies.push({
        type: "budget_burst",
        severity: overPct > 30 ? "high" : "medium",
        message: `${key}: +${overPct}% over budget`,
        messageKey: "analytics.anomaly.budgetBurst",
        messageParams: { category: key, pct: overPct },
        icon: "alert-circle",
        color: "#F59E0B",
        categoryKey: key
      });
    }
  }


  const cashFlow = getCashFlowForecast(transactions);
  if (cashFlow.savingsRateToDate >= 20) {
    anomalies.push({
      type: "good_news",
      severity: "positive",
      message: `Savings rate: ${cashFlow.savingsRateToDate}%`,
      messageKey: "analytics.anomaly.goodSavings",
      messageParams: { pct: cashFlow.savingsRateToDate },
      icon: "trophy",
      color: "#10B981"
    });
  }


  const currentMonth = filterByPeriod(transactions, 0);
  const lastMonth = filterByPeriod(transactions, 1);
  const currentExp = currentMonth.
  filter((tx) => parseFloat(tx.transactionAmount?.amount || tx.amount || 0) < 0).
  reduce(
    (s, tx) => s + Math.abs(parseFloat(tx.transactionAmount?.amount || tx.amount || 0)),
    0
  );
  const lastExp = lastMonth.
  filter((tx) => parseFloat(tx.transactionAmount?.amount || tx.amount || 0) < 0).
  reduce(
    (s, tx) => s + Math.abs(parseFloat(tx.transactionAmount?.amount || tx.amount || 0)),
    0
  );
  if (lastExp > 0 && currentExp < lastExp * 0.85) {
    const savedPct = Math.round((lastExp - currentExp) / lastExp * 100);
    anomalies.push({
      type: "good_news",
      severity: "positive",
      message: `Spending down ${savedPct}%`,
      messageKey: "analytics.anomaly.spendingDown",
      messageParams: { pct: savedPct },
      icon: "arrow-down-circle",
      color: "#22C55E"
    });
  }


  const severityOrder = { high: 0, medium: 1, positive: 2 };
  return anomalies.sort(
    (a, b) => (severityOrder[a.severity] ?? 1) - (severityOrder[b.severity] ?? 1)
  );
}









export function calculateSafeToSpend(
transactions,
recurringTransactions,
savingsGoalAmount = 0)
{
  const now = new Date();
  const daysInMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0
  ).getDate();
  const daysLeft = Math.max(1, daysInMonth - now.getDate());

  const currentMonthTx = filterByPeriod(transactions, 0);
  const totals = explainTotals(currentMonthTx);



  const remainingBills = (recurringTransactions || []).
  filter((r) => {
    if (!r.nextExpectedDate) return false;
    const nextDate = new Date(r.nextExpectedDate);
    return (
      nextDate.getMonth() === now.getMonth() &&
      nextDate.getFullYear() === now.getFullYear() &&
      nextDate > now);

  }).
  reduce((sum, r) => sum + r.monthlyEstimate, 0);


  let projectedIncome = totals.income;
  if (projectedIncome === 0) {
    const lastMonthTx = filterByPeriod(transactions, 1);
    projectedIncome = explainTotals(lastMonthTx).income;
  }


  const safeToSpend = Math.max(
    0,
    projectedIncome - savingsGoalAmount - remainingBills - totals.expenses
  );
  const dailyLimit = safeToSpend / daysLeft;

  return {
    safeToSpend: Math.round(safeToSpend * 100) / 100,
    dailyLimit: Math.round(dailyLimit * 100) / 100,
    daysLeft,
    remainingBills: Math.round(remainingBills * 100) / 100,
    incomeSoFar: totals.income,
    expensesSoFar: totals.expenses,
    isProjectedIncome: totals.income === 0 && projectedIncome > 0
  };
}

export { CATEGORIES };
