// Transaction category definitions with keywords, icons, and colors
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
      "abc",
    ],
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
      "trotineta",
    ],
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
      "decathlon",
    ],
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
      "abonament",
    ],
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
      "chiria",
    ],
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
      "google play",
    ],
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
      "regina maria",
    ],
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
      "alpha bank",
    ],
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
      "wage",
    ],
  },
];

const DEFAULT_CATEGORY = {
  key: "other",
  icon: "ellipsis-horizontal",
  color: "#6B7280",
};

/**
 * Categorize a single transaction based on its description fields.
 * Returns { key, icon, color }
 */
export function categorizeTransaction(tx) {
  const description = [
    tx.remittanceInformationUnstructured || "",
    tx.creditorName || "",
    tx.debtorName || "",
  ]
    .join(" ")
    .toLowerCase();

  for (const cat of CATEGORIES) {
    for (const keyword of cat.keywords) {
      if (description.includes(keyword)) {
        return { key: cat.key, icon: cat.icon, color: cat.color };
      }
    }
  }

  return DEFAULT_CATEGORY;
}

/**
 * Group expense transactions by category and sum amounts.
 * Returns array sorted by total descending:
 * [{ key, icon, color, total, count, percentage }]
 */
export function getCategoryBreakdown(transactions) {
  const expenses = transactions.filter(
    (tx) => parseFloat(tx.transactionAmount?.amount || 0) < 0,
  );

  const groups = {};
  let grandTotal = 0;

  for (const tx of expenses) {
    const cat = categorizeTransaction(tx);
    const amount = Math.abs(parseFloat(tx.transactionAmount?.amount || 0));
    grandTotal += amount;

    if (!groups[cat.key]) {
      groups[cat.key] = {
        key: cat.key,
        icon: cat.icon,
        color: cat.color,
        total: 0,
        count: 0,
      };
    }
    groups[cat.key].total += amount;
    groups[cat.key].count += 1;
  }

  return Object.values(groups)
    .map((g) => ({
      ...g,
      total: Math.round(g.total * 100) / 100,
      percentage: grandTotal > 0 ? Math.round((g.total / grandTotal) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total);
}

/**
 * Group transactions by day for bar chart data.
 * Returns array of { date, label, total } sorted chronologically.
 */
export function getDailyExpenses(transactions) {
  const expenses = transactions.filter(
    (tx) => parseFloat(tx.transactionAmount?.amount || 0) < 0,
  );

  const byDay = {};
  for (const tx of expenses) {
    const date = tx.bookingDate || tx.valueDate;
    if (!date) continue;
    const amount = Math.abs(parseFloat(tx.transactionAmount?.amount || 0));
    if (!byDay[date]) byDay[date] = 0;
    byDay[date] += amount;
  }

  return Object.entries(byDay)
    .map(([date, total]) => ({
      date,
      label: new Date(date).getDate().toString(),
      value: Math.round(total * 100) / 100,
    }))
    .sort((a, b) => new Date(a.date) - new Date(b.date));
}

/**
 * Filter transactions by period:
 * 0 = current month, 1 = previous month, 2 = last 90 days
 */
export function filterByPeriod(transactions, periodIndex) {
  const now = new Date();
  let startDate;
  let endDate = now;

  switch (periodIndex) {
    case 0: // Current month (1st of this month → today)
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 1: // Previous month (1st of last month → last day of last month)
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      endDate = new Date(now.getFullYear(), now.getMonth(), 0); // Last day of previous month
      break;
    case 2: // Last 90 days (today - 90 days → today)
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    default:
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  }

  return transactions.filter((tx) => {
    const txDate = new Date(tx.bookingDate || tx.valueDate);
    return txDate >= startDate && txDate <= endDate;
  });
}

/**
 * Known subscription/recurring-payment brand keywords.
 * Transactions matching these are flagged even with a single occurrence.
 */
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
  "proprietar",
];

/**
 * Detect recurring transactions (subscriptions, rent, etc.) from the full
 * transaction history.
 *
 * Algorithm:
 *  1. Group expenses by normalised merchant name.
 *  2. For each group with ≥2 entries compute average inter-payment interval.
 *  3. Classify as weekly (≈7d), bi-weekly (≈14d), or monthly (≈30d).
 *  4. Known-subscription names are included even with a single occurrence.
 *  5. Returns array sorted by estimated monthly cost (desc).
 *
 * @param {Array} transactions – full, unfiltered transaction list
 * @returns {Array<{name, amount, monthlyEstimate, frequency, occurrences,
 *                  lastDate, nextDate, category}>}
 */
export function detectRecurringTransactions(transactions) {
  const expenses = transactions.filter(
    (tx) => parseFloat(tx.transactionAmount?.amount || 0) < 0,
  );

  // ── 1. Group by normalised merchant name ────────────────────
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

    if (txList.length < 2 && !isKnownSub) continue;

    // ── 2. Sort by booking date ──────────────────────────────
    const sorted = [...txList].sort(
      (a, b) =>
        new Date(a.bookingDate || a.valueDate) -
        new Date(b.bookingDate || b.valueDate),
    );

    // ── 3. Amount consistency check (≤20 % variance) ────────
    const amounts = sorted.map((tx) =>
      Math.abs(parseFloat(tx.transactionAmount?.amount || 0)),
    );
    const avgAmount = amounts.reduce((s, a) => s + a, 0) / amounts.length;
    const amountsConsistent = amounts.every(
      (a) => avgAmount === 0 || Math.abs(a - avgAmount) / avgAmount < 0.25,
    );
    if (!amountsConsistent && !isKnownSub) continue;

    // ── 4. Compute average interval & classify frequency ─────
    let frequency = null;
    let monthlyEstimate = avgAmount;

    if (sorted.length >= 2) {
      const intervals = [];
      for (let i = 1; i < sorted.length; i++) {
        const d1 = new Date(
          sorted[i - 1].bookingDate || sorted[i - 1].valueDate,
        );
        const d2 = new Date(sorted[i].bookingDate || sorted[i].valueDate);
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
        // Irregular cadence but still a recognised subscription
        frequency = "monthly";
        monthlyEstimate = avgAmount;
      }
    } else {
      // Single occurrence – only reach here for known subs
      frequency = "monthly";
      monthlyEstimate = avgAmount;
    }

    if (!frequency) continue;

    // ── 5. Estimate next payment date ────────────────────────
    const lastTx = sorted[sorted.length - 1];
    const lastDate = new Date(lastTx.bookingDate || lastTx.valueDate);
    const nextDate = new Date(lastDate);
    if (frequency === "weekly") nextDate.setDate(nextDate.getDate() + 7);
    else if (frequency === "biweekly")
      nextDate.setDate(nextDate.getDate() + 14);
    else nextDate.setMonth(nextDate.getMonth() + 1);

    const cat = categorizeTransaction(lastTx);

    recurring.push({
      name: displayName,
      amount: Math.round(avgAmount * 100) / 100,
      monthlyEstimate: Math.round(monthlyEstimate * 100) / 100,
      frequency,
      occurrences: txList.length,
      lastDate: lastTx.bookingDate || lastTx.valueDate,
      nextDate: nextDate.toISOString().split("T")[0],
      category: cat,
    });
  }

  return recurring.sort((a, b) => b.monthlyEstimate - a.monthlyEstimate);
}

export { CATEGORIES };

