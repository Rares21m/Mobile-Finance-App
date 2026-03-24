# Sprint 1 Style Inventory

Data: 2026-03-15
Scope: Home, Budget, Transactions

## Metoda
- Scan pentru valori hardcoded de culoare (`#hex`, `rgb`, `rgba`) in ecranele tinta.
- Focus doar pe inventar, fara schimbare de logica de business.

## Rezultat pe ecrane

### Home
Fisier: client/app/(tabs)/index.jsx
- Aproximativ 30 aparitii de culori hardcoded.
- Exemple frecvente:
  - `#F59E0B` (warning/accent fallback)
  - `#10B981` (success/cta)
  - `#fff` (text/icon on color backgrounds)
  - `#00000088` (overlay)
- Zone atinse:
  - goal insight fallback-uri
  - chips/indicatori vizuali
  - categorii demo/config locale
  - CTA overlays si icon foreground

### Budget
Fisier: client/app/(tabs)/budget.jsx
- Aproximativ 19 aparitii de culori hardcoded.
- Exemple frecvente:
  - paleta locala de culori pentru bugete/goals (`#10B981`, `#818CF8`, `#F59E0B`, etc.)
  - fallback-uri pe status (`#F59E0B`, `#22C55E`)
  - shadow/neutral fallback (`#000`, `#6B7280`)
- Zone atinse:
  - color picker / obiective
  - status budget chips/progress
  - iconografie secundara

### Transactions
Fisier: client/app/transactions.jsx
- Aproximativ 11 aparitii de culori hardcoded.
- Exemple frecvente:
  - `#fff` (text selected, icon foreground)
  - `#00000088` (modal/backdrop overlays)
  - `#000` (shadow)
- Zone atinse:
  - sort/filter chips
  - add transaction FAB
  - modal overlays

## Concluzie Sprint 1
- Inventory complet pentru scope-ul Sprint 1 este realizat.
- Hardcoded colors sunt concentrate in fallback-uri locale si overlay-uri UI.
- Pasii urmatori (Sprint 2+) vor migra incremental la tokeni semantici pe ecranele redesign-uite, fara schimbari de contract sau logică.
