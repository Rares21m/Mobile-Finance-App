# Explainability Spec v1

Date: 2026-03-15

## UX Objective
User can understand where critical totals come from, without leaving the screen.

## KPI Explainability Blocks
For each major KPI (income, expenses, net, budget spent):
- Show formula
- Show transaction count
- Show source breakdown (manual/synced/inferred/cached)
- Show last updated hint

## Implemented in this pass
- Analytics tab:
  - Explain this number panel
  - Formula: Net = Income - Expenses
  - Source rows with count and amount
  - Last updated timestamp hint
- Budget tab:
  - Summary formula: Remaining = Limit - Spent
  - Source label counts in summary card

## Data Contract (client-side)
- explainTotals(transactions)
  - income, expenses, net, transactionCount, sourceBreakdown
- getSourceBreakdown(transactions)
  - [{ label, count, amount }]
- getBudgetExplainability(categoryKey?)
  - spent, limit, remaining, formula, transactionCount, sourceBreakdown

## Next Iteration
- Home tab: switch all KPI math to explainTotals
- Add tap-to-expand detail modal with raw term breakdown and sample transactions
- Add parity snapshot tests across Home/Budget/Analytics
