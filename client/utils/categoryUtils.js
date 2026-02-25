// Transaction category definitions with keywords, icons, and colors
const CATEGORIES = [
    {
        key: "food",
        icon: "restaurant",
        color: "#F59E0B",
        keywords: [
            "mega image", "kaufland", "lidl", "carrefour", "auchan", "profi",
            "penny", "cora", "selgros", "metro", "restaurant", "mcdonalds",
            "mcdonald", "kfc", "burger", "pizza", "food", "glovo", "tazz",
            "bolt food", "foodpanda", "starbucks", "cafenea", "cafe", "coffee",
            "patiserie", "brutarie", "la doi pasi", "alimentara", "abc",
        ],
    },
    {
        key: "transport",
        icon: "car",
        color: "#3B82F6",
        keywords: [
            "bolt", "uber", "taxi", "metrorex", "stb", "ratb", "cfr",
            "petrom", "omv", "mol", "rompetrol", "lukoil", "benzina",
            "motorina", "parcare", "parking", "e-charge", "trotineta",
        ],
    },
    {
        key: "shopping",
        icon: "bag-handle",
        color: "#8B5CF6",
        keywords: [
            "emag", "altex", "flanco", "dedeman", "ikea", "jysk", "pepco",
            "h&m", "zara", "reserved", "about you", "fashion", "haine",
            "amazon", "aliexpress", "decathlon",
        ],
    },
    {
        key: "utilities",
        icon: "flash",
        color: "#06B6D4",
        keywords: [
            "enel", "electrica", "engie", "eon", "digi", "rcs", "rds",
            "orange", "vodafone", "telekom", "internet", "telefon", "gaz",
            "curent", "apa", "nova", "upc", "factura", "abonament",
        ],
    },
    {
        key: "housing",
        icon: "home",
        color: "#F97316",
        keywords: [
            "chirie", "rent", "administrator", "imobil", "bloc", "intretinere",
            "proprietar", "apartament", "casa", "locuinta", "chiria",
        ],
    },
    {
        key: "entertainment",
        icon: "game-controller",
        color: "#EC4899",
        keywords: [
            "netflix", "spotify", "hbo", "disney", "youtube", "gaming",
            "steam", "playstation", "cinema", "cinematograf", "teatru",
            "concert", "bilet", "event", "apple music", "google play",
        ],
    },
    {
        key: "health",
        icon: "medkit",
        color: "#EF4444",
        keywords: [
            "farmacia", "catena", "sensiblu", "dona", "helpnet", "dr max",
            "medic", "clinica", "spital", "hospital", "sanatate", "doctor",
            "stomatolog", "dentist", "farmacie", "medicover", "regina maria",
        ],
    },
    {
        key: "transfer",
        icon: "swap-horizontal",
        color: "#6366F1",
        keywords: [
            "transfer", "revolut", "paypal", "wise", "ing", "brd", "bcr",
            "raiffeisen", "unicredit", "cec", "alpha bank",
        ],
    },
    {
        key: "salary",
        icon: "wallet",
        color: "#22C55E",
        keywords: [
            "salariu", "salary", "venit", "income", "bonus", "prima",
            "plata", "wage",
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
        (tx) => parseFloat(tx.transactionAmount?.amount || 0) < 0
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
            percentage:
                grandTotal > 0 ? Math.round((g.total / grandTotal) * 100) : 0,
        }))
        .sort((a, b) => b.total - a.total);
}

/**
 * Group transactions by day for bar chart data.
 * Returns array of { date, label, total } sorted chronologically.
 */
export function getDailyExpenses(transactions) {
    const expenses = transactions.filter(
        (tx) => parseFloat(tx.transactionAmount?.amount || 0) < 0
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
 * 0 = this month, 1 = last month, 2 = last 3 months
 */
export function filterByPeriod(transactions, periodIndex) {
    const now = new Date();
    let startDate;

    switch (periodIndex) {
        case 0: // This month
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
        case 1: // Last month
            startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            break;
        case 2: // Last 3 months
            startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
            break;
        default:
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const endDate =
        periodIndex === 1
            ? new Date(now.getFullYear(), now.getMonth(), 0) // End of last month
            : now;

    return transactions.filter((tx) => {
        const txDate = new Date(tx.bookingDate || tx.valueDate);
        return txDate >= startDate && txDate <= endDate;
    });
}

export { CATEGORIES };
