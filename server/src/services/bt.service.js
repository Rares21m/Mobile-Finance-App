/**
 * @fileoverview BT Open Banking (PSD2 / Berlin Group) service layer.
 * Encapsulates all HTTP calls to the BT Sandbox API, including
 * OAuth2 client registration, AIS consent, PKCE helpers, token
 * management, and account data retrieval.
 */

const crypto = require("crypto");
const axios = require("axios");

const BT_BASE = process.env.BT_BASE_URL || "https://api.apistorebt.ro/bt/sb";
const BT_AUTH_URL =
    process.env.BT_AUTH_URL ||
    "https://apistorebt.ro/auth/realms/psd2-sb/protocol/openid-connect/auth";
const BT_REDIRECT_URI = process.env.BT_REDIRECT_URI || "https://google.com";
const BT_CLIENT_NAME = process.env.BT_CLIENT_NAME || "Novence Finance App";

// ─── PKCE Helpers ─────────────────────────────────────────────

/**
 * Generates a random code_verifier (43–128 characters, base64url-safe).
 * @returns {string}
 */
function generateCodeVerifier() {
    return crypto.randomBytes(64).toString("base64url").slice(0, 128);
}

/**
 * Derives a code_challenge from the given code_verifier using SHA-256.
 * @param {string} verifier
 * @returns {string}
 */
function generateCodeChallenge(verifier) {
    return crypto.createHash("sha256").update(verifier).digest("base64url");
}

// ─── 1. Register OAuth2 Client ────────────────────────────────

/**
 * Registers the application as an OAuth2 client with BT.
 * POST /bt/sb/oauth/register
 *
 * @returns {Promise<{ clientId: string, clientSecret: string }>}
 */
async function registerOAuthClient() {
    const response = await axios.post(
        `${BT_BASE}/oauth/register`,
        {
            redirect_uris: [BT_REDIRECT_URI],
            client_name: BT_CLIENT_NAME,
        },
        {
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                "X-Request-ID": crypto.randomUUID(),
            },
        }
    );

    return {
        clientId: response.data.client_id,
        clientSecret: response.data.client_secret,
    };
}

// ─── 2. Init Consent (AIS) ───────────────────────────────────

/**
 * Initiates an Account Information Service (AIS) consent.
 * The consent grants access to all accounts for up to 180 days.
 *
 * @param {string} psuIpAddress - End-user IP address (required by PSD2)
 * @returns {Promise<{ consentId: string, scaOAuthHref: string }>}
 */
async function initConsent(psuIpAddress) {
    // Consent validity: maximum 180 days
    const validUntil = new Date(Date.now() + 179 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];

    const response = await axios.post(
        `${BT_BASE}/bt-psd2-aisp/v2/consents`,
        {
            access: { availableAccounts: "allAccounts" },
            recurringIndicator: true,
            validUntil,
            combinedServiceIndicator: false,
            frequencyPerDay: 4,
        },
        {
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                "PSU-IP-Address": psuIpAddress,
                "X-Request-ID": crypto.randomUUID(),
            },
        }
    );

    return {
        consentId: response.data.consentId,
        scaOAuthHref: response.data._links?.scaOAuth?.href,
    };
}

// ─── 3. Build Auth URL (PKCE) ────────────────────────────────

/**
 * Builds the authorization redirect URL with PKCE (S256).
 * The user must be redirected here to approve the consent.
 *
 * @param {string} clientId
 * @param {string} consentId
 * @param {string} codeVerifier
 * @returns {{ authUrl: string, state: string }}
 */
function buildAuthUrl(clientId, consentId, codeVerifier) {
    const codeChallenge = generateCodeChallenge(codeVerifier);
    const state = crypto.randomBytes(16).toString("hex");

    const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: BT_REDIRECT_URI,
        response_type: "code",
        scope: `AIS:${consentId}`,
        state,
        nonce: crypto.randomBytes(16).toString("hex"),
        code_challenge: codeChallenge,
        code_challenge_method: "S256",
    });

    return {
        authUrl: `${BT_AUTH_URL}?${params.toString()}`,
        state,
    };
}

// ─── 4. Exchange Code for Token ──────────────────────────────

/**
 * Exchanges an authorization code for OAuth2 tokens.
 *
 * @param {string} code          - Authorization code from the redirect
 * @param {string} clientId
 * @param {string} clientSecret
 * @param {string} codeVerifier
 * @returns {Promise<{ accessToken: string, refreshToken: string, expiresIn: number }>}
 */
async function exchangeCodeForToken(code, clientId, clientSecret, codeVerifier) {
    const response = await axios.post(
        `${BT_BASE}/oauth/token`,
        new URLSearchParams({
            code,
            grant_type: "authorization_code",
            redirect_uri: BT_REDIRECT_URI,
            client_id: clientId,
            client_secret: clientSecret,
            code_verifier: codeVerifier,
        }).toString(),
        {
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
        }
    );

    return {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
        expiresIn: response.data.expires_in, // ~3599 seconds
    };
}

// ─── 5. Refresh Token ────────────────────────────────────────

/**
 * Obtains a new access_token using the refresh_token.
 * Called automatically when the current access_token expires.
 *
 * @param {string} refreshTokenValue
 * @param {string} clientId
 * @param {string} clientSecret
 * @param {string} codeVerifier
 * @returns {Promise<{ accessToken: string, refreshToken: string, expiresIn: number }>}
 */
async function refreshAccessToken(refreshTokenValue, clientId, clientSecret, codeVerifier) {
    const response = await axios.post(
        `${BT_BASE}/oauth/token`,
        new URLSearchParams({
            refresh_token: refreshTokenValue,
            grant_type: "refresh_token",
            redirect_uri: BT_REDIRECT_URI,
            client_id: clientId,
            client_secret: clientSecret,
            code_verifier: codeVerifier,
        }).toString(),
        {
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
        }
    );

    return {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
        expiresIn: response.data.expires_in,
    };
}

// ─── 6. Get Accounts ─────────────────────────────────────────

/**
 * Fetches the list of bank accounts.
 *
 * @param {string} accessToken - Bearer token
 * @param {string} consentId
 * @returns {Promise<object>} Raw BT response
 */
async function getAccounts(accessToken, consentId) {
    const response = await axios.get(`${BT_BASE}/bt-psd2-aisp/v2/accounts`, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "Consent-ID": consentId,
            Accept: "application/json",
            "X-Request-ID": crypto.randomUUID(),
        },
    });

    return response.data;
}

// ─── 7. Get Transactions ─────────────────────────────────────

/**
 * Fetches transactions for a specific account (max 120 days back).
 *
 * @param {string} accessToken
 * @param {string} consentId
 * @param {string} accountId
 * @param {object} options - { dateFrom, dateTo, bookingStatus, limit, page }
 * @returns {Promise<object>} Raw BT response
 */
async function getTransactions(accessToken, consentId, accountId, options = {}) {
    const params = new URLSearchParams();

    // dateFrom is limited to max 120 days in the past by BT
    if (options.dateFrom) params.append("dateFrom", options.dateFrom);
    if (options.dateTo) params.append("dateTo", options.dateTo);
    if (options.bookingStatus) params.append("bookingStatus", options.bookingStatus);
    if (options.limit) params.append("limit", options.limit.toString());
    if (options.page) params.append("page", options.page.toString());

    const url = `${BT_BASE}/bt-psd2-aisp/v2/accounts/${accountId}/transactions?${params.toString()}`;

    const response = await axios.get(url, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "Consent-ID": consentId,
            Accept: "application/json",
            "X-Request-ID": crypto.randomUUID(),
        },
    });

    return response.data;
}

// ─── 8. Get Account Balances ────────────────────────────────

/**
 * Fetches balances for a specific account.
 *
 * @param {string} accessToken
 * @param {string} consentId
 * @param {string} accountId
 * @returns {Promise<object>} Raw BT response
 */
async function getBalances(accessToken, consentId, accountId) {
    const response = await axios.get(`${BT_BASE}/bt-psd2-aisp/v2/accounts/${accountId}/balances`, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "Consent-ID": consentId,
            Accept: "application/json",
            "X-Request-ID": crypto.randomUUID(),
        },
    });

    return response.data;
}

module.exports = {
    generateCodeVerifier,
    generateCodeChallenge,
    registerOAuthClient,
    initConsent,
    buildAuthUrl,
    exchangeCodeForToken,
    refreshAccessToken,
    getAccounts,
    getTransactions,
    getBalances,
};
