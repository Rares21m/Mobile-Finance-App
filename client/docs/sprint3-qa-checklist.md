# Sprint 3 QA Checklist

Data: 2026-03-15
Scope: Transactions + Analytics redesign (dense-data productivity)

## 1) Transactions - redesign + filters + presets

- [x] Filter drawer deschide/inchide corect si nu blocheaza scroll-ul listei.
- [x] Search + type filter + category chips functioneaza impreuna.
- [x] Preset-uri rapide functionale: azi, 7 zile, luna, manuale, recurente.
- [x] Date custom range filtru functioneaza corect (from/to).
- [x] Sort options pastrate: date desc, date asc, amount desc, amount asc.
- [x] Reset filters revine la starea default.

## 2) Transactions - long-press discoverability + recategorization

- [x] Hint vizibil pentru long-press la intrarea pe ecran.
- [x] Hint dismissibil fara impact functional.
- [x] Long-press pe tranzactie bancara deschide recategorization modal.
- [x] Long-press pe tranzactie manuala afiseaza edit / recategorize / delete.
- [x] Category override se aplica corect in lista.

## 3) Analytics - architecture + loading behavior

- [x] Structura pe sectiuni functioneaza (overview + sub-views dedicate).
- [x] Navigarea intre sectiuni nu pierde contextul perioadei selectate.
- [x] Export PDF ramane functional pe perioada activa.
- [x] In refresh API, UI ramane interactiva (non-blocking state banner).
- [x] Chart skeletons apar in timpul loading-ului pe sectiunile cu grafice.

## 4) Regression suite minim (Sprint 3)

- [x] CRUD manual transaction: add/edit/delete.
- [x] Filters + sort + search regression (combinatii principale).
- [x] PDF export regression.
- [x] EN/RO parity pentru textele noi din Transactions/Analytics.

## 5) Observatii

- Nu s-au schimbat payload-uri critice.
- Nu s-au schimbat cheile de categorie existente.
- Nu s-au schimbat contractele backend pentru fluxurile Sprint 3.
