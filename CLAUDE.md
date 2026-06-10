# WebRadio – Claude Code kontekst

## Samarbejdsregler
- Spørg altid hvis der er tvivl om hvad brugeren mener, eller hvis opgaven kræver yderligere uddybning før den kan løses korrekt.

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
- Zustand — global state (player, valgt kategori, isBuffering)
- Firebase Firestore — real-time sync via `onSnapshot`
- react-hot-toast — notifikationer

## Projektstruktur
```
src/
├── components/
│   ├── Player.tsx          # Sticky audio-player (bund) — play/pause, volumen, "Forbinder"/"Live" indikator
│   ├── StationCard.tsx     # Stationskort — klik spiller, 2-sek long-press åbner slet-dialog
│   ├── StationGrid.tsx     # 5-kolonne grid (xl:5, lg:4, sm:3, 2 mobil)
│   ├── CategoryFilter.tsx  # Kategoripiller
│   ├── AddStationModal.tsx # Modal til tilføjelse af station
│   └── DeleteConfirm.tsx   # Bekræftelsesdialog ved sletning
├── store/
│   └── useRadioStore.ts    # Zustand store — sorterer alfabetisk, styrer audio direkte
├── firebase/
│   ├── config.ts           # Firebase init via VITE_* env vars
│   └── stationsService.ts  # CRUD + onSnapshot + auto-seed ved tom database
├── types/
│   └── index.ts            # Station, Category, CATEGORIES
├── audio.ts                # Lazy singleton Audio-element (iOS-kompatibel)
├── App.tsx
└── main.tsx
```

## Audio-arkitektur
`src/audio.ts` eksporterer `getOrCreateAudio()` — opretter `new Audio()` første gang den kaldes (inde i et klik-event). Dette er påkrævet på iOS Safari, som blokerer audio oprettet uden for et user gesture. Alle audio-handlinger (`play`, `pause`, `src`, `volume`) styres direkte fra Zustand-actions — ingen `useEffect`.

**MediaSession API** er implementeret i `useRadioStore.ts`:
- Registrerer WebRadio i OS'et ved første afspilning (lock screen, medietaster, headset-knapper)
- Stationsnavn og logo vises i OS-mediekontroller
- `navigator.mediaSession.setActionHandler` for play/pause/stop

**Resume-adfærd**: Ved pause → resume sættes `audio.src` igen i stedet for blot `audio.play()`. Live streams kan ikke buffere, så reconnect starter fra det aktuelle live-tidspunkt og undgår at en anden app overtager lyden.

## Firestore
- Collection: `stations`
- Felter: `name`, `streamUrl`, `category`, `createdAt`, `logoUrl`, `bitrate`
- Regler: `allow read, write: if true` (permanent, ingen udløbsdato)
- Auto-seed: 10 stationer indsættes automatisk hvis databasen er tom
- **51 stationer** i databasen pr. juni 2026 — alle har logoer

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
- **Klik** på stationskort → starter afspilning øjeblikkeligt
- **Hold i 2 sek** på stationskort → slet-dialog vises (ingen slet-ikon på kortet)
- Play/pause styres kun fra player-baren nederst
- Player viser gul "Forbinder"-indikator mens stream buffererer, rød "Live" når den spiller
- Stationsnavne bruger dynamisk skriftstørrelse (ingen "..."-afskæring): ≤12 tegn → text-sm, ≤18 → text-xs, længere → 11px
- Stationer vises alfabetisk inden for hver kategori (dansk sortering)
- Nye radiokanaler tilføjes altid med højeste tilgængelige bitrate

## Miljøvariabler
Ligger i `.env` (ikke i Git). Skabelon i `.env.example`.
Samme variabler skal sættes i Vercel under Environment Variables.

## Logoer
- Alle 51 stationer har `logoUrl` i Firestore
- Logoer hentes fra stationernes egne CDN'er (TuneIn, laut.fm, 80s80s, backend.radiosaw.de, osv.)
- Hostet lokalt i `public/logos/` → serveres via Vercel CDN:
  - `rock-antenne.png`, `retro-radio.png` — PNG-logoer fra kanalernes egne ressourcer
  - `big-70s-radio.png` — 160×160 kvadratisk version (original var 160×85 landscape)
  - `radiomonster-80s/90s/dance/rock.svg` — custom SVG: pixel-målte fra Tophits-logo (robot + farvet bjælke, x=8-91, y=77-91)
- Firebase Storage er **ikke** i brug — Storage-regler tillader ikke client-side uploads
- Logo-URL'er administreres via `set-logo.mjs` og opdateres direkte i Firestore

## Hjælpescripts (rod-mappen)
- `check-streams.mjs` — checker bitrate og tilgængelighed på alle streams
- `migrate-stations.mjs` — erstattede 5 døde streams med nye
- `add-new-stations.mjs` — tilføjede 22 stationer fra brugerliste
- `set-logo.mjs` — sætter/opdaterer `logoUrl` på alle stationer i Firestore

## Workflow ved ændringer
1. Rediger kode lokalt
2. Test med `npm run dev`
3. `git add . && git commit -m "beskrivelse" && git push`
4. Vercel deployer automatisk inden for ~30 sekunder
