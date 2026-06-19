const CATEGORY_KEYWORDS = {
  food: [
    "mega image", "kaufland", "lidl", "carrefour", "auchan", "profi",
    "penny", "cora", "selgros", "metro", "restaurant", "mcdonald",
    "kfc", "burger", "pizza", "food", "glovo", "tazz", "bolt food",
    "foodpanda", "starbucks", "cafenea", "cafe", "coffee", "patiserie",
    "brutarie", "la doi pasi", "alimentara", "abc"
  ],
  transport: [
    "bolt", "uber", "taxi", "metrorex", "stb", "ratb", "cfr", "petrom",
    "omv", "mol", "rompetrol", "lukoil", "benzina", "motorina",
    "parcare", "parking", "e-charge"
  ],
  shopping: [
    "emag", "altex", "flanco", "dedeman", "ikea", "jysk", "pepco",
    "h&m", "zara", "reserved", "about you", "fashion", "haine",
    "amazon", "aliexpress", "decathlon"
  ],
  utilities: [
    "enel", "electrica", "engie", "eon", "digi", "rcs", "rds",
    "orange", "vodafone", "telekom", "internet", "telefon", "gaz",
    "curent", "apa", "nova", "upc", "factura", "abonament"
  ],
  housing: [
    "chirie", "rent", "administrator", "imobil", "bloc", "intretinere",
    "proprietar", "asociatie"
  ],
  entertainment: [
    "netflix", "spotify", "hbo", "disney", "cinema", "bilet",
    "concert", "steam", "playstation", "xbox", "gaming", "digi online",
    "prime video"
  ],
  health: [
    "farmacie", "farmacia", "catena", "sensiblu", "dona", "dr.",
    "doctor", "clinica", "spital", "medical", "reteta", "medicamente",
    "sanador", "medicover", "regina maria"
  ],
  salary: [
    "salar", "salary", "venit", "bonus", "leafname", "plata", "remuneratie"
  ]
};

function categorize(tx) {
  const name = (tx.creditorName || tx.debtorName || "").toLowerCase();
  const desc = (tx.remittanceInformationUnstructured || "").toLowerCase();
  const text = `${name} ${desc}`;
  const amount = parseFloat(tx.transactionAmount?.amount ?? 0);

  if (amount > 0) {
    if (CATEGORY_KEYWORDS.salary.some((k) => text.includes(k))) return "salary";
    return "income";
  }

  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (cat === "salary") continue;
    if (keywords.some((k) => text.includes(k))) return cat;
  }

  return "other";
}

function buildFinancialSummary(financialData) {
  const { totalBalance = 0, accounts = [], transactions = [] } = financialData;

  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const currentMonthTx = transactions.filter(
    (tx) => new Date(tx.bookingDate) >= currentMonthStart
  );
  const lastMonthTx = transactions.filter((tx) => {
    const d = new Date(tx.bookingDate);
    return d >= lastMonthStart && d < currentMonthStart;
  });

  function summarize(txList) {
    const income = txList
      .filter((tx) => parseFloat(tx.transactionAmount?.amount) > 0)
      .reduce((s, tx) => s + parseFloat(tx.transactionAmount.amount), 0);
    const expenses = txList
      .filter((tx) => parseFloat(tx.transactionAmount?.amount) < 0)
      .reduce(
        (s, tx) => s + Math.abs(parseFloat(tx.transactionAmount.amount)),
        0
      );

    const byCategory = {};
    txList
      .filter((tx) => parseFloat(tx.transactionAmount?.amount) < 0)
      .forEach((tx) => {
        const cat = categorize(tx);
        if (!byCategory[cat]) byCategory[cat] = 0;
        byCategory[cat] += Math.abs(parseFloat(tx.transactionAmount.amount));
      });

    return {
      income: income.toFixed(2),
      expenses: expenses.toFixed(2),
      byCategory
    };
  }

  const current = summarize(currentMonthTx);
  const last = summarize(lastMonthTx);

  const recentTx = [...transactions]
    .sort((a, b) => new Date(b.bookingDate) - new Date(a.bookingDate))
    .slice(0, 15)
    .map((tx) => {
      const amount = parseFloat(tx.transactionAmount?.amount);
      const counterpart = amount < 0 ? tx.creditorName : tx.debtorName;
      return `  - ${tx.bookingDate} | ${amount > 0 ? "+" : ""}${amount.toFixed(2)} RON | ${counterpart || "N/A"} | ${tx.remittanceInformationUnstructured || ""}`;
    })
    .join("\n");

  return {
    totalBalance,
    accounts,
    current,
    last,
    recentTx,
    totalTransactions: transactions.length
  };
}

module.exports = {
  buildFinancialSummary
};
