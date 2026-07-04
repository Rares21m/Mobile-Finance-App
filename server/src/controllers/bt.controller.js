/**
 * BT sandbox controller.
 *
 * Public mobile contract kept stable:
 * POST /bt/register-client -> { connectionId, clientId }
 * POST /bt/init-consent    -> { authUrl, consentId, state }
 * POST /bt/exchange-token  -> activates connection
 * GET  /bt/connection-data/:connectionId -> accounts + transactions
 */

const prisma = require("../config/db");
const logger = require("../config/logger");
const btService = require("../services/bt.service");
const {
  normalizeMerchantName,
  normalizeDateOnly,
  buildCanonicalTransactionId,
  buildPayloadHash,
  dedupeByCanonicalId
} = require("../utils/transactionNormalization");

function isBtUnauthorized(err) {
  if (err.code === "BT_UNAUTHORIZED") return true;
  if (err.response?.status === 401) return true;
  const body = JSON.stringify(err.providerBody || err.response?.data || "");
  return body.includes("UNAUTHORIZED");
}

function handleBtProviderError(res, err, fallbackCode) {
  logger.error(fallbackCode, {
    message: err.message,
    code: err.code,
    details: err.details,
    providerBody: err.providerBody
  });

  if (err.code === "BT_ENDPOINT_NOT_FOUND") {
    return res.status(503).json({
      error: "BT_SANDBOX_UNAVAILABLE",
      code: "BT_SANDBOX_UNAVAILABLE",
      details: err.details
    });
  }

  if (err.code === "BT_RATE_LIMITED") {
    if (err.details?.retryAfterSeconds) {
      res.setHeader("retry-after", String(err.details.retryAfterSeconds));
    }
    return res.status(429).json({
      error: "BT_RATE_LIMITED",
      code: "BT_RATE_LIMITED",
      details: err.details
    });
  }

  if (err.code === "BT_TIMEOUT") {
    return res.status(504).json({
      error: "BT_TIMEOUT",
      code: "BT_TIMEOUT",
      details: err.details
    });
  }

  if (err.code === "BANKING_PROVIDER_DEGRADED") {
    return res.status(503).json({
      error: "BANKING_PROVIDER_DEGRADED",
      code: "BANKING_PROVIDER_DEGRADED",
      details: err.details
    });
  }

  return res.status(err.status || 500).json({
    error: fallbackCode,
    code: fallbackCode,
    details: err.details
  });
}

async function markConnectionExpired(connectionId) {
  if (!connectionId) return;
  await prisma.bankConnection.
  update({
    where: { id: connectionId },
    data: { status: "expired" }
  }).
  catch((err) => {
    logger.warn("bt.mark_expired_failed", {
      connectionId,
      message: err.message
    });
  });
}

async function registerClient(req, res) {
  try {
    const configuredClientId = process.env.BT_CLIENT_ID || "";
    const configuredClientSecret = process.env.BT_CLIENT_SECRET || "";
    const hasConfiguredClient = configuredClientId && configuredClientSecret;

    await prisma.bankConnection.updateMany({
      where: {
        userId: req.userId,
        bankName: "BT",
        status: { in: ["active", "pending"] }
      },
      data: { status: "replaced" }
    });

    const connection = await prisma.bankConnection.create({
      data: {
        userId: req.userId,
        bankName: "BT",
        clientId: hasConfiguredClient ? configuredClientId : null,
        clientSecret: hasConfiguredClient ? configuredClientSecret : null,
        status: "pending"
      }
    });

    logger.info("bt.sandbox_client_ready", {
      connectionId: connection.id,
      clientId: hasConfiguredClient ? configuredClientId : null,
      source: hasConfiguredClient ? "env" : "deferred_dynamic"
    });

    return res.json({
      connectionId: connection.id,
      clientId: hasConfiguredClient ? configuredClientId : null,
      message:
      hasConfiguredClient ?
      "Using configured BT sandbox OAuth client" :
      "BT sandbox connection created; OAuth client will be registered after consent"
    });
  } catch (err) {
    return handleBtProviderError(res, err, "BT_REGISTER_CLIENT_FAILED");
  }
}

async function initConsent(req, res) {
  try {
    const { connectionId } = req.body;

    const connection = await prisma.bankConnection.findFirst({
      where: { id: connectionId, userId: req.userId, bankName: "BT" }
    });

    if (!connection) {
      return res.status(404).json({ error: "BANK_CONNECTION_NOT_FOUND" });
    }

    const consent = await btService.initAisConsent();
    const credentials =
    connection.clientId && connection.clientSecret ?
    {
      clientId: connection.clientId,
      clientSecret: connection.clientSecret,
      source: "existing"
    } :
    {
      ...(await btService.registerOAuthClient()),
      source: "dynamic_after_consent"
    };
    const codeVerifier = btService.generateCodeVerifier();
    const { authUrl, state } = btService.buildAuthUrl(
      credentials.clientId,
      consent.consentId,
      codeVerifier
    );

    await prisma.bankConnection.update({
      where: { id: connectionId },
      data: {
        consentId: consent.consentId,
        clientId: credentials.clientId,
        clientSecret: credentials.clientSecret,
        codeVerifier,
        status: "pending"
      }
    });

    logger.info("bt.sandbox_consent_ready", {
      connectionId,
      consentId: consent.consentId,
      consentStatus: consent.consentStatus,
      psuIpAddress: btService.getPsuIpAddress(),
      aspspScaApproach: consent.aspspScaApproach,
      clientSource: credentials.source,
      authUrl
    });

    return res.json({
      authUrl,
      consentId: consent.consentId,
      state,
      message: "Redirect the user to authUrl for BT sandbox authorization"
    });
  } catch (err) {
    return handleBtProviderError(res, err, "BT_INIT_CONSENT_FAILED");
  }
}

async function exchangeToken(req, res) {
  try {
    const { connectionId, code } = req.body;

    if (!code) {
      return res.status(400).json({ error: "BT_AUTH_CODE_MISSING" });
    }

    const connection = await prisma.bankConnection.findFirst({
      where: { id: connectionId, userId: req.userId, bankName: "BT" }
    });

    if (!connection) {
      return res.status(404).json({ error: "BANK_CONNECTION_NOT_FOUND" });
    }

    if (!connection.clientId || !connection.clientSecret || !connection.codeVerifier) {
      return res.status(400).json({ error: "BT_CONNECTION_NOT_READY" });
    }

    const token = await btService.exchangeCodeForToken(
      code,
      connection.clientId,
      connection.clientSecret,
      connection.codeVerifier
    );

    const tokenExpiresAt = new Date(Date.now() + Number(token.expiresIn || 3600) * 1000);

    await prisma.bankConnection.update({
      where: { id: connectionId },
      data: {
        accessToken: token.accessToken,
        refreshToken: token.refreshToken,
        tokenExpiresAt,
        status: "active"
      }
    });

    logger.info("bt.sandbox_token_exchanged", {
      connectionId,
      expiresIn: token.expiresIn
    });

    return res.json({
      message: "BT sandbox token obtained successfully",
      expiresIn: token.expiresIn
    });
  } catch (err) {
    return handleBtProviderError(res, err, "BT_TOKEN_EXCHANGE_FAILED");
  }
}

async function ensureValidToken(connection) {
  if (!connection.accessToken) {
    throw Object.assign(new Error("BT_SESSION_EXPIRED"), {
      code: "BT_UNAUTHORIZED"
    });
  }

  if (!connection.tokenExpiresAt || new Date() < connection.tokenExpiresAt) {
    return connection.accessToken;
  }

  if (!connection.refreshToken) {
    throw Object.assign(new Error("BT_SESSION_EXPIRED"), {
      code: "BT_UNAUTHORIZED"
    });
  }

  const refreshed = await btService.refreshAccessToken(
    connection.refreshToken,
    connection.clientId,
    connection.clientSecret,
    connection.codeVerifier
  );

  const tokenExpiresAt = new Date(
    Date.now() + Number(refreshed.expiresIn || 3600) * 1000
  );

  await prisma.bankConnection.update({
    where: { id: connection.id },
    data: {
      accessToken: refreshed.accessToken,
      refreshToken: refreshed.refreshToken,
      tokenExpiresAt
    }
  });

  return refreshed.accessToken;
}

function mapBtTransaction(tx, account, connectionId) {
  const bookingDate = normalizeDateOnly(tx.bookingDate);
  const valueDate = normalizeDateOnly(tx.valueDate);
  const amountValue = Number(tx.transactionAmount?.amount || tx.amount || 0);
  const isDebit =
  tx.creditDebitIndicator === "DBIT" ||
  tx.creditDebitIndicator === "Debit" ||
  amountValue < 0 ||
  tx.debtorAccount?.iban === account?.iban;
  const finalAmount = isDebit ? -Math.abs(amountValue) : Math.abs(amountValue);
  const canonicalId = buildCanonicalTransactionId({
    bankName: "BT",
    accountId: account?.resourceId || account?.iban,
    amount: finalAmount,
    currency: tx.transactionAmount?.currency || tx.currency || "RON",
    bookingDate,
    valueDate,
    creditorName: tx.creditorName,
    debtorName: tx.debtorName,
    remittanceInfo: tx.remittanceInformationUnstructured,
    transactionId: tx.transactionId
  });

  return {
    ...tx,
    transactionId: tx.transactionId || canonicalId,
    transactionAmount: {
      amount: String(finalAmount),
      currency: tx.transactionAmount?.currency || tx.currency || "RON"
    },
    creditDebitIndicator: isDebit ? "DBIT" : "CRDT",
    bookingDate: bookingDate || tx.bookingDate,
    valueDate: valueDate || tx.valueDate,
    canonicalId,
    merchantNormalized: normalizeMerchantName(
      tx.creditorName ||
      tx.debtorName ||
      tx.remittanceInformationUnstructured ||
      ""
    ),
    sourceLabel: "synced",
    payloadHash: buildPayloadHash(tx),
    syncBatchId: `bt_${connectionId}_${Date.now()}`,
    lastUpdatedAt: new Date().toISOString()
  };
}

async function loadBtConnectionData(connection, query = {}) {
  const accessToken = await ensureValidToken(connection);
  const accountsData = await btService.getAccounts(
    accessToken,
    connection.consentId
  );

  const accounts = accountsData.accounts || [];
  const accountsWithBalances = await Promise.all(
    accounts.map(async (account) => {
      try {
        const balancesData = await btService.getBalances(
          accessToken,
          connection.consentId,
          account.resourceId
        );
        return {
          ...account,
          balances: balancesData.balances || [],
          connectionId: connection.id
        };
      } catch (err) {
        logger.warn("bt.balance_load_failed", {
          connectionId: connection.id,
          accountId: account.resourceId,
          message: err.message
        });
        return { ...account, connectionId: connection.id };
      }
    })
  );

  const firstAccount = accountsWithBalances[0];
  let transactions = [];
  if (firstAccount?.resourceId) {
    const txData = await btService.getTransactions(
      accessToken,
      connection.consentId,
      firstAccount.resourceId,
      {
        dateFrom: query.dateFrom,
        dateTo: query.dateTo,
        bookingStatus: query.bookingStatus || "booked"
      }
    );

    transactions = (txData.transactions?.booked || []).
    map((tx) => mapBtTransaction(tx, firstAccount, connection.id));
    transactions = dedupeByCanonicalId(transactions).unique;
  }

  return {
    accounts: accountsWithBalances,
    transactions,
    metadata: {
      lastSyncAt: new Date().toISOString(),
      healthState: "connected",
      dataMayBeOutdated: false,
      sourceHints: {
        labels: ["synced"],
        lastUpdatedAt: new Date().toISOString(),
        duplicatesDropped: 0
      }
    },
    connection: {
      id: connection.id,
      bankName: connection.bankName,
      status: connection.status,
      updatedAt: connection.updatedAt
    }
  };
}

async function findActiveConnection(req, connectionId) {
  return prisma.bankConnection.findFirst({
    where: {
      id: connectionId,
      userId: req.userId,
      bankName: "BT",
      status: "active"
    }
  });
}

async function getConnectionData(req, res) {
  try {
    const connection = await findActiveConnection(req, req.params.connectionId);
    if (!connection) {
      return res.status(404).json({ error: "ACTIVE_CONNECTION_NOT_FOUND" });
    }

    const data = await loadBtConnectionData(connection, req.query);
    return res.json(data);
  } catch (err) {
    if (isBtUnauthorized(err)) {
      await markConnectionExpired(req.params.connectionId);
      return res.status(401).json({ error: "BT_SESSION_EXPIRED" });
    }
    return handleBtProviderError(res, err, "BT_GET_CONNECTION_DATA_FAILED");
  }
}

async function getAccounts(req, res) {
  try {
    const connection = await findActiveConnection(req, req.params.connectionId);
    if (!connection) {
      return res.status(404).json({ error: "ACTIVE_CONNECTION_NOT_FOUND" });
    }
    const accessToken = await ensureValidToken(connection);
    const accounts = await btService.getAccounts(accessToken, connection.consentId);
    return res.json(accounts);
  } catch (err) {
    if (isBtUnauthorized(err)) {
      await markConnectionExpired(req.params.connectionId);
      return res.status(401).json({ error: "BT_SESSION_EXPIRED" });
    }
    return handleBtProviderError(res, err, "BT_GET_ACCOUNTS_FAILED");
  }
}

async function getBalances(req, res) {
  try {
    const connection = await findActiveConnection(req, req.params.connectionId);
    if (!connection) {
      return res.status(404).json({ error: "ACTIVE_CONNECTION_NOT_FOUND" });
    }
    const accessToken = await ensureValidToken(connection);
    const balances = await btService.getBalances(
      accessToken,
      connection.consentId,
      req.params.accountId
    );
    return res.json(balances);
  } catch (err) {
    if (isBtUnauthorized(err)) {
      await markConnectionExpired(req.params.connectionId);
      return res.status(401).json({ error: "BT_SESSION_EXPIRED" });
    }
    return handleBtProviderError(res, err, "BT_GET_BALANCES_FAILED");
  }
}

async function getTransactions(req, res) {
  try {
    const connection = await findActiveConnection(req, req.params.connectionId);
    if (!connection) {
      return res.status(404).json({ error: "ACTIVE_CONNECTION_NOT_FOUND" });
    }
    const accessToken = await ensureValidToken(connection);
    const transactions = await btService.getTransactions(
      accessToken,
      connection.consentId,
      req.params.accountId,
      req.query
    );
    return res.json(transactions);
  } catch (err) {
    if (isBtUnauthorized(err)) {
      await markConnectionExpired(req.params.connectionId);
      return res.status(401).json({ error: "BT_SESSION_EXPIRED" });
    }
    return handleBtProviderError(res, err, "BT_GET_TRANSACTIONS_FAILED");
  }
}

async function getUserConnections(req, res) {
  try {
    const allActive = await prisma.bankConnection.findMany({
      where: { userId: req.userId, status: "active" },
      select: {
        id: true,
        bankName: true,
        status: true,
        createdAt: true
      },
      orderBy: { createdAt: "desc" }
    });

    const seen = new Set();
    const connections = [];
    const duplicateIds = [];

    for (const connection of allActive) {
      if (seen.has(connection.bankName)) {
        duplicateIds.push(connection.id);
      } else {
        seen.add(connection.bankName);
        connections.push(connection);
      }
    }

    if (duplicateIds.length > 0) {
      prisma.bankConnection.
      updateMany({
        where: { id: { in: duplicateIds } },
        data: { status: "replaced" }
      }).
      catch((err) => logger.warn("bt.cleanup_duplicates_failed", err.message));
    }

    return res.json({ connections });
  } catch (err) {
    logger.error("bt.get_connections_failed", err);
    return res.status(500).json({ error: "INTERNAL_SERVER_ERROR" });
  }
}

async function disconnectBank(req, res) {
  try {
    const bankName = req.params.bankName?.toUpperCase();
    if (!["BT", "BRD"].includes(bankName)) {
      return res.status(400).json({ error: "INVALID_BANK_NAME" });
    }

    const updated = await prisma.bankConnection.updateMany({
      where: {
        userId: req.userId,
        bankName,
        status: "active"
      },
      data: { status: "disconnected" }
    });

    if (updated.count === 0) {
      return res.status(404).json({ error: "CONNECTION_NOT_FOUND" });
    }

    return res.json({
      message: "Bank disconnected successfully",
      count: updated.count
    });
  } catch (err) {
    logger.error("bt.disconnect_failed", err);
    return res.status(500).json({ error: "INTERNAL_SERVER_ERROR" });
  }
}

module.exports = {
  registerClient,
  initConsent,
  exchangeToken,
  getAccounts,
  getBalances,
  getTransactions,
  getUserConnections,
  getConnectionData,
  disconnectBank
};
