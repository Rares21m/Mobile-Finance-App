/**
 * @fileoverview BT Open Banking (PSD2 / Berlin Group) service layer.
 * Encapsulates all HTTP calls to the BT Sandbox API, including
 * OAuth2 client registration, AIS consent, PKCE helpers, token
 * management, and account data retrieval.
 */

const crypto = require("crypto");
const axios = require("axios");
const CircuitBreaker = require("./circuitBreaker");

const BT_BASE = process.env.BT_BASE_URL || "https://api.apistorebt.ro/bt/sb";
const BT_AUTH_URL =
process.env.BT_AUTH_URL ||
"https://apistorebt.ro/auth/realms/psd2-sb/protocol/openid-connect/auth";
const BT_REDIRECT_URI = process.env.BT_REDIRECT_URI || "https://google.com";
const BT_CLIENT_NAME = process.env.BT_CLIENT_NAME || "Novence Finance App";
const btBreaker = new CircuitBreaker({
  failureThreshold: 5,
  resetTimeoutMs: 30000
});

const BT_TIMEOUT_MS = Number(process.env.BT_TIMEOUT_MS || 12000);
const BT_MAX_RETRIES = Number(process.env.BT_MAX_RETRIES || 2);

function parseRetryAfterSeconds(value) {
  if (!value) return null;
  const num = Number(value);
  if (Number.isFinite(num)) return Math.max(0, Math.floor(num));
  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) {
    return Math.max(0, Math.ceil((date.getTime() - Date.now()) / 1000));
  }
  return null;
}

function isRetryableError(error) {
  const status = error.response?.status;
  if ([429, 502, 503, 504].includes(status)) return true;
  return ["ECONNABORTED", "ETIMEDOUT", "ECONNRESET"].includes(error.code);
}

async function wait(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function buildProviderError(error) {
  const status = error.response?.status;
  const retryAfterSeconds = parseRetryAfterSeconds(error.response?.headers?.["retry-after"]);

  if (status === 401) {
    return Object.assign(new Error("BT_UNAUTHORIZED"), {
      status: 401,
      code: "BT_UNAUTHORIZED",
      details: {
        provider: "BT"
      },
      originalError: error
    });
  }

  if (status === 429) {
    return Object.assign(new Error("BT_RATE_LIMITED"), {
      status: 429,
      code: "BT_RATE_LIMITED",
      details: {
        provider: "BT",
        retryAfterSeconds
      },
      originalError: error
    });
  }

  if (["ECONNABORTED", "ETIMEDOUT"].includes(error.code)) {
    return Object.assign(new Error("BT_TIMEOUT"), {
      status: 504,
      code: "BT_TIMEOUT",
      details: {
        provider: "BT",
        timeoutMs: BT_TIMEOUT_MS
      },
      originalError: error
    });
  }

  return Object.assign(new Error("BT_PROVIDER_ERROR"), {
    status: 502,
    code: "BT_PROVIDER_ERROR",
    details: {
      provider: "BT",
      status: status || null
    },
    originalError: error
  });
}

async function requestBt(config) {
  if (!btBreaker.canRequest()) {
    throw Object.assign(new Error("BANKING_PROVIDER_DEGRADED"), {
      status: 503,
      code: "BANKING_PROVIDER_DEGRADED",
      details: { provider: "BT", breakerState: btBreaker.getStatus().state }
    });
  }

  let attempt = 0;
  while (attempt <= BT_MAX_RETRIES) {
    try {
      const response = await axios({
        timeout: BT_TIMEOUT_MS,
        ...config
      });
      btBreaker.markSuccess();
      return response;
    } catch (error) {
      const mappedError = buildProviderError(error);
      const retryable = isRetryableError(error) && attempt < BT_MAX_RETRIES;

      if (!retryable) {
        btBreaker.markFailure();
        throw mappedError;
      }

      const retryAfterSeconds = parseRetryAfterSeconds(error.response?.headers?.["retry-after"]);
      const backoffMs = retryAfterSeconds ?
      retryAfterSeconds * 1000 :
      300 * Math.pow(2, attempt);
      attempt += 1;
      await wait(backoffMs);
    }
  }
}







function generateCodeVerifier() {
  return crypto.randomBytes(64).toString("base64url").slice(0, 128);
}






function generateCodeChallenge(verifier) {
  return crypto.createHash("sha256").update(verifier).digest("base64url");
}









async function registerOAuthClient() {
  const response = await requestBt({
    method: "post",
    url: `${BT_BASE}/oauth/register`,
    data: {
      redirect_uris: [BT_REDIRECT_URI],
      client_name: BT_CLIENT_NAME
    },
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-Request-ID": crypto.randomUUID()
    }
  });

  return {
    clientId: response.data.client_id,
    clientSecret: response.data.client_secret
  };
}










async function initConsent(psuIpAddress) {

  const validUntil = new Date(Date.now() + 179 * 24 * 60 * 60 * 1000).
  toISOString().
  split("T")[0];

  const response = await requestBt({
    method: "post",
    url: `${BT_BASE}/bt-psd2-aisp/v2/consents`,
    data: {
      access: { availableAccounts: "allAccounts" },
      recurringIndicator: true,
      validUntil,
      combinedServiceIndicator: false,
      frequencyPerDay: 4
    },
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "PSU-IP-Address": psuIpAddress,
      "X-Request-ID": crypto.randomUUID()
    }
  });

  return {
    consentId: response.data.consentId,
    scaOAuthHref: response.data._links?.scaOAuth?.href
  };
}












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
    code_challenge_method: "S256"
  });

  return {
    authUrl: `${BT_AUTH_URL}?${params.toString()}`,
    state
  };
}












async function exchangeCodeForToken(code, clientId, clientSecret, codeVerifier) {
  const response = await requestBt({
    method: "post",
    url: `${BT_BASE}/oauth/token`,
    data: new URLSearchParams({
      code,
      grant_type: "authorization_code",
      redirect_uri: BT_REDIRECT_URI,
      client_id: clientId,
      client_secret: clientSecret,
      code_verifier: codeVerifier
    }).toString(),
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    }
  });

  return {
    accessToken: response.data.access_token,
    refreshToken: response.data.refresh_token,
    expiresIn: response.data.expires_in
  };
}













async function refreshAccessToken(refreshTokenValue, clientId, clientSecret, codeVerifier) {
  const response = await requestBt({
    method: "post",
    url: `${BT_BASE}/oauth/token`,
    data: new URLSearchParams({
      refresh_token: refreshTokenValue,
      grant_type: "refresh_token",
      redirect_uri: BT_REDIRECT_URI,
      client_id: clientId,
      client_secret: clientSecret,
      code_verifier: codeVerifier
    }).toString(),
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    }
  });

  return {
    accessToken: response.data.access_token,
    refreshToken: response.data.refresh_token,
    expiresIn: response.data.expires_in
  };
}










async function getAccounts(accessToken, consentId, psuIpAddress) {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    "Consent-ID": consentId,
    Accept: "application/json",
    "X-Request-ID": crypto.randomUUID()
  };
  if (psuIpAddress) headers["PSU-IP-Address"] = psuIpAddress;

  const response = await requestBt({
    method: "get",
    url: `${BT_BASE}/bt-psd2-aisp/v2/accounts`,
    headers
  });

  return response.data;
}












async function getTransactions(accessToken, consentId, accountId, psuIpAddress, options = {}) {
  const params = new URLSearchParams();


  if (options.dateFrom) params.append("dateFrom", options.dateFrom);
  if (options.dateTo) params.append("dateTo", options.dateTo);
  if (options.bookingStatus) params.append("bookingStatus", options.bookingStatus);
  if (options.limit) params.append("limit", options.limit.toString());
  if (options.page) params.append("page", options.page.toString());

  const url = `${BT_BASE}/bt-psd2-aisp/v2/accounts/${accountId}/transactions?${params.toString()}`;

  const headers = {
    Authorization: `Bearer ${accessToken}`,
    "Consent-ID": consentId,
    Accept: "application/json",
    "X-Request-ID": crypto.randomUUID()
  };
  if (psuIpAddress) headers["PSU-IP-Address"] = psuIpAddress;

  const response = await requestBt({
    method: "get",
    url,
    headers
  });

  return response.data;
}











async function getBalances(accessToken, consentId, accountId, psuIpAddress) {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    "Consent-ID": consentId,
    Accept: "application/json",
    "X-Request-ID": crypto.randomUUID()
  };
  if (psuIpAddress) headers["PSU-IP-Address"] = psuIpAddress;

  const response = await requestBt({
    method: "get",
    url: `${BT_BASE}/bt-psd2-aisp/v2/accounts/${accountId}/balances`,
    headers
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
  getHealthStatus: () => {
    const status = btBreaker.getStatus();
    return {
      ok: status.state !== "OPEN",
      provider: "BT",
      breaker: status
    };
  }
};