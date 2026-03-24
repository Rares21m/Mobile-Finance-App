# Sprint 2 QA Checklist

Data: 2026-03-15
Scope: Home + Budget (Slice C)

## Context
- Sprint 2 include redesign UI pentru Home si Budget, fara schimbari de logica pe fluxurile critice.
- Verificarea de mai jos acopera regression suite minima ceruta: auth guard, onboarding guard, budget sync.

## Verificari code-level (PASS)

### 1) Auth guard
- [x] Daca utilizatorul nu are token, redirect catre welcome.
- [x] Daca utilizatorul este autentificat, ramane in zona protejata.
- Evidenta in cod:
  - client/app/_layout.jsx:64
  - client/app/_layout.jsx:66

### 2) Onboarding guard
- [x] Daca user este autentificat, dar onboarding incomplet, redirect catre onboarding.
- [x] Daca onboarding este complet, blocare acces accidental la auth/onboarding si redirect catre tabs.
- Evidenta in cod:
  - client/app/_layout.jsx:71
  - client/app/_layout.jsx:73
  - client/app/_layout.jsx:77

### 3) Budget sync + status logic
- [x] Persistenta locala pentru monthly limits si event budgets ramane neschimbata.
- [x] Debounced sync la server pentru limits (setTimeout + PUT /budgets/limits) ramane activ.
- [x] Pragurile status (warning/over) raman neschimbate in getBudgetStatus.
- Evidenta in cod:
  - client/context/BudgetContext.js:30
  - client/context/BudgetContext.js:31
  - client/context/BudgetContext.js:143
  - client/context/BudgetContext.js:144
  - client/context/BudgetContext.js:204
  - client/context/BudgetContext.js:205

### 4) Onboarding payload shape lock
- [x] saveProfile trimite in continuare shape-ul: { goal, incomeRange, priorityCategories }.
- Evidenta in cod:
  - client/context/OnboardingContext.js:119
  - client/context/OnboardingContext.js:120
  - client/context/OnboardingContext.js:121

## Validare statica
- [x] Lint client rulat: 0 errors, doar warning-uri existente in proiect.

## Smoke manual (device) - PASS

### Auth guard
- [x] Logout -> redirect corect catre welcome.
- [x] Login success/fail verificate manual pe UI.

### Onboarding guard
- [x] User nou -> onboarding 4 pasi obligatoriu inainte de tabs.
- [x] User cu onboarding complet -> intra direct in tabs dupa relansare app.

### Budget sync
- [x] Add/Edit/Delete monthly budget si verificare persistenta dupa restart app.
- [x] Add/Edit/Delete event budget si verificare persistenta dupa restart app.
- [x] Verificare vizuala warning/over dupa date cu spending aproape de limita.

## Concluzie
- Regression suite Sprint 2 este PASS la nivel de cod si validare statica.
- Smoke manual Android/iOS confirmat; Sprint 2 poate fi inchis.
