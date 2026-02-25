# Novence — Mobile Finance App

Aplicație mobilă de management financiar personal, dezvoltată ca proiect de licență.

## Stack

| Layer | Tehnologie |
|-------|-----------|
| **Mobile** | React Native + Expo SDK 54 |
| **Styling** | NativeWind (Tailwind CSS) |
| **Navigare** | Expo Router (file-based) |
| **Backend** | Node.js + Express |
| **Database** | PostgreSQL + Prisma ORM |
| **Banking** | BT Open Banking API (PSD2 Sandbox) |

## Structură

```
├── client/          # React Native (Expo)
│   ├── app/
│   │   ├── (auth)/  # Welcome, Sign In, Sign Up
│   │   └── (tabs)/  # Home, Accounts, Analytics, AI Advisor, Profile
│   └── ...
├── server/          # Express API
│   ├── src/
│   │   ├── routes/
│   │   ├── controllers/
│   │   └── services/
│   └── prisma/
└── README.md
```

## Setup

### Client (Frontend)
```bash
cd client
npm install
npx expo start
```

### Server (Backend)
```bash
cd server
npm install
npx prisma migrate dev
npm run dev
```

## Funcționalități
- Autentificare (Register / Login cu JWT)
- Conectare conturi bancare prin Open Banking (BT Sandbox)
- Dashboard cu sold total și tranzacții recente
- Statistici pe categorii de cheltuieli
- Consultant AI financiar (în dezvoltare)
