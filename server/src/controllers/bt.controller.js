/**
 * @fileoverview BT Open Banking (PSD2) controller for the Novence API.
 * Manages the full BT integration lifecycle: OAuth2 client registration,
 * AIS consent initiation, authorization code exchange, and data retrieval
 * (accounts, transactions, balances).
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
  const body = JSON.stringify(err.response?.data || "");
  return body.includes("UNAUTHORIZED");
}

function handleBtProviderError(res, err, fallbackCode) {
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

  return res.status(500).json({
    error: fallbackCode,
    code: fallbackCode,
    details: err.details
  });
}







async function registerClient(req, res) {
  try {
    const { clientId, clientSecret } = await btService.registerOAuthClient();


    const connection = await prisma.bankConnection.create({
      data: {
        userId: req.userId,
        bankName: "BT",
        clientId,
        clientSecret,
        status: "pending"
      }
    });

    res.json({
      connectionId: connection.id,
      clientId,
      message: "OAuth2 client registered successfully"
    });
  } catch (err) {
    logger.error(
      "BT Register Client error:",
      err.response?.data || err.message
    );
    return handleBtProviderError(res, err, "BT_REGISTER_CLIENT_FAILED");
  }
}








async function initConsent(req, res) {
  try {
    const { connectionId } = req.body;


    const rawIp = req.headers["x-forwarded-for"] || req.ip || "10.0.0.1";
    const psuIpAddress =
    rawIp.replace(/^::ffff:/, "") === "::1" ?
    "10.0.0.1" :
    rawIp.replace(/^::ffff:/, "");


    const connection = await prisma.bankConnection.findFirst({
      where: { id: connectionId, userId: req.userId }
    });

    if (!connection) {
      return res.status(404).json({ error: "BANK_CONNECTION_NOT_FOUND" });
    }


    const { consentId } = await btService.initConsent(psuIpAddress);


    const codeVerifier = btService.generateCodeVerifier();


    const { authUrl, state } = btService.buildAuthUrl(
      connection.clientId,
      consentId,
      codeVerifier
    );


    await prisma.bankConnection.update({
      where: { id: connectionId },
      data: { consentId, codeVerifier }
    });

    res.json({
      authUrl,
      consentId,
      state,
      message: "Redirect the user to authUrl for authorization"
    });
  } catch (err) {
    logger.error("BT Init Consent error:", err.response?.data || err.message);
    return handleBtProviderError(res, err, "BT_INIT_CONSENT_FAILED");
  }
}








async function exchangeToken(req, res) {
  try {
    const { connectionId, code } = req.body;

    const connection = await prisma.bankConnection.findFirst({
      where: { id: connectionId, userId: req.userId }
    });

    if (!connection) {
      return res.status(404).json({ error: "BANK_CONNECTION_NOT_FOUND" });
    }


    const { accessToken, refreshToken, expiresIn } =
    await btService.exchangeCodeForToken(
      code,
      connection.clientId,
      connection.clientSecret,
      connection.codeVerifier
    );


    const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000);


    await prisma.bankConnection.update({
      where: { id: connectionId },
      data: {
        accessToken,
        refreshToken,
        tokenExpiresAt,
        status: "active"
      }
    });


    res.json({
      message: "Token obtained successfully. Connection is now active.",
      expiresIn
    });
  } catch (err) {
    logger.error("BT Exchange Token error:", err.response?.data || err.message);
    return handleBtProviderError(res, err, "BT_TOKEN_EXCHANGE_FAILED");
  }
}








async function ensureValidToken(connection) {
  if (!connection.tokenExpiresAt || new Date() >= connection.tokenExpiresAt) {
    logger.debug("Token expired, refreshing…");

    try {
      const { accessToken, refreshToken, expiresIn } =
      await btService.refreshAccessToken(
        connection.refreshToken,
        connection.clientId,
        connection.clientSecret,
        connection.codeVerifier
      );

      const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000);

      await prisma.bankConnection.update({
        where: { id: connection.id },
        data: { accessToken, refreshToken, tokenExpiresAt }
      });

      return accessToken;
    } catch (refreshErr) {
      const isUnauthorized =
      refreshErr.response?.status === 401 ||
      JSON.stringify(refreshErr.response?.data).includes("UNAUTHORIZED");

      if (isUnauthorized) {

        logger.warn(
          `Connection ${connection.id} refresh token expired. Marking as expired.`
        );
        await prisma.bankConnection.
        update({
          where: { id: connection.id },
          data: { status: "expired" }
        }).
        catch(() => {});
        throw Object.assign(new Error("BT_SESSION_EXPIRED"), {
          btExpired: true
        });
      }
      throw refreshErr;
    }
  }

  return connection.accessToken;
}






async function getAccounts(req, res) {
  try {
    const { connectionId } = req.params;

    const connection = await prisma.bankConnection.findFirst({
      where: { id: connectionId, userId: req.userId, status: "active" }
    });

    if (!connection) {
      return res.status(404).json({ error: "ACTIVE_CONNECTION_NOT_FOUND" });
    }


    let accessToken;
    try {
      accessToken = await ensureValidToken(connection);
    } catch (tokenErr) {
      if (tokenErr.btExpired) {
        return res.status(401).json({ error: "BT_SESSION_EXPIRED" });
      }
      throw tokenErr;
    }

    const rawIp = req.headers["x-forwarded-for"] || req.ip || "10.0.0.1";
    const psuIpAddress = rawIp.replace(/^::ffff:/, "") === "::1" ? "10.0.0.1" : rawIp.replace(/^::ffff:/, "");

    const accounts = await btService.getAccounts(
      accessToken,
      connection.consentId,
      psuIpAddress
    );

    logger.debug("BT Accounts response:", JSON.stringify(accounts, null, 2));

    res.json(accounts);
  } catch (err) {
    if (isBtUnauthorized(err)) {
      logger.warn(
        `BT consent expired for connection ${req.params.connectionId}. Marking as expired. Error detail: ${JSON.stringify(err.response?.data || err.message)}`
      );
      await prisma.bankConnection.
      update({
        where: { id: req.params.connectionId },
        data: { status: "expired" }
      }).
      catch(() => {});
      return res.status(401).json({ error: "BT_SESSION_EXPIRED" });
    }
    logger.error("BT Get Accounts error:", err.response?.data || err.message);
    return handleBtProviderError(res, err, "BT_GET_ACCOUNTS_FAILED");
  }
}







async function getTransactions(req, res) {
  try {
    const { connectionId, accountId } = req.params;
    const { dateFrom, dateTo, bookingStatus, limit, page } = req.query;

    const connection = await prisma.bankConnection.findFirst({
      where: { id: connectionId, userId: req.userId, status: "active" }
    });

    if (!connection) {
      return res.status(404).json({ error: "ACTIVE_CONNECTION_NOT_FOUND" });
    }

    const accessToken = await ensureValidToken(connection);

    const rawIp = req.headers["x-forwarded-for"] || req.ip || "10.0.0.1";
    const psuIpAddress = rawIp.replace(/^::ffff:/, "") === "::1" ? "10.0.0.1" : rawIp.replace(/^::ffff:/, "");

    const transactions = await btService.getTransactions(
      accessToken,
      connection.consentId,
      accountId,
      psuIpAddress,
      {
        dateFrom,
        dateTo,
        bookingStatus,
        limit: limit ? parseInt(limit) : undefined,
        page: page ? parseInt(page) : undefined
      }
    );

    logger.debug(
      "BT Transactions response:",
      JSON.stringify(transactions, null, 2)
    );

    res.json(transactions);
  } catch (err) {
    if (isBtUnauthorized(err)) {
      logger.warn(
        `BT consent expired for connection ${req.params.connectionId}. Error detail: ${JSON.stringify(err.response?.data || err.message)}`
      );
      await prisma.bankConnection.
      update({
        where: { id: req.params.connectionId },
        data: { status: "expired" }
      }).
      catch(() => {});
      return res.status(401).json({ error: "BT_SESSION_EXPIRED" });
    }
    logger.error(
      "BT Get Transactions error:",
      err.response?.data || err.message
    );
    return handleBtProviderError(res, err, "BT_GET_TRANSACTIONS_FAILED");
  }
}






async function getBalances(req, res) {
  try {
    const { connectionId, accountId } = req.params;

    const connection = await prisma.bankConnection.findFirst({
      where: { id: connectionId, userId: req.userId, status: "active" }
    });

    if (!connection) {
      return res.status(404).json({ error: "ACTIVE_CONNECTION_NOT_FOUND" });
    }

    const accessToken = await ensureValidToken(connection);

    const rawIp = req.headers["x-forwarded-for"] || req.ip || "10.0.0.1";
    const psuIpAddress = rawIp.replace(/^::ffff:/, "") === "::1" ? "10.0.0.1" : rawIp.replace(/^::ffff:/, "");

    const balances = await btService.getBalances(
      accessToken,
      connection.consentId,
      accountId,
      psuIpAddress
    );

    logger.debug("BT Balances response:", JSON.stringify(balances, null, 2));

    res.json(balances);
  } catch (err) {
    if (isBtUnauthorized(err)) {
      logger.warn(
        `BT consent expired for connection ${req.params.connectionId}.`
      );
      await prisma.bankConnection.
      update({
        where: { id: req.params.connectionId },
        data: { status: "expired" }
      }).
      catch(() => {});
      return res.status(401).json({ error: "BT_SESSION_EXPIRED" });
    }
    logger.error("BT Get Balances error:", err.response?.data || err.message);
    return handleBtProviderError(res, err, "BT_GET_BALANCES_FAILED");
  }
}







async function getConnectionData(req, res) {
  try {
    const { connectionId } = req.params;
    const { dateFrom, bookingStatus } = req.query;

    const connection = await prisma.bankConnection.findFirst({
      where: { id: connectionId, userId: req.userId, status: "active" }
    });

    if (!connection) {
      return res.status(404).json({ error: "ACTIVE_CONNECTION_NOT_FOUND" });
    }


    let accessToken;
    try {
      accessToken = await ensureValidToken(connection);
    } catch (tokenErr) {
      if (tokenErr.btExpired) {
        return res.status(401).json({ error: "BT_SESSION_EXPIRED" });
      }
      throw tokenErr;
    }

    const consentId = connection.consentId;
    const rawIp = req.headers["x-forwarded-for"] || req.ip || "10.0.0.1";
    const psuIpAddress = rawIp.replace(/^::ffff:/, "") === "::1" ? "10.0.0.1" : rawIp.replace(/^::ffff:/, "");

    let healthState = "connected";
    let dataMayBeOutdated = false;


    const accountsData = await btService.getAccounts(accessToken, consentId, psuIpAddress);
    const accountsList = accountsData.accounts || [];


    const accountsWithBalances = await Promise.all(
      accountsList.map(async (account) => {
        try {
          const balData = await btService.getBalances(
            accessToken,
            consentId,
            account.resourceId,
            psuIpAddress
          );
          return { ...account, balances: balData.balances || [], connectionId };
        } catch {
          healthState = "degraded";
          dataMayBeOutdated = true;
          return { ...account, connectionId };
        }
      })
    );


    let transactions = [];
    let duplicatesDropped = 0;
    if (accountsWithBalances.length > 0) {
      const firstAccount = accountsWithBalances[0];
      try {
        const txData = await btService.getTransactions(
          accessToken,
          consentId,
          firstAccount.resourceId,
          psuIpAddress,
          { dateFrom, bookingStatus: bookingStatus || "booked" }
        );
        const rawBooked = txData.transactions?.booked || [];
        const syncBatchId = `bt_${connectionId}_${Date.now()}`;

        const normalized = rawBooked.map((tx) => {
          const normalizedBooking = normalizeDateOnly(tx.bookingDate);
          const normalizedValue = normalizeDateOnly(tx.valueDate);
          const canonicalId = buildCanonicalTransactionId({
            bankName: connection.bankName,
            accountId: firstAccount.resourceId,
            amount: tx.transactionAmount?.amount,
            currency: tx.transactionAmount?.currency,
            bookingDate: normalizedBooking,
            valueDate: normalizedValue,
            creditorName: tx.creditorName,
            debtorName: tx.debtorName,
            remittanceInfo: tx.remittanceInformationUnstructured,
            transactionId: tx.transactionId
          });

          let isDebit = false;
          const amt = parseFloat(tx.transactionAmount?.amount || tx.amount || 0);
          if (tx.creditDebitIndicator === "DBIT" || tx.creditDebitIndicator === "Debit") {
            isDebit = true;
          } else if (tx.type === "debit") {
            isDebit = true;
          } else if (amt < 0) {
            isDebit = true;
          } else if (tx.debtorAccount?.iban === firstAccount.iban || tx.debtorAccount?.iban) {

            isDebit = true;
          } else if (tx.proprietaryBankTransactionCode === "DEBIT") {
            isDebit = true;
          }

          const finalIndicator = isDebit ? "DBIT" : "CRDT";
          const finalAmount = isDebit ? -Math.abs(amt) : Math.abs(amt);

          return {
            ...tx,
            bookingDate: normalizedBooking || tx.bookingDate,
            valueDate: normalizedValue || tx.valueDate,
            canonicalId,
            transactionAmount: {
              amount: finalAmount.toString(),
              currency: tx.transactionAmount?.currency || tx.currency || "RON"
            },
            creditDebitIndicator: finalIndicator,
            merchantNormalized: normalizeMerchantName(
              tx.creditorName ||
              tx.debtorName ||
              tx.remittanceInformationUnstructured
            ),
            sourceLabel: "synced",
            payloadHash: buildPayloadHash(tx),
            syncBatchId,
            lastUpdatedAt: new Date().toISOString()
          };
        });

        const deduped = dedupeByCanonicalId(normalized);
        transactions = deduped.unique;
        duplicatesDropped = deduped.duplicates;
      } catch (txErr) {
        if (isBtUnauthorized(txErr)) {
          return res.status(401).json({ error: "BT_SESSION_EXPIRED" });
        }
        healthState = "degraded";
        dataMayBeOutdated = true;
        logger.error("BT Get Transactions (combined) error:", txErr.message);
      }
    }


    let dbTransactions = await prisma.transaction.findMany({
      where: { bankConnectionId: connectionId },
      orderBy: { bookingDate: "desc" }
    });


    const mappedDbTransactions = dbTransactions.map((tx) => ({
      transactionId: tx.id,
      transactionAmount: {
        amount: tx.amount < 0 ? String(tx.amount) : String(tx.amount),
        currency: tx.currency || "RON"
      },
      creditDebitIndicator: tx.amount >= 0 ? "CRDT" : "DBIT",
      bookingDate: tx.bookingDate.toISOString().split('T')[0],
      valueDate: tx.valueDate.toISOString().split('T')[0],
      remittanceInformationUnstructured: tx.remittanceInfo,
      creditorName: tx.creditorName,
      debtorName: tx.debtorName,
      category: tx.category,
      merchantNormalized: tx.merchantNormalized || normalizeMerchantName(tx.creditorName || tx.debtorName || tx.remittanceInfo),
      sourceLabel: "db",
      canonicalId: tx.canonicalId
    }));


    const allTransactions = [...transactions, ...mappedDbTransactions];


    const { unique } = dedupeByCanonicalId(allTransactions);
    const finalTransactions = unique.sort((a, b) => new Date(b.bookingDate) - new Date(a.bookingDate));

    const lastSyncAt = new Date().toISOString();


    const { applyPerfectDemoData } = require('../utils/demoDataGenerator');
    const { accounts: finalAccounts, transactions: finalTransactionsMerged } = applyPerfectDemoData(
      finalTransactions,
      accountsWithBalances,
      "BT"
    );

    res.json({
      accounts: finalAccounts,
      transactions: finalTransactionsMerged,
      metadata: {
        lastSyncAt,
        dataMayBeOutdated,
        healthState,
        sourceHints: {
          labels: ["synced", "db"],
          lastUpdatedAt: lastSyncAt,
          duplicatesDropped
        }
      },
      connection: {
        id: connection.id,
        bankName: connection.bankName,
        status: connection.status,
        updatedAt: connection.updatedAt
      }
    });
  } catch (err) {
    if (isBtUnauthorized(err)) {
      logger.warn(
        `BT consent expired for connection ${req.params.connectionId} during getConnectionData. Error detail: ${JSON.stringify(err.originalError?.response?.data || err.originalError?.message || err.message)}`
      );
      await prisma.bankConnection.
      update({
        where: { id: req.params.connectionId },
        data: { status: "expired" }
      }).
      catch(() => {});
      return res.status(401).json({ error: "BT_SESSION_EXPIRED" });
    }
    logger.error(
      "BT Get Connection Data error:",
      err.response?.data || err.stack || err.message
    );
    return handleBtProviderError(res, err, "BT_GET_CONNECTION_DATA_FAILED");
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
    for (const conn of allActive) {
      if (seen.has(conn.bankName)) {
        duplicateIds.push(conn.id);
      } else {
        seen.add(conn.bankName);
        connections.push(conn);
      }
    }


    if (duplicateIds.length > 0) {
      prisma.bankConnection.
      updateMany({
        where: { id: { in: duplicateIds } },
        data: { status: "replaced" }
      }).
      catch((e) =>
      logger.warn("Failed to clean duplicate connections:", e.message)
      );
    }

    res.json({ connections });
  } catch (err) {
    logger.error("Get User Connections error:", err.message);
    res.status(500).json({ error: "INTERNAL_SERVER_ERROR" });
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

    logger.info(
      `User ${req.userId} disconnected ${bankName} (${updated.count} connection(s) marked)`
    );
    res.json({
      message: "Bank disconnected successfully",
      count: updated.count
    });
  } catch (err) {
    logger.error("Disconnect Bank error:", err.message);
    res.status(500).json({ error: "INTERNAL_SERVER_ERROR" });
  }
}

module.exports = {
  registerClient,
  initConsent,
  exchangeToken,
  getAccounts,
  getTransactions,
  getBalances,
  getUserConnections,
  getConnectionData,
  disconnectBank
};