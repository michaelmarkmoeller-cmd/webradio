# WebRadio App – Projektoversigt (juni 2026)

Dette dokument beskriver appens nuværende tilstand. For Claude Code-kontekst, se `CLAUDE.md`.

---

## Hvad er dette

En moderne webradio-app bygget i React + Vite + TypeScript. Afspiller live radiostreams i browseren, organiserer stationer i kategorier og synkroniserer data i realtid via Firebase Firestore på tværs af alle enheder — primært optimeret til iPhone som webapp.

**Live:** https://webradio-chi.vercel.app
**GitHub:** https://github.com/michaelmarkmoeller-cmd/webradio
**Firebase:** webradio-35985 (europe-west1)

---

## Tech stack

| Lag | Valg |
|---|---|
| Frontend | React 18 + Vite + TypeScript |
| Styling | Tailwind CSS v3 — dark theme, accent amber `#F5A623` |
| State | Zustand |
| Database | Firebase Firestore (real-time sync via onSnapshot) |
| DnD | @dnd-kit/core + @dnd-kit/sortable |
| Hosting | Vercel (auto-deploy fra GitHub ved push til main) |

---

## Features

### Player (sticky bund)
- Play/pause, volume-slider (skjult på iOS — read-only i WebKit)
- Animeret equalizer + rød "Live"-indikator
- **Lyttetimer** ved siden af Live: MM:SS under 1 time, TT:MM:SS over 1 time — tæller kun aktiv lyttetid, pauser med lyden, nulstilles ved stationsskift
- **Sleep timer**: måne-ikon, Fra/10/20/30/60 min — nulstilles ved stationsskift
- ICY stream-metadata (sangtitel + genre) — polles hvert 30. sek via Vercel serverless
- Kategorifarve-accent på top-stripe, play-knap og badge

### Stationskort
- **Klik** → afspil øjeblikkeligt
- **Hold 2 sek** → slet-dialog (ingen slet-ikon synligt)
- **Hold 250ms + bevæg** (i kategori-visning) → drag & drop reorder
- Hjerte-ikon → favorit (gemmes i Firestore per device-ID)
- Viser: stationsnavn, kategori-badge, bitrate, logo (fade-baggrundsbillede), landsflag, equalizer-animation når aktiv
- `pointer-events: none` på tekst → forhindrer iOS 16+ "Kopier/Oversæt/Læs op" callout

### Kategorier og filtrering
- 9 kategorier: `70's` | `80's` | `90's` | `Dance` | `Dansk` | `Italo` | `Jul` | `Pop` | `Rock`
- Filterpiller øverst — inkl. **Favoritter** (rød pille med antal)
- Grid: 5 kolonner desktop → 2 mobil

### Drag & drop rækkefølge
- Kun aktiv i kategori-specifik visning (ikke "Alle" / "Favoritter")
- DragOverlay: klone-kort følger cursor (let drejet, kategorifarve-skygge)
- Rækkefølge gemmes **per device-ID** i `stationOrders/{deviceId}` — påvirker ikke andre enheder
- Persisteret på tværs af app-genstarter via Firestore onSnapshot
- Nye stationer vises sidst, alfabetisk

### iOS-optimering
- Audio oprettet inde i klik-event (Safari-krav)
- 1 Hz sinus-WAV keepalive — holder iOS audio-session aktiv ved pause
- MediaSession API: lock screen, headset-knapper, CarPlay "Now Playing"
- Bluetooth auto-resume ved AirPods reconnect (10-sek vindue)
- Volume-slider skjult (iOS WebKit: `audio.volume` read-only)

### PWA
- `public/manifest.json` — standalone, theme-color `#0F0F14`
- Apple touch icon (180×180), PWA-ikoner (192×192, 512×512)
- Offline persistence via IndexedDB (Firestore persistentLocalCache)

---

## Firestore collections

| Collection | Indhold |
|---|---|
| `stations` | `name`, `streamUrl`, `category`, `createdAt`, `logoUrl`, `bitrate`, `country` |
| `favorites/{deviceId}` | `stationIds: string[]` |
| `stationOrders/{deviceId}` | `{ [category]: string[] }` — ordnet liste af IDs per kategori |

Regler: `allow read, write: if true` på `/{document=**}` — permanent, ingen auth.

---

## Projektstruktur

```
webradio/
├── api/
│   └── icy-meta.ts                  # Vercel serverless — ICY metadata
├── src/
│   ├── components/
│   │   ├── Player.tsx               # Sticky player — lyttetimer, sleep timer, ICY
│   │   ├── StationCard.tsx          # Kort — klik/long-press/DnD, hjerte, iOS fixes
│   │   ├── StationGrid.tsx          # DndContext + SortableContext + DragOverlay
│   │   ├── CategoryFilter.tsx       # Filterpiller inkl. Favoritter
│   │   ├── AddStationModal.tsx      # Tilføj station
│   │   └── DeleteConfirm.tsx        # Slet-bekræftelse
│   ├── store/
│   │   └── useRadioStore.ts         # Zustand — sortWithOrder(), reorderCategory(), lyttetimer
│   ├── firebase/
│   │   ├── config.ts                # Firebase init + offline persistence
│   │   ├── stationsService.ts       # CRUD + onSnapshot + auto-seed
│   │   ├── favoritesService.ts      # Favoritter per device
│   │   └── stationOrderService.ts   # Rækkefølge per device
│   ├── types/
│   │   └── index.ts                 # Station, Category, CATEGORIES
│   ├── utils/
│   │   ├── platform.ts              # isIOS
│   │   └── deviceId.ts              # UUID fra localStorage
│   ├── audio.ts                     # Lazy singleton + iOS keepalive
│   ├── App.tsx                      # Subscriptions: stations, favorites, stationOrder
│   └── main.tsx
├── public/
│   ├── manifest.json
│   ├── app-icon.svg
│   ├── apple-touch-icon.png
│   ├── icons/
│   └── logos/                       # Lokalt hostede stationslogoer
├── CLAUDE.md                        # Fuld teknisk dokumentation til Claude Code
├── .env                             # Firebase credentials (ikke i Git)
└── .env.example
```

---

## Hjælpescripts (rod: `E:\AI\WebRadio\webradio\`)

| Script | Formål |
|---|---|
| `list-stations.mjs` | List alle stationer med URL og logo |
| `check-streams.mjs` | Checker bitrate og tilgængelighed |
| `set-logo.mjs` | Opdater logoUrl i Firestore |
| `set-countries.mjs` | Sæt country (ISO-kode) på stationer |
| `generate-icons.mjs` | Generer PNG-ikoner fra app-icon.svg |
| `fix-big70s-stream.mjs` | One-off: rettede Big 70s Radio stream-URL |

---

## Kendte begrænsninger

- **laut.fm streams**: pre-roll reklamer ved ny tilkobling — platform-level, kan ikke forhindres
- **80s80s + Radio SAW**: blokerer server-til-server → ingen ICY metadata
- **iOS**: ingen crossfade, ingen alarm-timer, ingen lydnormalisering (Web Audio API ustabil)
- **CarPlay**: "Now Playing"-skærm virker via MediaSession — fuld app-integration kræver native app

---

## Workflow

```bash
cd E:\AI\WebRadio\webradio
npm run dev          # lokal udvikling
git add <filer>
git commit -m "..."
git push origin main  # → Vercel deployer automatisk (~30 sek)
```
