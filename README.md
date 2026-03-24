# Novence – Aplicație de Management Financiar (Personal Finance)

Novence este o aplicație web și de mobil completă, dezvoltată pentru a ajuta utilizatorii să își urmărească veniturile, să își gestioneze cheltuielile, să seteze bugete inteligente și să își atingă obiectivele financiare. Construită cu tehnologii moderne, Novence oferă interogarea securizată a datelor bancare prin Open Banking (Banca Transilvania și BRD), analize grafice și o experiență de utilizare simplă și curată.

## Funcționalități Principale

- **Integrări Open Banking (PSD2):**
  - Conectare securizată cu conturile Banca Transilvania (BT) și BRD.
  - Sincronizare automată a soldurilor și tranzacțiilor.
  - Curățarea și deduplicarea automată a tranzacțiilor.
- **Analize și Statistici:**
  - Grafice interactive pentru vizualizarea balanței de venituri vs. cheltuieli.
  - Avertizări pentru cheltuieli neobișnuite (anomalii).
  - Clasificarea automată a comercianților pentru o urmărire mai clară a banilor.
- **Bugetare Dinamică:**
  - Configurare ghidată bazată pe regula 50/30/20.
  - Sugestii automate de bugetare și alerte dinamice privind sănătatea financiară.
- **Tranzacții Manuale:**
  - Posibilitatea de a adăuga manual tranzacții cash sau offline.
- **Notificări și Gamificare:**
  - Alerte în aplicație și insigne (badges) pentru atingerea anumitor obiective financiare.

---

## Arhitectură și Tehnologii

Aplicația este împărțită într-o componentă de server (Backend) și una de client (Aplicație Mobilă).

### Frontend (Aplicație Mobilă)
Construit cu **React Native** și **Expo** (pentru iOS și Android).
- **Stilizare:** `NativeWind` (Tailwind CSS adaptat pentru React Native).
- **Navigație:** `Expo Router` și React Navigation.
- **Preluarea datelor:** Axios și React Context API.
- **Grafice:** Biblioteca `react-native-gifted-charts`.
- **Stocare locală:** `@react-native-async-storage` pentru date persistente și sesiuni.

### Backend (Server)
Un API REST dezvoltat folosind **Node.js** și **Express**.
- **Bază de Date:** Relatională (PostgreSQL/MySQL), interogată folosind ORM-ul `Prisma`.
- **Securitate:** Autentificare pe bază de JWT (`jsonwebtoken`), hash-uri sigure pentru parole (`bcrypt`).
- **Open Banking:** Fluxuri personalizate OAuth2, gestionarea consimțământului AIS și a token-urilor pentru API-urile BT Sandbox și BRD.
- **Analiză AI:** Integrare cu `@google/generative-ai` pentru categorisirea avansată a cheltuielilor.

---

## Rulare și Instalare

### Cerințe de sistem
- [Node.js](https://nodejs.org/) (versiunea 18 sau mai nouă)
- [Expo CLI](https://docs.expo.dev/)
- O bază de date funcțională (configurabilă prin Prisma)

### Structura Proiectului
```text
/Mobile-Finance-App
  ├── /client      # Aplicația mobilă (Frontend)
  └── /server      # Serverul API (Backend)
```

### Pași pentru pornire

#### 1. Setup Server
```bash
cd server
npm install
# Configurează fișierul `.env` cu Datele Bazei de Date, Secretul JWT și credențialele pentru BT/BRD
# Rulează migrațiile pentru baza de date
npx prisma migrate dev
# Pornește serverul
npm run dev
```

#### 2. Setup Aplicație (Client)
```bash
cd client
npm install
# Creează fișierul `.env` și setează URL-ul API-ului (ex: EXPO_PUBLIC_API_URL=http://<IP-UL-TAU>:3000/api)
# Pornește mediul de dezvoltare Expo
npx expo start --clear
```

---

## Variabile de Mediu (Environment Variables)

Este necesar să creezi fișiere `.env` atât în `/server` cât și în `/client`.

**Backend (`server/.env`):**
```env
DATABASE_URL="postgresql://user:parola@localhost:5432/novence"
JWT_SECRET="secretul_tau_aici"
PORT=3000

# Open Banking
BT_CLIENT_ID="..."
BT_CLIENT_SECRET="..."
BRD_CLIENT_ID="..."
```

**Frontend (`client/.env`):**
```env
EXPO_PUBLIC_API_URL="http://<IP-UL-TAU>:3000/api"
```

---

## Context Academic (Proiect de Licență)
Dezvoltarea aplicației Novence abordează mai multe provocări specifice ingineriei software moderne:
1. **Securitate FinTech:** Gestionarea fluxurilor OAuth2 și a consimțămintelor API-urilor bancare conform normelor PSD2.
2. **Normalizarea Datelor:** Procesarea informațiilor "murdare" venite de la bănci (nume de comercianți netratate, date de tranzacții fluctuante) pentru a obține statistici clare și unificate.
3. **UI/UX Mobil:** Crearea unei interfețe fluide prin gestionarea eficientă a redării graficelor complexe și a fluxurilor financiare, direct pe dispozitiv.


