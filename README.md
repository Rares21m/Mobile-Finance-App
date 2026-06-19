# Novence - Aplicatie de management financiar personal

Novence este o aplicatie mobila de management financiar personal, dezvoltata pentru a ajuta utilizatorii sa isi urmareasca veniturile, cheltuielile, bugetele si sanatatea financiara intr-un singur loc. Aplicatia foloseste integrare Open Banking pentru providerii BT si BRD, include un provider demonstrativ stabil numit Demo Bank si ofera recomandari financiare printr-un modul AI separat.

## Functionalitati principale

- **Open Banking PSD2**
  - Conectare cu Banca Transilvania si BRD prin fluxuri de tip sandbox.
  - Sincronizare conturi, solduri si tranzactii.
  - Normalizare si deduplicare pentru tranzactii provenite din surse diferite.

- **Demo Bank**
  - Provider fictiv, stabil, folosit pentru prezentari si testare reproductibila.
  - Foloseste un set real de tranzactii, adaptat automat astfel incat cele mai noi tranzactii sa ajunga pana ieri.
  - Nu afecteaza conexiunile BT/BRD si poate fi conectat/deconectat separat.

- **Dashboard financiar**
  - Sold total calculat din conturile conectate.
  - Flux lunar clar: venituri, cheltuieli si net luna curenta.
  - Tranzactii recente si explicatii pe categorii.

- **Analytics**
  - Vizualizare pe trecut, prezent si viitor.
  - Detectare tranzactii recurente.
  - Comparatie pe luni si categorii.
  - Forecast robust pentru estimarea soldului la final de luna.

- **Bugetare**
  - Bugete pe categorii.
  - Monitorizare cheltuieli reale vs. limite.
  - Alerte si recomandari pentru depasiri sau zone cu risc.

- **AI financiar**
  - Chat de consiliere financiara.
  - Recomandari bazate pe tranzactii, solduri, profil si obiective.
  - Generare de insight-uri, explicatii si actiuni recomandate.

## Arhitectura

Aplicatia este impartita in trei module principale:

```text
Mobile-Finance-App/
  client/   # Aplicatia mobila Expo / React Native
  server/   # API REST Node.js / Express / Prisma
  ai/       # Modul AI: prompturi, provider Gemini, advisor logic
```

### Client

Modulul `client/` contine aplicatia mobila:

- React Native si Expo
- Expo Router pentru navigatie
- React Context pentru autentificare, date bancare, bugete si notificari
- ecrane principale: Acasa, Conturi, Statistici, Buget, Consilier, Profil

### Server

Modulul `server/` expune API-ul aplicatiei:

- autentificare JWT
- rute pentru BT, BRD si Demo Bank
- persistenta prin Prisma
- controllere API subtiri pentru functionalitatile mobile
- integrare cu modulul AI prin import din `ai/src`

### AI

Modulul `ai/` contine logica inteligenta a aplicatiei:

```text
ai/
  package.json
  src/
    index.js
    providers/
      geminiProvider.js
    advisor/
      advisorService.js
      promptBuilder.js
      responseParser.js
    shared/
      financeSummary.js
```

Rolul modulului AI:

- construieste sumarul financiar trimis catre model;
- construieste promptul pentru consilierul financiar;
- apeleaza providerul Gemini;
- parseaza raspunsul in forma folosita de UI;
- separa logica AI de controllerul HTTP din server.

Controllerul din server ramane un adapter API:

```js
const { generateAdvisorReply } = require("../../../ai/src");
```

Aceasta separare permite prezentarea aplicatiei ca o arhitectura modulara: client mobil, backend financiar si modul AI independent.

## Demo Bank

Demo Bank este un provider fictiv creat pentru testare controlata si prezentare. El foloseste tranzactii reale transformate intr-un format compatibil cu aplicatia.

Caracteristici:

- datele sunt shiftate automat pana ieri;
- transferurile interne sunt excluse din import;
- conexiunea este separata de BT si BRD;
- poate fi folosita cand sandbox-urile bancare reale sunt indisponibile;
- permite demo-uri reproductibile fara dependenta de starea API-urilor externe.

## Limitari cunoscute

Providerii sandbox BT si BRD pot deveni temporar indisponibili sau pot returna erori de tip `404` / `503`. Din acest motiv, aplicatia include Demo Bank pentru testare reproductibila si pentru prezentari stabile.

Cand un sandbox bancar este indisponibil, aplicatia afiseaza o stare clara in ecranul Conturi si recomanda folosirea Demo Bank pentru demo, fara crash si fara pierderea conexiunilor existente.

## Forecast financiar

Forecast-ul din ecranul Statistici > Viitor nu mai foloseste regresie liniara OLS. Pentru date personale, regresia simpla poate produce valori instabile atunci cand exista putine luni de istoric, tranzactii rare sau outlieri mari.

Modelul actual foloseste o abordare robusta:

- grupeaza tranzactiile pe luni;
- separa veniturile de cheltuieli;
- exclude transferurile interne;
- foloseste mediana istorica;
- limiteaza outlierii;
- limiteaza trendul lunar;
- tine cont de tranzactii recurente;
- afiseaza sold estimat la final de luna si net ramas luna curenta.


## AI si recomandari

Consilierul financiar foloseste modulul `ai/` pentru a genera raspunsuri personalizate. Serverul trimite catre AI un sumar financiar, nu expune direct logica de prompt in controller.

Flux simplificat:

```text
client/advisor.jsx
  -> server/src/controllers/advisor.controller.js
    -> ai/src/advisor/advisorService.js
      -> ai/src/providers/geminiProvider.js
```

Raspunsurile AI sunt orientate catre:

- insight-uri financiare;
- alerte;
- recomandari concrete;
- sanatate financiara;
- actiuni de reducere a cheltuielilor sau imbunatatire a economisirii.

## Rulare locala

### Server

```bash
cd server
npm install
npx prisma migrate dev
npm run dev
```

### Client

```bash
cd client
npm install
npx expo start --clear
```

## Variabile de mediu

### Server

```env
DATABASE_URL="postgresql://user:parola@localhost:5432/novence"
JWT_SECRET="secretul_tau_aici"
PORT=3000

BT_CLIENT_ID="..."
BT_CLIENT_SECRET="..."
BRD_CLIENT_ID="..."
GEMINI_API_KEY="..."
```

### Client

```env
EXPO_PUBLIC_API_URL="http://<IP-UL-TAU>:3000/api"
```

## Context academic

Novence demonstreaza:

- integrare FinTech prin concepte Open Banking / PSD2;
- normalizare si deduplicare a datelor financiare;
- arhitectura modulara client / server / AI;
- fallback reproductibil prin Demo Bank;
- forecast financiar robust;
- recomandari inteligente explicabile pentru utilizator.
