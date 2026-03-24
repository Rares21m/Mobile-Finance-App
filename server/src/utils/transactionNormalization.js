const crypto = require("crypto");

function safeString(value) {
  return String(value || "").
  trim().
  replace(/\s+/g, " ").
  toLowerCase();
}

function normalizeMerchantName(value) {
  const merchant = safeString(value).
  replace(/[^a-z0-9\s]/g, "").
  replace(/\b(srl|sa|co|company|ltd|shop|store)\b/g, "").
  replace(/\s+/g, " ").
  trim();

  return merchant || "unknown";
}

function normalizeDateOnly(value) {
  if (!value) return null;


  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    return value.trim();
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function canonicalizeAmount(value) {
  const amount = Number.parseFloat(value || 0);
  if (!Number.isFinite(amount)) return "0.00";
  return amount.toFixed(2);
}

function buildCanonicalTransactionId({
  bankName,
  accountId,
  amount,
  currency,
  bookingDate,
  valueDate,
  creditorName,
  debtorName,
  remittanceInfo,
  transactionId
}) {
  const normalizedDate = normalizeDateOnly(valueDate) || normalizeDateOnly(bookingDate) || "unknown-date";
  const merchant = normalizeMerchantName(creditorName || debtorName || remittanceInfo);
  const body = [
  safeString(bankName),
  safeString(accountId),
  canonicalizeAmount(amount),
  safeString(currency || "RON"),
  normalizedDate,
  merchant,
  safeString(remittanceInfo),
  safeString(transactionId)].
  join("|");

  return crypto.createHash("sha256").update(body).digest("hex");
}

function buildPayloadHash(payload) {
  const body = JSON.stringify(payload || {});
  return crypto.createHash("sha256").update(body).digest("hex");
}

function dedupeByCanonicalId(transactions) {
  const seen = new Set();
  const unique = [];
  let duplicates = 0;

  for (const tx of transactions) {
    if (!tx.canonicalId) {
      unique.push(tx);
      continue;
    }

    if (seen.has(tx.canonicalId)) {
      duplicates += 1;
      continue;
    }

    seen.add(tx.canonicalId);
    unique.push(tx);
  }

  return { unique, duplicates };
}

module.exports = {
  normalizeMerchantName,
  normalizeDateOnly,
  buildCanonicalTransactionId,
  buildPayloadHash,
  dedupeByCanonicalId
};