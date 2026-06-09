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
│   ├── Player.tsx          # Sticky audio-player (bund), global — play/pause + volumen
│   ├── StationCard.tsx     # Stationskort — klik spiller øjeblikkeligt, ingen play-knap
│   ├── StationGrid.tsx     # 5-kolonne grid (xl:5, lg:4, sm:3, 2 mobil)
│   ├── CategoryFilter.tsx  # Kategoripiller
│   ├── AddStationModal.tsx # Modal til tilføjelse af station
│   └── DeleteConfirm.tsx   # Bekræftelsesdialog ved sletning
├── store/
│   └── useRadioStore.ts    # Zustand store — sorterer stationer alfabetisk ved load
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
- Regler: `allow read, write: if true` (permanent, ingen udløbsdato)
- Auto-seed: 9 stationer indsættes automatisk hvis databasen er tom
- **41 stationer** i databasen pr. juni 2026

## Kategorier (7)
`70's` | `80's` | `90's` | `Pop` | `Rock` | `Dansk` | `Italo`

Kategorifarver i StationCard:
- 70's: `#A78BFA` (lys lilla)
- 80's: `#F5A623` (amber)
- 90's: `#E8679A` (pink)
- Pop: `#6EC6F5` (lyseblå)
- Rock: `#A855F7` (lilla)
- Dansk: `#4ADE80` (grøn)
- Italo: `#F97316` (orange)

## UX-regler
- Klik på et stationskort starter afspilning øjeblikkeligt
- Play/pause styres kun fra player-baren nederst
- Stationer vises alfabetisk inden for hver kategori (dansk sortering)
- Nye radiokanaler tilføjes altid med højeste tilgængelige bitrate

## Miljøvariabler
Ligger i `.env` (ikke i Git). Skabelon i `.env.example`.
Samme variabler skal sættes i Vercel under Environment Variables.

## Hjælpescripts (rod-mappen)
- `check-streams.mjs` — checker bitrate og tilgængelighed på alle streams
- `migrate-stations.mjs` — erstattede 5 døde streams med nye
- `add-new-stations.mjs` — tilføjede 22 stationer fra brugerliste

## Workflow ved ændringer
1. Rediger kode lokalt
2. Test med `npm run dev`
3. `git add . && git commit -m "beskrivelse" && git push`
4. Vercel deployer automatisk inden for ~30 sekunder
