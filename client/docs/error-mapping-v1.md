# Client Error Mapping v1 (Sprint 5)

Data: 2026-03-15

## Principiu

Clientul foloseste `err.response.data.error` ca sursa de adevar pentru mapping i18n.
Backendul trimite acum si `code`, dar pentru backward compatibility mapping-ul ramane bazat pe `error`.

## Error codes noi mapate in client

Fisier: `client/utils/errorCodes.js`

- `BT_RATE_LIMITED` -> `serverErrors.tooManyRequests`
- `BT_TIMEOUT` -> `serverErrors.internalServerError`
- `BANKING_PROVIDER_DEGRADED` -> `serverErrors.internalServerError`

- `BRD_INIT_CONSENT_FAILED` -> `serverErrors.internalServerError`
- `BRD_TOKEN_EXCHANGE_FAILED` -> `serverErrors.internalServerError`
- `BRD_GET_CONNECTION_DATA_FAILED` -> `serverErrors.internalServerError`
- `BRD_RATE_LIMITED` -> `serverErrors.tooManyRequests`
- `BRD_TIMEOUT` -> `serverErrors.internalServerError`

- `ADVISOR_TIMEOUT` -> `serverErrors.internalServerError`
- `AI_PROVIDER_DEGRADED` -> `serverErrors.internalServerError`

- `IDEMPOTENCY_KEY_REQUIRED` -> `serverErrors.internalServerError`
- `IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD` -> `serverErrors.internalServerError`
- `IDEMPOTENCY_REQUEST_IN_PROGRESS` -> `serverErrors.internalServerError`

## UX Recovery Mapping (recomandat)

- `*_RATE_LIMITED`: afiseaza mesaj retry + respecta `retry-after` daca backend il trimite.
- `*_TIMEOUT`: afiseaza retry CTA imediat + fallback "date posibil depasite".
- `BANKING_PROVIDER_DEGRADED`: afiseaza status degradat pe Home/Accounts + pastrare ultim snapshot.
- `IDEMPOTENCY_*`: evita duplicate toasts, trateaza ca operatie deja procesata sau in curs.

## Note de compatibilitate

- Payload onboarding ramane neschimbat: `{ goal, incomeRange, priorityCategories }`.
- Clientul adauga automat `idempotency-key` pentru mutatii `manual` si `budgets` prin interceptorul Axios.
