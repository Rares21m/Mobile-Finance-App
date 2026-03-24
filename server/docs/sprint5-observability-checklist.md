# Sprint 5 Observability Checklist

Data: 2026-03-15

## Request Context & Correlation

- [x] `x-correlation-id` acceptat daca este trimis de client.
- [x] `x-correlation-id` propagat in response.
- [x] `traceId` inclus in toate raspunsurile de eroare.
- [x] Log per request la final (`request.completed`) cu status + duration.

## Structured Logging

- [x] Logger backend emite JSON (timestamp, level, message, meta).
- [x] Erorile neasteptate includ stack + traceId + route context.

## Error Contract Shield

- [x] Envelope de eroare unificat: `{ error, code, details?, traceId }`.
- [x] `429` include semnal `retry-after` cand disponibil.
- [x] Timeout-uri provider mapate explicit (`BT_TIMEOUT`, `BRD_TIMEOUT`, `ADVISOR_TIMEOUT`).

## Resilience

- [x] Circuit breaker BT.
- [x] Circuit breaker BRD.
- [x] Retry cu backoff pe `429/502/503/504/timeout` in adaptoare bancare.
- [x] Degraded mode: `BANKING_PROVIDER_DEGRADED`, `AI_PROVIDER_DEGRADED`.

## Idempotency

- [x] Persistenta idempotency in DB (`IdempotencyKey`).
- [x] Header obligatoriu `idempotency-key` pe mutatii sensibile.
- [x] Replay response pentru requests duplicate cu acelasi payload.
- [x] Conflict detectat pentru key reutilizat cu payload diferit.

## Health Endpoints

- [x] `/api/health` (basic liveness).
- [x] `/api/health/dependencies` (db + ai + bt + brd).

## Client Alignment

- [x] Client trimite `idempotency-key` automat pe mutatii manual/budget.
- [x] Client mapeaza codurile noi din catalog in `client/utils/errorCodes.js`.
- [x] Last sync metadata propagata in `BankContext` si afisata in Home/Accounts.
- [x] Banking health state + `data may be outdated` propagate in UI.

## Next Checks (manual QA)

- [ ] Verifica BT 429 cu `retry-after` real din provider.
- [ ] Verifica BRD timeout prin limitare de retea.
- [ ] Verifica replay idempotent pe dublu tap la add manual tx.
- [ ] Verifica fallback advisor la timeout controlat.
- [ ] Verifica vizibilitate traceId in log backend + response client.
