# DB Index Audit v1

Date: 2026-03-15

## Scope
- Frequent date-desc transaction queries
- User + date filters for manual transactions and override lists
- Canonical transaction lookup and duplicate reconciliation
- Monthly read model scans for analytics payloads

## Added Indexes
- Transaction:
  - bookingDate DESC
  - bankConnectionId + bookingDate DESC
  - bankConnectionId + valueDate DESC
  - canonicalId
  - merchantNormalized
  - isDuplicate + canonicalId
  - unique(bankConnectionId, canonicalId)
- ManualTransaction:
  - userId + date DESC
- TransactionCategoryOverride:
  - userId + updatedAt DESC
- MonthlyTransactionSummary:
  - unique(userId, monthStart, currency)
  - userId + monthStart DESC

## Why These Indexes
- Home/Analytics/Budget lists sort by newest first and filter by date windows.
- Overrides are fetched per user and frequently ordered by recency.
- Canonical identity reconciliation needs fast exact match and duplicate scans.
- Monthly summaries are read by user and recent months only.

## Risks / Notes
- unique(bankConnectionId, canonicalId) allows multiple NULL canonicalId rows by PostgreSQL rules.
- Backfill script must be executed after migration to maximize index utility.
- Large historical imports should be batched to avoid long write locks.

## Verification Commands
- npm run db:migrate
- npm run db:backfill
- EXPLAIN ANALYZE on the 5 heaviest analytics queries (captured in profiling pass)
