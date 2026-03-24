# API Contract Snapshots v1 (Sprint 5)

Data: 2026-03-15
Scope: rute critice pentru auth, banking, budget, manual, advisor.

## Error Envelope Standard

Toate raspunsurile de eroare respecta forma:

```json
{
  "error": "MACHINE_READABLE_ERROR",
  "code": "MACHINE_READABLE_ERROR",
  "details": {},
  "traceId": "uuid"
}
```

Note:
- `details` este optional.
- `traceId` este inclus automat prin middleware pentru corelare loguri-client.
- Header propagat: `x-correlation-id`.

## Auth

### POST /api/auth/register
- Request: `{ email, password, name? }`
- Success 201: `{ token, user }`
- Errors: `EMAIL_PASSWORD_REQUIRED`, `EMAIL_ALREADY_EXISTS`, `REGISTER_FAILED`

### POST /api/auth/login
- Request: `{ email, password }`
- Success 200: `{ token, user }`
- Errors: `EMAIL_PASSWORD_REQUIRED`, `INVALID_CREDENTIALS`, `LOGIN_FAILED`

## Banking (BT)

### POST /api/bt/register-client
- Success 200: `{ connectionId, clientId, message }`
- Errors: `BT_REGISTER_CLIENT_FAILED`, `BT_RATE_LIMITED`, `BT_TIMEOUT`, `BANKING_PROVIDER_DEGRADED`

### POST /api/bt/init-consent
- Request: `{ connectionId }`
- Success 200: `{ authUrl, consentId, state, message }`
- Errors: `BANK_CONNECTION_NOT_FOUND`, `BT_INIT_CONSENT_FAILED`, `BT_RATE_LIMITED`, `BT_TIMEOUT`, `BANKING_PROVIDER_DEGRADED`

### POST /api/bt/exchange-token
- Request: `{ connectionId, code }`
- Success 200: `{ message, expiresIn }`
- Errors: `BANK_CONNECTION_NOT_FOUND`, `BT_TOKEN_EXCHANGE_FAILED`, `BT_RATE_LIMITED`, `BT_TIMEOUT`, `BANKING_PROVIDER_DEGRADED`

### GET /api/bt/connection-data/:connectionId
- Success 200: `{ accounts, transactions, metadata, connection }`
- `metadata`: `{ lastSyncAt, dataMayBeOutdated, healthState }`
- Errors: `ACTIVE_CONNECTION_NOT_FOUND`, `BT_SESSION_EXPIRED`, `BT_GET_CONNECTION_DATA_FAILED`, `BT_RATE_LIMITED`, `BT_TIMEOUT`, `BANKING_PROVIDER_DEGRADED`

## Banking (BRD)

### POST /api/brd/init-consent
- Success 200: `{ authUrl }`
- Errors: `BRD_INIT_CONSENT_FAILED`, `BRD_RATE_LIMITED`, `BRD_TIMEOUT`, `BANKING_PROVIDER_DEGRADED`

### POST /api/brd/exchange-token
- Request: `{ code, state }`
- Success 200: `{ message, connectionId }`
- Errors: `BRD_TOKEN_EXCHANGE_FAILED`, `BRD_RATE_LIMITED`, `BRD_TIMEOUT`, `BANKING_PROVIDER_DEGRADED`

### GET /api/brd/connection-data/:connectionId
- Success 200: `{ connection, accounts, totalBalance, transactions, metadata }`
- `metadata`: `{ lastSyncAt, dataMayBeOutdated, healthState }`
- Errors: `BRD_GET_CONNECTION_DATA_FAILED`, `BRD_RATE_LIMITED`, `BRD_TIMEOUT`, `BANKING_PROVIDER_DEGRADED`

## Manual Transactions

### POST /api/manual
- Headers: `idempotency-key` (required)
- Request: `{ amount, currency?, description, category, date, isExpense }`
- Success 201: `{ transaction, newBadges }`
- Errors: `IDEMPOTENCY_KEY_REQUIRED`, `INVALID_AMOUNT`, `INVALID_CATEGORY`, `INVALID_DATE`, `AMOUNT_DESCRIPTION_DATE_REQUIRED`

### PATCH /api/manual/:id
- Headers: `idempotency-key` (required)
- Success 200: `{ transaction }`
- Errors: `NOT_FOUND`, `INVALID_AMOUNT`, `INVALID_CATEGORY`, `INVALID_DATE`

### DELETE /api/manual/:id
- Headers: `idempotency-key` (required)
- Success 200: `{ success: true }`
- Errors: `NOT_FOUND`

## Budgets

### PUT /api/budgets/limits
- Headers: `idempotency-key` (required)
- Request: `{ limits: { [category]: number } }`
- Success 200: `{ limits, newBadges }`
- Errors: `IDEMPOTENCY_KEY_REQUIRED`, `LIMITS_REQUIRED`, `INVALID_CATEGORIES`

### POST /api/budgets/events
- Headers: `idempotency-key` (required)
- Request: `{ name, totalLimit, startDate, endDate, categories? }`
- Success 201: `{ event, newBadges }`
- Errors: `IDEMPOTENCY_KEY_REQUIRED`, `MISSING_FIELDS`

### PUT /api/budgets/events/:id
- Headers: `idempotency-key` (required)
- Success 200: `{ event }`
- Errors: `IDEMPOTENCY_KEY_REQUIRED`, `NOT_FOUND`

### DELETE /api/budgets/events/:id
- Headers: `idempotency-key` (required)
- Success 200: `{ message: "DELETED" }`
- Errors: `IDEMPOTENCY_KEY_REQUIRED`, `NOT_FOUND`

## Advisor

### POST /api/advisor/chat
- Request: `{ messages, financialData, language, userProfile? }`
- Success 200: `{ reply }`
- Errors: `GEMINI_NOT_CONFIGURED`, `GEMINI_KEY_INVALID`, `ADVISOR_TIMEOUT`, `AI_PROVIDER_DEGRADED`, `ADVISOR_ERROR`

## Health

### GET /api/health
- Success 200: `{ status, service, timestamp, traceId }`

### GET /api/health/dependencies
- Success 200/503: `{ status, checks, timestamp }`
- `checks`: `db`, `aiProvider`, `btAdapter`, `brdAdapter`
