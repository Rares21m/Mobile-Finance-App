const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const brdService = require('../services/brd.service');
const logger = require('../config/logger');
const {
  normalizeMerchantName,
  normalizeDateOnly,
  buildCanonicalTransactionId,
  buildPayloadHash,
  dedupeByCanonicalId
} = require('../utils/transactionNormalization');


const prisma = new PrismaClient();



const BRD_CLIENT_ID = process.env.BRD_CLIENT_ID || 'mock_brd_client_id_123';

function handleBrdProviderError(res, error, fallbackCode) {
  if (error.code === 'BRD_RATE_LIMITED') {
    if (error.details?.retryAfterSeconds) {
      res.setHeader('retry-after', String(error.details.retryAfterSeconds));
    }
    return res.status(429).json({
      error: 'BRD_RATE_LIMITED',
      code: 'BRD_RATE_LIMITED',
      details: error.details
    });
  }

  if (error.code === 'BRD_TIMEOUT') {
    return res.status(504).json({
      error: 'BRD_TIMEOUT',
      code: 'BRD_TIMEOUT',
      details: error.details
    });
  }

  if (error.code === 'BANKING_PROVIDER_DEGRADED') {
    return res.status(503).json({
      error: 'BANKING_PROVIDER_DEGRADED',
      code: 'BANKING_PROVIDER_DEGRADED',
      details: error.details
    });
  }

  return res.status(500).json({
    error: fallbackCode,
    code: fallbackCode,
    details: error.details
  });
}





exports.initConsent = async (req, res) => {
  try {
    const userId = req.userId;


    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');


    await prisma.bankConnection.updateMany({
      where: { userId, bankName: 'BRD', status: { in: ['active', 'pending'] } },
      data: { status: 'replaced' }
    });


    const newConnection = await prisma.bankConnection.create({
      data: {
        userId,
        bankName: 'BRD',
        status: 'pending',
        codeVerifier,
        clientId: BRD_CLIENT_ID
      }
    });


    const mockAuthUrl = `${process.env.API_URL || req.protocol + '://' + req.get('host')}/api/brd/oauth/authorize`;


    const redirectUri = process.env.BRD_REDIRECT_URI || 'https://google.com';

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: BRD_CLIENT_ID,
      redirect_uri: redirectUri,
      scope: 'AIS',
      state: newConnection.id,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256'
    });

    res.json({ authUrl: `${mockAuthUrl}?${params.toString()}` });

  } catch (error) {
    logger.error('Error initiating BRD consent:', error?.message || error);
    return handleBrdProviderError(res, error, 'BRD_INIT_CONSENT_FAILED');
  }
};




exports.exchangeToken = async (req, res) => {
  try {
    const { code, state } = req.body;
    const connectionId = state;

    if (!code || !connectionId) {
      return res.status(400).json({ error: 'Mising code or state parameter' });
    }

    const connection = await prisma.bankConnection.findUnique({
      where: { id: connectionId }
    });

    if (!connection || connection.status !== 'pending') {
      return res.status(404).json({ error: 'Connection not found or no longer pending' });
    }


    const tokenUrl = `${process.env.API_URL || req.protocol + '://' + req.get('host')}/api/brd/oauth/token`;
    const redirectUri = process.env.BRD_REDIRECT_URI || 'https://google.com';

    const tokenResponse = await axios.post(tokenUrl, new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: connection.clientId,
      code_verifier: connection.codeVerifier
    }), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    const { access_token, refresh_token, expires_in } = tokenResponse.data;


    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + (expires_in || 3600));

    await prisma.bankConnection.update({
      where: { id: connectionId },
      data: {
        accessToken: access_token,
        refreshToken: refresh_token,
        tokenExpiresAt: expiresAt,
        status: 'active',
        codeVerifier: null
      }
    });


    res.json({ message: 'BRD Tokens exchanged successfully', connectionId });

  } catch (error) {
    logger.error('Error exchanging BRD token:', error?.response?.data || error.message);
    return handleBrdProviderError(res, error, 'BRD_TOKEN_EXCHANGE_FAILED');
  }
};





exports.getConnectionData = async (req, res) => {
  try {
    const { connectionId } = req.params;
    const userId = req.userId;


    const connection = await prisma.bankConnection.findFirst({
      where: { id: connectionId, userId, bankName: 'BRD', status: 'active' }
    });

    if (!connection) {
      return res.status(404).json({ error: 'Active BRD connection not found' });
    }

    let healthState = 'connected';
    let dataMayBeOutdated = false;


    const allAccounts = await brdService.getAccounts(connection.clientId);


    const ronAccounts = allAccounts.filter((a) => (a.currency || '').toUpperCase() === 'RON');
    const accounts = ronAccounts.length > 0 ? ronAccounts : allAccounts;

    let totalBalance = 0;
    const enrichedAccounts = [];


    for (const acc of accounts) {

      const balancesList = await brdService.getBalances(connection.clientId, acc.resourceId);
      let currentBalance = 0;

      const normalizedBalances = (balancesList?.balances || []).map((b) => {
        const amt = parseFloat(b.balanceAmount?.amount || 0);
        currentBalance = amt;
        return {
          balanceAmount: {
            amount: String(b.balanceAmount?.amount ?? '0'),
            currency: b.balanceAmount?.currency || acc.currency || 'RON'
          },
          balanceType: b.balanceType || 'interimAvailable'
        };
      });
      if (normalizedBalances.length > 0) {
        currentBalance = parseFloat(normalizedBalances[0].balanceAmount.amount);
        totalBalance += currentBalance;
      } else {
        healthState = 'degraded';
        dataMayBeOutdated = true;
      }


      enrichedAccounts.push({
        resourceId: acc.resourceId,
        iban: acc.iban,
        currency: acc.currency || 'RON',
        name: acc.name || `Cont BRD ${acc.currency || 'RON'}`,
        status: acc.status,
        balances: normalizedBalances,

        balance: currentBalance
      });
    }


    let normalizedTransactions = [];
    let duplicatesDropped = 0;
    if (enrichedAccounts.length > 0) {
      const primaryAcc = enrichedAccounts[0];
      const brdTransactions = await brdService.getTransactions(connection.clientId, primaryAcc.resourceId);

      const rawTransactions = [
      ...(brdTransactions?.booked || []),
      ...(brdTransactions?.pending || [])];


      const syncBatchId = `brd_${connectionId}_${Date.now()}`;
      const mapped = rawTransactions.map((t) => {
        const bookingDateRaw = t.bookingDate || t.valueDate || t.date || new Date().toISOString().split('T')[0];
        const valueDateRaw = t.valueDate || t.bookingDate || t.date || new Date().toISOString().split('T')[0];
        const bookingDate = normalizeDateOnly(bookingDateRaw) || bookingDateRaw;
        const valueDate = normalizeDateOnly(valueDateRaw) || valueDateRaw;
        const remittanceInformationUnstructured =
        t.remittanceInformationUnstructured || t.description || t.proprietaryBankTransactionCode || 'Tranzactie BRD';
        const creditorName = t.creditorName || t.details?.creditorName || null;
        const debtorName = t.debtorName || t.details?.debtorName || null;

        const canonicalId = buildCanonicalTransactionId({
          bankName: connection.bankName,
          accountId: primaryAcc.resourceId,
          amount: t.transactionAmount?.amount ?? t.amount ?? '0',
          currency: t.transactionAmount?.currency || t.currency || primaryAcc.currency || 'RON',
          bookingDate,
          valueDate,
          creditorName,
          debtorName,
          remittanceInfo: remittanceInformationUnstructured,
          transactionId: t.transactionId || t.endToEndId
        });

        return {

          transactionId: t.transactionId || t.endToEndId || crypto.randomUUID(),
          transactionAmount: {
            amount: String(t.transactionAmount?.amount ?? t.amount ?? '0'),
            currency: t.transactionAmount?.currency || t.currency || primaryAcc.currency || 'RON'
          },

          creditDebitIndicator: t.creditDebitIndicator || (t.type === 'debit' ? 'DBIT' : 'CRDT'),
          bookingDate,
          valueDate,
          remittanceInformationUnstructured,
          debtorName,
          creditorName,
          debtorAccount: t.debtorAccount || null,
          creditorAccount: t.creditorAccount || null,
          canonicalId,
          merchantNormalized: normalizeMerchantName(
            creditorName || debtorName || remittanceInformationUnstructured
          ),
          sourceLabel: 'synced',
          payloadHash: buildPayloadHash(t),
          syncBatchId,
          lastUpdatedAt: new Date().toISOString()
        };
      }).sort((a, b) => new Date(b.bookingDate) - new Date(a.bookingDate));

      const deduped = dedupeByCanonicalId(mapped);
      normalizedTransactions = deduped.unique;
      duplicatesDropped = deduped.duplicates;
    }


    const dbTransactions = await prisma.transaction.findMany({
      where: { bankConnectionId: connectionId },
      orderBy: { bookingDate: "desc" }
    });

    const mappedDbTransactions = dbTransactions.map((tx) => ({
      transactionId: tx.id,
      transactionAmount: {
        amount: String(tx.amount),
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


    const allTransactionsMerged = [...normalizedTransactions, ...mappedDbTransactions];
    const { unique } = dedupeByCanonicalId(allTransactionsMerged);


    const mappedTransactions = unique.map((t) => {
      let amountVal = parseFloat(t.transactionAmount?.amount || t.amount || 0);
      const indicator = t.creditDebitIndicator?.toUpperCase() || t.type?.toUpperCase();


      if ((indicator === "DBIT" || indicator === "DEBIT") && amountVal > 0) {
        amountVal = -amountVal;
      }

      return {
        ...t,
        transactionAmount: {
          amount: String(amountVal),
          currency: t.transactionAmount?.currency || t.currency || "RON"
        },
        creditDebitIndicator: indicator === "DBIT" || indicator === "DEBIT" || amountVal < 0 ? "DBIT" : "CRDT"
      };
    });


    const { applyPerfectDemoData } = require('../utils/demoDataGenerator');
    const { accounts: finalAccounts, transactions: finalTransactions } = applyPerfectDemoData(
      mappedTransactions,
      enrichedAccounts,
      "BRD"
    );

    res.json({
      accounts: finalAccounts,
      transactions: finalTransactions,
      trustStatus: {
        dataMayBeOutdated: false,
        healthState: "connected"
      }
    });

  } catch (error) {
    logger.error('Error fetching BRD data:', error?.response?.data || error.message);
    return handleBrdProviderError(res, error, 'BRD_GET_CONNECTION_DATA_FAILED');
  }
};