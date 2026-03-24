
require("dotenv").config();

const prisma = require("../src/config/db");
const {
  normalizeMerchantName,
  buildCanonicalTransactionId,
  buildPayloadHash
} = require("../src/utils/transactionNormalization");

const TX_COUNT = Number(process.env.ANALYTICS_LOAD_TX_COUNT || 12000);
const MANUAL_COUNT = Number(process.env.ANALYTICS_LOAD_MANUAL_COUNT || 2000);
const OVERRIDE_COUNT = Number(process.env.ANALYTICS_LOAD_OVERRIDE_COUNT || 600);
const CHUNK_SIZE = 500;

const CATEGORIES = [
"food",
"transport",
"housing",
"utilities",
"health",
"entertainment",
"shopping",
"other"];


const MERCHANTS = [
"Kaufland",
"Carrefour",
"Lidl",
"Mol",
"Petrom",
"Regina Maria",
"Emag",
"Netflix",
"Iulius Mall",
"Electrica",
"Orange",
"Digi",
"Farmacia Tei",
"Bolt",
"Uber"];


function pick(arr, idx) {
  return arr[idx % arr.length];
}

function toUtcDateOnly(year, month, day) {
  return new Date(Date.UTC(year, month, day, 12, 0, 0));
}

function randomAmount(index) {
  const base = index % 9 + 1;
  const cents = index * 37 % 100 / 100;
  return Number((base * 17.5 + cents).toFixed(2));
}

function monthWindow(index) {

  const now = new Date();
  const monthOffset = index % 6;
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - monthOffset, 1));
}

async function createLoadConnection() {
  const user = await prisma.user.findFirst({ select: { id: true, email: true } });
  if (!user) {
    throw new Error("No user found. Create at least one user before running load seed.");
  }

  const connection = await prisma.bankConnection.create({
    data: {
      userId: user.id,
      bankName: "BT",
      status: "active",
      consentId: `load-consent-${Date.now()}`,
      clientId: `load-client-${Date.now()}`,
      clientSecret: "load-secret",
      accessToken: "load-token",
      refreshToken: "load-refresh",
      tokenExpiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),
      codeVerifier: "load-code-verifier"
    },
    select: { id: true, userId: true, bankName: true }
  });

  return connection;
}

function chunkArray(items, chunkSize) {
  const out = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    out.push(items.slice(i, i + chunkSize));
  }
  return out;
}

async function seedTransactions(connection, syncBatchId) {
  const rows = [];

  for (let i = 0; i < TX_COUNT; i += 1) {
    const monthStart = monthWindow(i);
    const day = i * 7 % 27 + 1;
    const date = toUtcDateOnly(
      monthStart.getUTCFullYear(),
      monthStart.getUTCMonth(),
      day
    );

    const isIncome = i % 17 === 0;
    const absAmount = randomAmount(i);
    const signedAmount = isIncome ? absAmount * 18 : -absAmount;

    const merchant = pick(MERCHANTS, i);
    const category = isIncome ? "other" : pick(CATEGORIES, i);
    const transactionId = `load-${syncBatchId}-${i}`;

    const canonicalId = buildCanonicalTransactionId({
      bankName: connection.bankName,
      accountId: connection.id,
      amount: signedAmount,
      currency: "RON",
      bookingDate: date.toISOString().slice(0, 10),
      valueDate: date.toISOString().slice(0, 10),
      creditorName: merchant,
      debtorName: null,
      remittanceInfo: `${merchant} payment ${i}`,
      transactionId
    });

    rows.push({
      bankConnectionId: connection.id,
      transactionId,
      canonicalId,
      amount: signedAmount,
      currency: "RON",
      sourceLabel: "synced",
      creditorName: merchant,
      debtorName: null,
      merchantNormalized: normalizeMerchantName(merchant),
      bookingDate: date,
      valueDate: date,
      normalizedBookingDate: date,
      normalizedValueDate: date,
      remittanceInfo: `${merchant} payment ${i}`,
      payloadHash: buildPayloadHash({
        transactionId,
        signedAmount,
        merchant,
        date: date.toISOString().slice(0, 10)
      }),
      syncBatchId,
      isDuplicate: false,
      category
    });
  }

  const chunks = chunkArray(rows, CHUNK_SIZE);
  for (const chunk of chunks) {
    await prisma.transaction.createMany({ data: chunk });
  }

  return rows.length;
}

async function seedManualTransactions(userId) {
  const rows = [];

  for (let i = 0; i < MANUAL_COUNT; i += 1) {
    const monthStart = monthWindow(i + 3);
    const day = i * 5 % 27 + 1;
    const date = toUtcDateOnly(
      monthStart.getUTCFullYear(),
      monthStart.getUTCMonth(),
      day
    );

    const isExpense = i % 8 !== 0;

    rows.push({
      userId,
      amount: Number((randomAmount(i + 71) * (isExpense ? 1 : 9)).toFixed(2)),
      currency: "RON",
      description: `${pick(MERCHANTS, i + 4)} manual ${i}`,
      category: isExpense ? pick(CATEGORIES, i + 2) : "other",
      date,
      isExpense
    });
  }

  const chunks = chunkArray(rows, CHUNK_SIZE);
  for (const chunk of chunks) {
    await prisma.manualTransaction.createMany({ data: chunk });
  }

  return rows.length;
}

async function seedOverrides(userId, connectionId) {
  const txIds = await prisma.transaction.findMany({
    where: { bankConnectionId: connectionId },
    select: { transactionId: true },
    orderBy: { createdAt: "desc" },
    take: OVERRIDE_COUNT
  });

  if (txIds.length === 0) return 0;

  const data = txIds.
  filter((tx) => tx.transactionId).
  map((tx, index) => ({
    userId,
    transactionId: tx.transactionId,
    category: pick(CATEGORIES, index + 5)
  }));

  for (const chunk of chunkArray(data, CHUNK_SIZE)) {
    await prisma.transactionCategoryOverride.createMany({
      data: chunk,
      skipDuplicates: true
    });
  }

  return data.length;
}

async function main() {
  const syncBatchId = `analytics_load_${Date.now()}`;

  console.log("[DataAccuracy] Load seed started...");
  console.log(
    `[DataAccuracy] Target volume: tx=${TX_COUNT}, manual=${MANUAL_COUNT}, overrides<=${OVERRIDE_COUNT}`
  );

  const connection = await createLoadConnection();

  const txInserted = await seedTransactions(connection, syncBatchId);
  const manualInserted = await seedManualTransactions(connection.userId);
  const overridesInserted = await seedOverrides(connection.userId, connection.id);

  console.log("[DataAccuracy] Load seed completed.");
  console.log(
    JSON.stringify(
      {
        connectionId: connection.id,
        userId: connection.userId,
        syncBatchId,
        txInserted,
        manualInserted,
        overridesInserted
      },
      null,
      2
    )
  );
}

main().
catch((err) => {
  console.error("[DataAccuracy] Load seed failed:", err);
  process.exitCode = 1;
}).
finally(async () => {
  await prisma.$disconnect();
});