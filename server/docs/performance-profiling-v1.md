# Performance Profiling v1

Date: 2026-03-15

## Objective
Measure the heaviest data paths used by Home/Budget/Analytics and estimate chart payload size.

## Profiling Commands
- Query and payload profiling:
  - npm run profile:analytics

## Covered paths
- transactions.byConnection.dateDesc
- manual.byUser.dateDesc
- overrides.byUser.updatedDesc
- monthlySummary.byUser.monthDesc
- chart payload sizes (raw transactions and category totals)

## Interpretation Guide
- Query target budget (local dev):
  - p95 under 250ms on top 4 paths
- Payload target budget:
  - keep chart source payload under ~300KB for smooth mid-range devices

## Notes
- Script selects the busiest active bank connection (highest transaction count) for profiling baseline.
- If no active connection exists, script exits with informative message.
- Re-run after migration + backfill to validate index impact.

## Next Actions
- Capture baseline numbers before and after backfill.
- If p95 exceeds budget, inspect EXPLAIN ANALYZE for failing path and add index tuning.

## Latest Run (2026-03-15)
- Command sequence:
  - npx prisma migrate deploy
  - npm run db:backfill
  - npm run profile:analytics
- Query timings (ms):
  - transactions.byConnection.dateDesc: 5
  - manual.byUser.dateDesc: 2
  - overrides.byUser.updatedDesc: 2
  - monthlySummary.byUser.monthDesc: 2
- Data volume note:
  - Active connection payload was empty in this environment (0 rows), so this is a baseline health run, not a load benchmark.
- Chart payload baseline:
  - rawTransactionsBytes: 2
  - categoryTotalsBytes: 2

## High-Volume Validation Run (2026-03-15)
- Command sequence:
  - npm run db:seed:load
  - npm run db:backfill
  - npm run profile:analytics
- Load seed volume:
  - transactions: 12000
  - manual transactions: 2000
  - category overrides: 600
- Query timings (ms):
  - transactions.byConnection.dateDesc: 7 (500 rows)
  - manual.byUser.dateDesc: 7 (500 rows)
  - overrides.byUser.updatedDesc: 7 (500 rows)
  - monthlySummary.byUser.monthDesc: 4 (6 rows)
- Chart payload metrics:
  - rawTransactionsBytes: 121603
  - categoryTotalsBytes: 74
  - monthlyPoints: 4
- Interpretation:
  - Query and payload budgets are within target for Sprint 6 gate validation.
