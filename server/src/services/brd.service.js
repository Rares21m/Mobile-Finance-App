const axios = require('axios');
const crypto = require('crypto');
const CircuitBreaker = require('./circuitBreaker');


const BRD_API_BASE_URL = 'https://api.devbrd.ro/brd-api-connect-prod-organization/apicatalog/brd-psd2-aisp/v1';
const BRD_SANDBOX_PSUID = '13333330';
const BRD_SANDBOX_CONSENT_ID = '500000044';
const brdBreaker = new CircuitBreaker({
  failureThreshold: 5,
  resetTimeoutMs: 30000
});
const BRD_TIMEOUT_MS = Number(process.env.BRD_TIMEOUT_MS || 12000);
const BRD_MAX_RETRIES = Number(process.env.BRD_MAX_RETRIES || 2);

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
  return ['ECONNABORTED', 'ETIMEDOUT', 'ECONNRESET'].includes(error.code);
}

function toBrdProviderError(error) {
  const status = error.response?.status;
  const retryAfterSeconds = parseRetryAfterSeconds(error.response?.headers?.['retry-after']);

  if (status === 401) {
    return Object.assign(new Error('BRD_UNAUTHORIZED'), {
      status: 401,
      code: 'BRD_UNAUTHORIZED',
      details: { provider: 'BRD' },
      originalError: error
    });
  }

  if (status === 429) {
    return Object.assign(new Error('BRD_RATE_LIMITED'), {
      status: 429,
      code: 'BRD_RATE_LIMITED',
      details: { provider: 'BRD', retryAfterSeconds },
      originalError: error
    });
  }

  if (['ECONNABORTED', 'ETIMEDOUT'].includes(error.code)) {
    return Object.assign(new Error('BRD_TIMEOUT'), {
      status: 504,
      code: 'BRD_TIMEOUT',
      details: { provider: 'BRD', timeoutMs: BRD_TIMEOUT_MS },
      originalError: error
    });
  }

  return Object.assign(new Error('BRD_PROVIDER_ERROR'), {
    status: 502,
    code: 'BRD_PROVIDER_ERROR',
    details: { provider: 'BRD', status: status || null },
    originalError: error
  });
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function requestBrd(config) {
  if (!brdBreaker.canRequest()) {
    throw Object.assign(new Error('BANKING_PROVIDER_DEGRADED'), {
      status: 503,
      code: 'BANKING_PROVIDER_DEGRADED',
      details: { provider: 'BRD', breakerState: brdBreaker.getStatus().state }
    });
  }

  let attempt = 0;
  while (attempt <= BRD_MAX_RETRIES) {
    try {
      const response = await axios({ timeout: BRD_TIMEOUT_MS, ...config });
      brdBreaker.markSuccess();
      return response;
    } catch (error) {
      const retryable = isRetryableError(error) && attempt < BRD_MAX_RETRIES;
      const mappedError = toBrdProviderError(error);

      if (!retryable) {
        brdBreaker.markFailure();
        throw mappedError;
      }

      const retryAfterSeconds = parseRetryAfterSeconds(error.response?.headers?.['retry-after']);
      const backoffMs = retryAfterSeconds ? retryAfterSeconds * 1000 : 300 * Math.pow(2, attempt);
      attempt += 1;
      await wait(backoffMs);
    }
  }
}





class BrdService {





  getCommonHeaders(clientId, ipAddress = '127.0.0.1') {
    return {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'X-IBM-Client-Id': clientId,
      'X-Request-ID': crypto.randomUUID(),
      'Consent-ID': BRD_SANDBOX_CONSENT_ID,
      'PSU-ID': BRD_SANDBOX_PSUID,
      'PSU-IP-Address': ipAddress
    };
  }




  async getAccounts(clientId) {
    const response = await requestBrd({
      method: 'get',
      url: `${BRD_API_BASE_URL}/accounts`,
      headers: this.getCommonHeaders(clientId)
    });
    return response.data.accounts || [];
  }




  async getBalances(clientId, accountId) {
    const response = await requestBrd({
      method: 'get',
      url: `${BRD_API_BASE_URL}/accounts/${accountId}/balances`,
      headers: this.getCommonHeaders(clientId)
    });
    return response.data;
  }





  async getTransactions(clientId, accountId, dateFrom = '2018-01-01', bookingStatus = 'both') {
    const response = await requestBrd({
      method: 'get',
      url: `${BRD_API_BASE_URL}/accounts/${accountId}/transactions`,
      headers: this.getCommonHeaders(clientId),
      params: {
        dateFrom,
        bookingStatus,
        recordsPerPage: 10,
        pageNumber: 1
      }
    });
    return response.data.transactions || { booked: [], pending: [] };
  }
}

const brdService = new BrdService();
brdService.getHealthStatus = () => {
  const status = brdBreaker.getStatus();
  return {
    ok: status.state !== 'OPEN',
    provider: 'BRD',
    breaker: status
  };
};

module.exports = brdService;