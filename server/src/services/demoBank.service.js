const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { parse } = require("csv-parse/sync");

const DATASET_PATH = path.join(__dirname, "../../data/demo-bank-transactions.csv");
const DEMO_BANK_NAME = "DEMO_BANK";
const DEMO_CURRENCY = "RON";

const CATEGORY_MAP = {
  "Alcohol & Bars": "entertainment",
  "Auto Insurance": "transport",
  "Coffee Shops": "food",
  "Credit Card Payment": "transfer",
  "Electronics & Software": "shopping",
  "Fast Food": "food",
  "Gas & Fuel": "transport",
  Groceries: "food",
  Haircut: "health",
  "Home Improvement": "housing",
  Internet: "utilities",
  "Mobile Phone": "utilities",
  "Mortgage & Rent": "housing",
  "Movies & Dvds": "entertainment",
  Music: "entertainment",
  Paycheck: "salary",
  Restaurants: "food",
  Shopping: "shopping",
  Television: "utilities",
  Utilities: "utilities"
};

const ACCOUNT_META = {
  Checking: {
    resourceId: "demo-checking",
    iban: "RO49DEMO000000000001",
    name: "Demo Checking"
  },
  "Platinum Card": {
    resourceId: "demo-platinum-card",
    iban: "RO49DEMO000000000002",
    name: "Demo Platinum Card"
  },
  "Silver Card": {
    resourceId: "demo-silver-card",
    iban: "RO49DEMO000000000003",
    name: "Demo Silver Card"
  }
};

function parseDateOnly(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function dateOnlyString(date) {
  return date.toISOString().slice(0, 10);
}

function yesterdayFrom(now = new Date()) {
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() - 1, 12));
}

function getRows() {
  const csv = fs.readFileSync(DATASET_PATH, "utf8");
  return parse(csv, {
    columns: true,
    skip_empty_lines: true,
    trim: true
  });
}

function shiftRowsToYesterday(rows, now = new Date()) {
  const parsedDates = rows.map((row) => parseDateOnly(row.Date)).filter(Boolean);
  const latestOriginal = new Date(Math.max(...parsedDates.map((date) => date.getTime())));
  const targetLatest = yesterdayFrom(now);
  const offsetMs = targetLatest.getTime() - latestOriginal.getTime();

  return rows.map((row, index) => {
    const originalDate = parseDateOnly(row.Date);
    const shiftedDate = new Date(originalDate.getTime() + offsetMs);
    return {
      ...row,
      originalIndex: index,
      shiftedDate: dateOnlyString(shiftedDate)
    };
  });
}

function normalizedCategory(category) {
  return CATEGORY_MAP[category] || "other";
}

function signedAmount(row) {
  const amount = Math.abs(Number.parseFloat(row.Amount || 0));
  return String(row["Transaction Type"]).toLowerCase() === "credit" ? amount : -amount;
}

function canonicalIdFor(row) {
  const body = [
    DEMO_BANK_NAME,
    row.originalIndex,
    row.Date,
    row.Description,
    row.Amount,
    row["Transaction Type"],
    row["Account Name"]
  ].join("|");

  return `demo_${crypto.createHash("sha256").update(body).digest("hex")}`;
}

function toTransactionCreate(row, bankConnectionId) {
  const amount = signedAmount(row);
  const category = normalizedCategory(row.Category);
  const isDebit = amount < 0;
  const merchant = String(row.Description || "Demo transaction").trim();
  const accountName = String(row["Account Name"] || "Checking").trim();
  const canonicalId = canonicalIdFor(row);

  return {
    bankConnectionId,
    transactionId: canonicalId,
    canonicalId,
    amount,
    currency: DEMO_CURRENCY,
    sourceLabel: category === "transfer" ? "demo-transfer" : "demo",
    creditorName: isDebit ? merchant : accountName,
    debtorName: isDebit ? accountName : merchant,
    merchantNormalized: merchant.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim() || "demo",
    inferredCategory: category,
    category,
    bookingDate: new Date(`${row.shiftedDate}T12:00:00.000Z`),
    valueDate: new Date(`${row.shiftedDate}T12:00:00.000Z`),
    normalizedBookingDate: new Date(`${row.shiftedDate}T00:00:00.000Z`),
    normalizedValueDate: new Date(`${row.shiftedDate}T00:00:00.000Z`),
    remittanceInfo: merchant,
    payloadHash: crypto.createHash("sha256").update(JSON.stringify(row)).digest("hex"),
    syncBatchId: `demo_bank_${bankConnectionId}`,
    isDuplicate: false
  };
}

function buildAccounts(shiftedRows) {
  const balances = new Map();

  for (const row of shiftedRows) {
    if (normalizedCategory(row.Category) === "transfer") continue;

    const accountName = String(row["Account Name"] || "Checking").trim();
    balances.set(accountName, (balances.get(accountName) || 0) + signedAmount(row));
  }

  return Array.from(balances.entries()).map(([accountName, balance]) => {
    const meta = ACCOUNT_META[accountName] || {
      resourceId: `demo-${accountName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      iban: "RO49DEMO000000000099",
      name: `Demo ${accountName}`
    };
    const amount = Math.round(balance * 100) / 100;

    return {
      resourceId: meta.resourceId,
      iban: meta.iban,
      currency: DEMO_CURRENCY,
      name: meta.name,
      status: "enabled",
      balances: [
        {
          balanceAmount: {
            amount: String(amount),
            currency: DEMO_CURRENCY
          },
          balanceType: "interimAvailable"
        }
      ],
      balance: amount
    };
  });
}

function mapDbTransaction(tx) {
  const amount = Number(tx.amount || 0);
  return {
    transactionId: tx.transactionId || tx.id,
    transactionAmount: {
      amount: String(amount),
      currency: tx.currency || DEMO_CURRENCY
    },
    creditDebitIndicator: amount < 0 ? "DBIT" : "CRDT",
    bookingDate: tx.bookingDate?.toISOString().slice(0, 10),
    valueDate: tx.valueDate?.toISOString().slice(0, 10),
    remittanceInformationUnstructured: tx.remittanceInfo,
    creditorName: tx.creditorName,
    debtorName: tx.debtorName,
    category: tx.category,
    inferredCategory: tx.inferredCategory,
    merchantNormalized: tx.merchantNormalized,
    sourceLabel: tx.sourceLabel || "demo",
    canonicalId: tx.canonicalId,
    lastUpdatedAt: tx.updatedAt?.toISOString()
  };
}

function getShiftedDataset(now = new Date()) {
  return shiftRowsToYesterday(getRows(), now);
}

module.exports = {
  DEMO_BANK_NAME,
  buildAccounts,
  getShiftedDataset,
  mapDbTransaction,
  normalizedCategory,
  toTransactionCreate
};
