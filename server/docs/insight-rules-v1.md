# Insight Rules v1

Data: 2026-03-15
Scope: Sprint 7A (insight feed actionabil)

## Obiectiv
Generam insight-uri explicabile si actionabile fara breaking changes in contractele critice.

## Input data
- Synced transactions: `Transaction` (non-duplicate, max 1000 randuri)
- Manual transactions: `ManualTransaction` (max 500 randuri)
- Profil user: `profileGoal`, `profileIncomeRange`, `profileCategories`

## Reguli detectie
1. Subscriptions
- Grupare pe comerciant
- Min 2 aparitii
- Interval mediu intre plati 20-40 zile
- Variatie suma <= 25% din media comerciantului

2. Spending spikes
- Compara luna curenta pe categorie vs media ultimelor 3 luni
- Trigger daca: crestere >= 35% si diferenta absoluta >= 100 RON

3. Recurring anomalies
- Pentru comercianti recurenti, semnalam daca tranzactia curenta depaseste cu >= 40% valoarea asteptata

4. Overspend prediction
- `projectedExpenses = currentExpenses / elapsedMonthRatio`
- `expectedIncome = income current month` sau midpoint din `incomeRange`
- Risc:
  - `critical` daca overspend > 20% din expectedIncome
  - `warning` daca overspend > 0
  - `info` altfel

5. Upcoming recurring bills
- Subscriptions cu due date in urmatoarele 21 zile

6. Goal suggestions
- Scenarii:
  - conservative = 0.8 * monthlySuggestion
  - realistic = monthlySuggestion
  - accelerated = 1.35 * monthlySuggestion
- `weeklyContribution = realistic / 4.33`

## Explainability minima (obligatorie)
Fiecare insight major include:
- `summary`: ce s-a detectat
- `rationale`: de ce apare insight-ul
- `cta`: urmatorul pas concret

## Contract output feed
`GET /api/insights/feed`
- `generatedAt`
- `insights[]`
- `overspendPrediction`
- `upcomingBills[]`
- `goalSuggestions`
- `actionCenter[]`

## Invariants Sprint 7A
- Nu modificam BT/BRD integration flow
- Nu modificam onboarding payload shape
- Nu modificam endpoint-ul existent de advisor in mod breaking
- Insight major fara `rationale` + `cta` este invalid
