# Aggregation Parity Report v1

Date: 2026-03-15

## Goal
Ensure Home, Analytics, and Budget use consistent math for:
- Income
- Expenses
- Net
- Budget spent and remaining

## Current Parity Strategy
- Shared client utilities in categoryUtils:
  - filterByPeriod
  - explainTotals
  - getSourceBreakdown
- Budget explainability API in BudgetContext:
  - getBudgetExplainability(categoryKey?)
- Home tab now uses explainTotals for current month totals.
- Analytics explainability panel now renders:
  - KPI formula (Net = Income - Expenses)
  - Source label breakdown
  - Last updated hint
- Aggregation snapshot checks:
  - npm run test:aggregation
- Integration parity checks on real DB data:
  - npm run test:parity

## Known Gaps
- Snapshot checks run on deterministic fixtures and are complemented by integration parity on seeded real data.
- Next step: add incremental refresh trigger policy (currently rebuilt via backfill pipeline).

## Manual QA Checklist
- Select same period in Analytics and Home; compare income/expense/net.
- Compare Budget summary spent with Analytics category totals for same period.
- Validate source labels for manual, synced, and mock/cached transactions.

## Status
- Completed: Home/Analytics/Budget parity baseline implemented with zero delta in snapshot checks.
- Completed: integration parity check passed on seeded high-volume data (full month, user scope, delta=0 for income/expenses/net/count).
- Completed: monthly read model is exposed via API endpoint `/api/analytics/monthly-summary` and used by Analytics monthly trend with fallback to local computation.
