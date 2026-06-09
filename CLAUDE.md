# WebRadio – Claude Code kontekst

## Hvad er dette projekt
En webradio-app der afspiller live radiostreams via browser. Stationer organiseres i kategorier og synkroniseres i realtid via Firebase Firestore på tværs af alle enheder (også iPhone).

## Live miljø
- **App:** https://webradio-chi.vercel.app
- **GitHub:** https://github.com/michaelmarkmoeller-cmd/webradio
- **Firebase:** webradio-35985 (europe-west1, Firestore)
- **Deploy:** Automatisk via Vercel ved `git push origin main`

## Tech stack
- React 18 + Vite + TypeScript
- Tailwind CSS v3 — dark theme, accent: amber `#F5A623`, baggrund `#0F0F14`
- Zustand — global state (player, valgt kategori)
- Firebase Firestore — real-time sync via `onSnapshot`
- react-hot-toast — notifikationer

## Projektstruktur
```
src/
├── components/
│   ├── Player.tsx          # Sticky audio-player (bund), global
│   ├── StationCard.tsx     # Enkelt stationskort med play/slet
│   ├── StationGrid.tsx     # Responsivt grid + skeleton-loading
│   ├── CategoryFilter.tsx  # Kategoripiller: Alle, 80's, 90's, Pop, Rock, Dansk, Italo
│   ├── AddStationModal.tsx # Modal til tilføjelse af station
│   └── DeleteConfirm.tsx   # Bekræftelsesdialog ved sletning
├── store/
│   └── useRadioStore.ts    # Zustand store
├── firebase/
│   ├── config.ts           # Firebase init via VITE_* env vars
│   └── stationsService.ts  # CRUD + onSnapshot + auto-seed ved tom database
├── types/
│   └── index.ts            # Station, Category, CATEGORIES
├── App.tsx
└── main.tsx
```

## Firestore
- Collection: `stations`
- Felter: `name`, `streamUrl`, `category`, `createdAt`
- Regler: `allow read, write: if true` (permanent)
- Auto-seed: 9 stationer indsættes automatisk hvis databasen er tom

## Miljøvariabler
Ligger i `.env` (ikke i Git). Skabelon i `.env.example`.
Samme variabler skal sættes i Vercel under Environment Variables.

## Kategorier
`80's` | `90's` | `Pop` | `Rock` | `Dansk` | `Italo`

## Workflow ved ændringer
1. Rediger kode lokalt
2. Test med `npm run dev`
3. `git add . && git commit -m "beskrivelse" && git push`
4. Vercel deployer automatisk inden for ~30 sekunder
