# Arhitectura modulara Novence

Aplicatia Novence este separata in trei zone:

```text
client/  -> interfata mobila
server/  -> API financiar si persistenta
ai/      -> logica de consiliere, prompturi si provider AI
```

## Flux Advisor

```text
Utilizator
  -> client/app/(tabs)/advisor.jsx
  -> server/src/controllers/advisor.controller.js
  -> ai/src/advisor/advisorService.js
  -> ai/src/providers/geminiProvider.js
```

Controllerul serverului valideaza cererea HTTP si traduce erorile in raspunsuri API. Modulul `ai/` construieste sumarul financiar, promptul, apelul catre Gemini si forma raspunsului pentru UI.

## De ce este separat modulul AI

Separarea reduce cuplarea dintre API si logica inteligenta:

- serverul ramane responsabil de autentificare, rute si date;
- modulul AI ramane responsabil de prompturi, provider si interpretare;
- clientul ramane responsabil doar de experienta de utilizare;
- logica AI poate fi testata sau inlocuita fara rescrierea controllerelor.

## Demo Bank si reproductibilitate

BT si BRD sunt providerii Open Banking principali, dar sandbox-urile externe pot fi indisponibile temporar. Demo Bank ofera un flux stabil pentru testare si prezentare:

- date shiftate automat pana ieri;
- tranzactii reale transformate in formatul aplicatiei;
- izolarea conexiunii fata de BT/BRD;
- comportament predictibil pentru demo.

## Forecast

Forecast-ul financiar foloseste o metoda robusta, nu regresie OLS:

- mediane lunare;
- limitarea outlierilor;
- trend limitat;
- venituri si cheltuieli separate;
- excluderea transferurilor interne;
- ajustare pentru recurente.

Aceasta abordare este mai potrivita pentru finante personale, unde istoricul este scurt si poate contine tranzactii rare sau atipice.
