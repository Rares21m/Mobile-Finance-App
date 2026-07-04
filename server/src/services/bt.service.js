/**
 * BT Open Banking sandbox integration.
 *
 * This file intentionally follows the BT sandbox document only:
 * - dynamic OAuth2 client registration
 * - AIS consent creation
 * - OAuth authorization code flow with PKCE
 * - token exchange and AIS data calls
 */

const crypto = require("crypto");
const axios = require("axios");
const CircuitBreaker = require("./circuitBreaker");

const BT_BASE_URL = process.env.BT_BASE_URL || "https://api.apistorebt.ro/bt/sb";
const BT_AUTH_URL =
process.env.BT_AUTH_URL ||
"https://apistorebt.ro/auth/realms/psd2-sb/protocol/openid-connect/auth";
const BT_REDIRECT_URI = process.env.BT_REDIRECT_URI || "https://google.com";
const BT_CLIENT_NAME =
process.env.BT_CLIENT_NAME || "Third Party Provider Application DEMO 1";
const BT_PSU_IP_ADDRESS = process.env.BT_PSU_IP_ADDRESS || "10.0.0.1";
const BT_TIMEOUT_MS = Number(process.env.BT_TIMEOUT_MS || 12000);
const BT_MAX_RETRIES = Number(process.env.BT_MAX_RETRIES || 1);

const ENDPOINTS = {
  registration: `${BT_BASE_URL}/oauth/register`,
  token: `${BT_BASE_URL}/oauth/token`,
  consents: `${BT_BASE_URL}/bt-psd2-aisp/v2/consents`,
  accounts: `${BT_BASE_URL}/bt-psd2-aisp/v2/accounts`
};

const btBreaker = new CircuitBreaker({
  failureThreshold: 5,
  resetTimeoutMs: 30000
});

function requestId() {
  return crypto.randomUUID();
}

function getPsuIpAddress() {
  return BT_PSU_IP_ADDRESS;
}

function generateCodeVerifier() {
  return crypto.randomBytes(64).toString("base64url").slice(0, 128);
}

function generateCodeChallenge(codeVerifier) {
  return crypto.
  createHash("sha256").
  update(codeVerifier).
  digest("base64url");
}

function parseRetryAfterSeconds(value) {
  if (!value) return null;
  const numeric = Number(value);
  if (Number.isFinite(numeric)) return Math.max(0, Math.floor(numeric));
  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) {
    return Math.max(0, Math.ceil((date.getTime() - Date.now()) / 1000));
  }
  return null;
}

function mapProviderError(error) {
  const status = error.response?.status;
  const providerBody = error.response?.data || null;
  const url = error.config?.url || null;
  const retryAfterSeconds = parseRetryAfterSeconds(
    error.response?.headers?.["retry-after"]
  );

  if (status === 401) {
    return Object.assign(new Error("BT_UNAUTHORIZED"), {
      status: 401,
      code: "BT_UNAUTHORIZED",
      details: { provider: "BT", status, url, providerBody },
      providerBody,
      originalError: error
    });
  }

  if (status === 404) {
    return Object.assign(new Error("BT_ENDPOINT_NOT_FOUND"), {
      status: 404,
      code: "BT_ENDPOINT_NOT_FOUND",
      details: { provider: "BT", status, url, providerBody },
      providerBody,
      originalError: error
    });
  }

  if (status === 429) {
    return Object.assign(new Error("BT_RATE_LIMITED"), {
      status: 429,
      code: "BT_RATE_LIMITED",
      details: { provider: "BT", status, retryAfterSeconds, providerBody },
      providerBody,
      originalError: error
    });
  }

  if (["ECONNABORTED", "ETIMEDOUT"].includes(error.code)) {
    return Object.assign(new Error("BT_TIMEOUT"), {
      status: 504,
      code: "BT_TIMEOUT",
      details: { provider: "BT", timeoutMs: BT_TIMEOUT_MS },
      originalError: error
    });
  }

  return Object.assign(new Error("BT_PROVIDER_ERROR"), {
    status: 502,
    code: "BT_PROVIDER_ERROR",
    details: { provider: "BT", status: status || null, url, providerBody },
    providerBody,
    originalError: error
  });
}

function isRetryableError(error) {
  const status = error.response?.status;
  return [429, 502, 503, 504].includes(status) ||
  ["ECONNABORTED", "ETIMEDOUT", "ECONNRESET"].includes(error.code);
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function requestBt(config) {
  if (!btBreaker.canRequest()) {
    throw Object.assign(new Error("BANKING_PROVIDER_DEGRADED"), {
      status: 503,
      code: "BANKING_PROVIDER_DEGRADED",
      details: {
        provider: "BT",
        breakerState: btBreaker.getStatus().state
      }
    });
  }

  let attempt = 0;
  while (attempt <= BT_MAX_RETRIES) {
    try {
      const response = await axios({
        timeout: BT_TIMEOUT_MS,
        validateStatus: (status) => status >= 200 && status < 300,
        ...config
      });
      btBreaker.markSuccess();
      return response;
    } catch (error) {
      const mapped = mapProviderError(error);
      const shouldRetry = isRetryableError(error) && attempt < BT_MAX_RETRIES;

      if (!shouldRetry) {
        btBreaker.markFailure();
        throw mapped;
      }

      attempt += 1;
      await wait(300 * Math.pow(2, attempt - 1));
    }
  }
}

async function registerOAuthClient() {
  const response = await requestBt({
    method: "post",
    url: ENDPOINTS.registration,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-Request-ID": requestId()
    },
    data: {
      redirect_uris: [BT_REDIRECT_URI],
      client_name: BT_CLIENT_NAME
    }
  });

  return {
    clientId: response.data.client_id,
    clientSecret: response.data.client_secret,
    raw: response.data
  };
}

async function initAisConsent() {
  const validUntil = new Date(Date.now() + 179 * 24 * 60 * 60 * 1000).
  toISOString().
  slice(0, 10);

  const response = await requestBt({
    method: "post",
    url: ENDPOINTS.consents,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "PSU-IP-Address": getPsuIpAddress(),
      "X-Request-ID": requestId()
    },
    data: {
      access: {
        allPsd2: "allAccounts"
      },
      recurringIndicator: true,
      validUntil,
      combinedServiceIndicator: false,
      frequencyPerDay: 4
    }
  });

  return {
    consentId: response.data.consentId,
    consentStatus: response.data.consentStatus,
    scaOAuthHref: response.data._links?.scaOAuth?.href,
    aspspScaApproach: response.headers?.["aspsp-sca-approach"],
    raw: response.data
  };
}

function buildAuthUrl(clientId, consentId, codeVerifier) {
  const state = crypto.randomBytes(16).toString("hex");
  const nonce = crypto.randomBytes(16).toString("hex");
  const codeChallenge = generateCodeChallenge(codeVerifier);

  const params = [
    ["client_id", clientId],
    ["redirect_uri", BT_REDIRECT_URI],
    ["response_type", "code"],
    ["scope", `AIS:${consentId}`],
    ["state", state],
    ["nonce", nonce],
    ["code_challenge", codeChallenge],
    ["code_challenge_method", "S256"]
  ].
  map(([key, value]) => {
    if (key === "redirect_uri") return `${key}=${value}`;
    return `${key}=${encodeURIComponent(value)}`;
  }).
  join("&");

  return {
    authUrl: `${BT_AUTH_URL}?${params}`,
    state
  };
}

async function exchangeCodeForToken(code, clientId, clientSecret, codeVerifier) {
  const response = await requestBt({
    method: "post",
    url: ENDPOINTS.token,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
      "X-Request-ID": requestId()
    },
    data: new URLSearchParams({
      code,
      grant_type: "authorization_code",
      redirect_uri: BT_REDIRECT_URI,
      client_id: clientId,
      client_secret: clientSecret,
      code_verifier: codeVerifier
    }).toString()
  });

  return {
    accessToken: response.data.access_token,
    refreshToken: response.data.refresh_token,
    expiresIn: response.data.expires_in,
    raw: response.data
  };
}

async function refreshAccessToken(refreshToken, clientId, clientSecret, codeVerifier) {
  const response = await requestBt({
    method: "post",
    url: ENDPOINTS.token,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
      "X-Request-ID": requestId()
    },
    data: new URLSearchParams({
      refresh_token: refreshToken,
      grant_type: "refresh_token",
      redirect_uri: BT_REDIRECT_URI,
      client_id: clientId,
      client_secret: clientSecret,
      code_verifier: codeVerifier
    }).toString()
  });

  return {
    accessToken: response.data.access_token,
    refreshToken: response.data.refresh_token,
    expiresIn: response.data.expires_in,
    raw: response.data
  };
}

function authHeaders(accessToken, consentId) {
  return {
    Authorization: `Bearer ${accessToken}`,
    "Consent-ID": consentId,
    Accept: "application/json",
    "PSU-IP-Address": getPsuIpAddress(),
    "X-Request-ID": requestId()
  };
}

async function getAccounts(accessToken, consentId) {
  const response = await requestBt({
    method: "get",
    url: ENDPOINTS.accounts,
    headers: authHeaders(accessToken, consentId)
  });

  return response.data;
}

async function getBalances(accessToken, consentId, accountId) {
  const response = await requestBt({
    method: "get",
    url: `${ENDPOINTS.accounts}/${encodeURIComponent(accountId)}/balances`,
    headers: authHeaders(accessToken, consentId)
  });

  return response.data;
}

async function getTransactions(accessToken, consentId, accountId, options = {}) {
  const params = new URLSearchParams();
  if (options.dateFrom) params.set("dateFrom", options.dateFrom);
  if (options.dateTo) params.set("dateTo", options.dateTo);
  if (options.bookingStatus) params.set("bookingStatus", options.bookingStatus);
  if (options.limit) params.set("limit", String(options.limit));
  if (options.page) params.set("page", String(options.page));

  const query = params.toString() ? `?${params.toString()}` : "";
  const response = await requestBt({
    method: "get",
    url: `${ENDPOINTS.accounts}/${encodeURIComponent(accountId)}/transactions${query}`,
    headers: authHeaders(accessToken, consentId)
  });

  return response.data;
}

module.exports = {
  registerOAuthClient,
  initAisConsent,
  buildAuthUrl,
  exchangeCodeForToken,
  refreshAccessToken,
  getAccounts,
  getBalances,
  getTransactions,
  generateCodeVerifier,
  generateCodeChallenge,
  getPsuIpAddress,
  getHealthStatus: () => ({
    ok: btBreaker.getStatus().state !== "OPEN",
    provider: "BT",
    breaker: btBreaker.getStatus()
  })
};
