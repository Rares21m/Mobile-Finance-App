# Action Center Spec v1

Data: 2026-03-15
Scope: Sprint 7A

## Obiectiv
Transformam insight-urile in task-uri rapide executabile din Home.

## Data source
- Endpoint: `GET /api/insights/action-center`
- Contract:
  - `generatedAt`
  - `tasks[]`: `{ id, insightId?, priority, title, benefit, metric, action }`

## UI placement
- Ecran: Home (`client/app/(tabs)/index.jsx`)
- Sectiune: sub `Quick actions`, inainte de `Details`
- Afisare initiala: top 3 task-uri

## Prioritate vizuala
- `critical`: accent rosu (`expense`)
- `warning`: accent galben (`warning`)
- `info`: accent primary

## Action mapping
- `set_budget`, `reduce_spend_plan` -> Budget tab
- `save_goal` -> Budget tab (goal flow existent)
- `review_subscription`, `inspect_transaction` -> Transactions
- fallback -> Advisor

## Insight -> Action conversion
- La tap pe task apelam `POST /api/insights/convert`
- Payload minim: `{ insightId, actionType }`
- Scop: instrumentare conversie top insights

## UX guardrails
- Fallback silent daca endpoint-ul de insights nu raspunde
- Fara blocare Home render
- Nu inlocuim quick actions existente, doar adaugam un layer actionabil
