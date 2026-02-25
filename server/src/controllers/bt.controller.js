/**
 * @fileoverview BT Open Banking (PSD2) controller for the Novence API.
 * Manages the full BT integration lifecycle: OAuth2 client registration,
 * AIS consent initiation, authorization code exchange, and data retrieval
 * (accounts, transactions, balances).
 */

const prisma = require("../config/db");
const logger = require("../config/logger");
const btService = require("../services/bt.service");

/**
 * POST /api/bt/register-client
 *
 * Registers the application as an OAuth2 client with BT Sandbox.
 * Stores client_id and client_secret in a new BankConnection record.
 */
async function registerClient(req, res) {
    try {
        const { clientId, clientSecret } = await btService.registerOAuthClient();

        // Create a BankConnection record for this user
        const connection = await prisma.bankConnection.create({
            data: {
                userId: req.userId,
                bankName: "BT",
                clientId,
                clientSecret,
                status: "pending",
            },
        });

        res.json({
            connectionId: connection.id,
            clientId,
            message: "OAuth2 client registered successfully",
        });
    } catch (err) {
        logger.error("BT Register Client error:", err.response?.data || err.message);
        res.status(500).json({
            error: "BT_REGISTER_CLIENT_FAILED",
            details: err.response?.data || err.message,
        });
    }
}

/**
 * POST /api/bt/init-consent
 * Body: { connectionId }
 *
 * Initiates an AIS consent with BT and returns the authorization URL
 * that the client must open in a WebView for user approval.
 */
async function initConsent(req, res) {
    try {
        const { connectionId } = req.body;
        const psuIpAddress = req.ip || req.headers["x-forwarded-for"] || "127.0.0.1";

        // Verify the connection belongs to the authenticated user
        const connection = await prisma.bankConnection.findFirst({
            where: { id: connectionId, userId: req.userId },
        });

        if (!connection) {
            return res.status(404).json({ error: "BANK_CONNECTION_NOT_FOUND" });
        }

        // Initiate consent at BT
        const { consentId } = await btService.initConsent(psuIpAddress);

        // Generate PKCE code_verifier
        const codeVerifier = btService.generateCodeVerifier();

        // Build the authorization redirect URL
        const { authUrl, state } = btService.buildAuthUrl(
            connection.clientId,
            consentId,
            codeVerifier
        );

        // Persist consent ID and code verifier for the token exchange step
        await prisma.bankConnection.update({
            where: { id: connectionId },
            data: { consentId, codeVerifier },
        });

        res.json({
            authUrl,
            consentId,
            state,
            message: "Redirect the user to authUrl for authorization",
        });
    } catch (err) {
        logger.error("BT Init Consent error:", err.response?.data || err.message);
        res.status(500).json({
            error: "BT_INIT_CONSENT_FAILED",
            details: err.response?.data || err.message,
        });
    }
}

/**
 * POST /api/bt/exchange-token
 * Body: { connectionId, code }
 *
 * Exchanges the authorization code (received after user approval)
 * for an OAuth2 Bearer token.
 */
async function exchangeToken(req, res) {
    try {
        const { connectionId, code } = req.body;

        const connection = await prisma.bankConnection.findFirst({
            where: { id: connectionId, userId: req.userId },
        });

        if (!connection) {
            return res.status(404).json({ error: "BANK_CONNECTION_NOT_FOUND" });
        }

        // Exchange authorization code for access + refresh tokens
        const { accessToken, refreshToken, expiresIn } =
            await btService.exchangeCodeForToken(
                code,
                connection.clientId,
                connection.clientSecret,
                connection.codeVerifier
            );

        // Calculate token expiry timestamp
        const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000);

        // Persist tokens and activate connection
        await prisma.bankConnection.update({
            where: { id: connectionId },
            data: {
                accessToken,
                refreshToken,
                tokenExpiresAt,
                status: "active",
            },
        });

        res.json({
            message: "Token obtained successfully. Connection is now active.",
            expiresIn,
        });
    } catch (err) {
        logger.error("BT Exchange Token error:", err.response?.data || err.message);
        res.status(500).json({ error: "BT_TOKEN_EXCHANGE_FAILED" });
    }
}

/**
 * Internal helper: checks whether the access token has expired
 * and refreshes it automatically if needed.
 *
 * @param {object} connection - BankConnection record from Prisma
 * @returns {string} A valid access token
 */
async function ensureValidToken(connection) {
    if (!connection.tokenExpiresAt || new Date() >= connection.tokenExpiresAt) {
        logger.debug("Token expired, refreshing…");

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
            data: { accessToken, refreshToken, tokenExpiresAt },
        });

        return accessToken;
    }

    return connection.accessToken;
}

/**
 * GET /api/bt/accounts/:connectionId
 *
 * Fetches the list of bank accounts for the given connection.
 */
async function getAccounts(req, res) {
    try {
        const { connectionId } = req.params;

        const connection = await prisma.bankConnection.findFirst({
            where: { id: connectionId, userId: req.userId, status: "active" },
        });

        if (!connection) {
            return res.status(404).json({ error: "ACTIVE_CONNECTION_NOT_FOUND" });
        }

        // Ensure the token is still valid (refresh if needed)
        const accessToken = await ensureValidToken(connection);

        const accounts = await btService.getAccounts(accessToken, connection.consentId);

        logger.debug("BT Accounts response:", JSON.stringify(accounts, null, 2));

        res.json(accounts);
    } catch (err) {
        logger.error("BT Get Accounts error:", err.response?.data || err.message);
        res.status(500).json({ error: "BT_GET_ACCOUNTS_FAILED" });
    }
}

/**
 * GET /api/bt/transactions/:connectionId/:accountId
 * Query: ?dateFrom=2024-01-01&dateTo=2024-12-31&limit=50&page=1
 *
 * Fetches booked/pending transactions for a specific account.
 */
async function getTransactions(req, res) {
    try {
        const { connectionId, accountId } = req.params;
        const { dateFrom, dateTo, bookingStatus, limit, page } = req.query;

        const connection = await prisma.bankConnection.findFirst({
            where: { id: connectionId, userId: req.userId, status: "active" },
        });

        if (!connection) {
            return res.status(404).json({ error: "ACTIVE_CONNECTION_NOT_FOUND" });
        }

        const accessToken = await ensureValidToken(connection);

        const transactions = await btService.getTransactions(
            accessToken,
            connection.consentId,
            accountId,
            {
                dateFrom,
                dateTo,
                bookingStatus,
                limit: limit ? parseInt(limit) : undefined,
                page: page ? parseInt(page) : undefined,
            }
        );

        logger.debug("BT Transactions response:", JSON.stringify(transactions, null, 2));

        res.json(transactions);
    } catch (err) {
        logger.error("BT Get Transactions error:", err.response?.data || err.message);
        res.status(500).json({ error: "BT_GET_TRANSACTIONS_FAILED" });
    }
}

/**
 * GET /api/bt/balances/:connectionId/:accountId
 *
 * Fetches account balances for a specific account.
 */
async function getBalances(req, res) {
    try {
        const { connectionId, accountId } = req.params;

        const connection = await prisma.bankConnection.findFirst({
            where: { id: connectionId, userId: req.userId, status: "active" },
        });

        if (!connection) {
            return res.status(404).json({ error: "ACTIVE_CONNECTION_NOT_FOUND" });
        }

        const accessToken = await ensureValidToken(connection);

        const balances = await btService.getBalances(
            accessToken,
            connection.consentId,
            accountId
        );

        logger.debug("BT Balances response:", JSON.stringify(balances, null, 2));

        res.json(balances);
    } catch (err) {
        logger.error("BT Get Balances error:", err.response?.data || err.message);
        res.status(500).json({ error: "BT_GET_BALANCES_FAILED" });
    }
}

module.exports = {
    registerClient,
    initConsent,
    exchangeToken,
    getAccounts,
    getTransactions,
    getBalances,
};
