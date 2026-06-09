# WebRadio

En moderne webradio-app bygget med React + Vite + TypeScript. Afspiller live radiostreams, organiserer stationer i kategorier og synkroniserer via Firebase Firestore på tværs af alle enheder.

## Tech Stack

- **Frontend:** React 18 + Vite + TypeScript
- **Styling:** Tailwind CSS v3 (dark mode, amber accents)
- **State:** Zustand
- **Database:** Firebase Firestore (real-time sync)
- **Hosting:** Vercel

## Kom i gang lokalt

```bash
# Klon projektet
git clone https://github.com/DIT-BRUGERNAVN/webradio.git
cd webradio

# Installer dependencies
npm install

# Opret .env fra skabelon og udfyld Firebase-værdier
cp .env.example .env

# Start dev-server
npm run dev
```

Åbn [http://localhost:5173](http://localhost:5173) i browseren.

---

## Guide 1: GitHub – Opret repository og push kode

1. Gå til [github.com](https://github.com) og log ind
2. Klik **"New repository"** → giv det navn `webradio`
3. Sæt til **Public** eller **Private** efter ønske, klik **"Create repository"**
4. I projektmappen på din PC, kør:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/DIT-BRUGERNAVN/webradio.git
   git push -u origin main
   ```
5. Koden er nu på GitHub

---

## Guide 2: Firebase – Opret projekt og Firestore

1. Gå til [console.firebase.google.com](https://console.firebase.google.com) og log ind
2. Klik **"Add project"** → giv navn (f.eks. `webradio`) → Continue → Disable Google Analytics → Create project
3. Klik **"Firestore Database"** i venstre menu → **"Create database"**
4. Vælg **"Start in test mode"** (skift til production rules senere) → vælg en region (f.eks. `europe-west1`) → Done
5. Gå til **Project Settings** (tandhjul øverst til venstre) → **"Your apps"** → klik **`</>`** (Web)
6. Giv appen et navn → klik **"Register app"**
7. Kopiér de viste config-værdier ind i din `.env`-fil:
   ```env
   VITE_FIREBASE_API_KEY=...
   VITE_FIREBASE_AUTH_DOMAIN=...
   VITE_FIREBASE_PROJECT_ID=...
   VITE_FIREBASE_STORAGE_BUCKET=...
   VITE_FIREBASE_MESSAGING_SENDER_ID=...
   VITE_FIREBASE_APP_ID=...
   ```
8. Gå til **Firestore** → **"Rules"** og sæt regler (når du er klar til produktion):
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /stations/{stationId} {
         allow read, write: if true;
       }
     }
   }
   ```

Ved første opstart med en tom Firestore-database seedes 9 standard-stationer automatisk.

---

## Guide 3: Vercel – Deploy og miljøvariabler

1. Gå til [vercel.com](https://vercel.com) og log ind med GitHub
2. Klik **"Add New Project"** → vælg dit `webradio` repository → klik **"Import"**
3. Framework preset sættes automatisk til **Vite** – lad det være
4. Klik **"Environment Variables"** og tilføj alle 6 variabler fra din `.env`-fil
5. Klik **"Deploy"** – Vercel bygger og deployer automatisk
6. Fremover: hver `git push` til `main` udløser automatisk et nyt deploy
7. Del den genererede URL (f.eks. `https://webradio-xyz.vercel.app`) med andre enheder

---

## Miljøvariabler

| Variabel | Beskrivelse |
|---|---|
| `VITE_FIREBASE_API_KEY` | Firebase API-nøgle |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase auth-domæne |
| `VITE_FIREBASE_PROJECT_ID` | Firebase projekt-ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID |
| `VITE_FIREBASE_APP_ID` | Firebase app-ID |
