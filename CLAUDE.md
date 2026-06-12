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
- Zustand — global state (player, valgt kategori, isBuffering, lyttetimer, stationOrder)
- Firebase Firestore — real-time sync via `onSnapshot`
- @dnd-kit/core + @dnd-kit/sortable — drag & drop rækkefølge
- react-hot-toast — notifikationer

## Projektstruktur
```
api/
└── icy-meta.ts                  # Vercel serverless — læser ICY stream-metadata (sangtitel, genre)
src/
├── components/
│   ├── Player.tsx               # Player (20vh) — Now Playing, lyttetimer, volume, ICY-metadata, sleep timer
│   ├── StationCard.tsx          # Stationskort — klik spiller, 2-sek long-press sletter, useSortable DnD
│   ├── StationGrid.tsx          # Grid + DndContext + SortableContext + DragOverlay
│   ├── CategoryFilter.tsx       # Kategoripiller inkl. Favoritter
│   ├── AddStationModal.tsx      # Modal til tilføjelse af station
│   └── DeleteConfirm.tsx        # Bekræftelsesdialog ved sletning
├── store/
│   └── useRadioStore.ts         # Zustand store — sortWithOrder(), reorderCategory(), lyttetimer, sleep timer
├── firebase/
│   ├── config.ts                # Firebase init + IndexedDB offline persistence
│   ├── stationsService.ts       # CRUD + onSnapshot + auto-seed + updateSortOrders (legacy, ubrugt)
│   ├── favoritesService.ts      # subscribe + toggle favoritter per device-ID
│   └── stationOrderService.ts   # subscribe + save rækkefølge per device-ID
├── types/
│   └── index.ts                 # Station (inkl. sortOrder?), Category, CATEGORIES
├── utils/
│   ├── platform.ts              # isIOS — UA-detection
│   └── deviceId.ts              # UUID fra localStorage (favoritter + stationOrder)
├── audio.ts                     # Lazy singleton Audio + iOS keepalive (1 Hz WAV)
├── App.tsx                      # Subscriptions: stations, favorites, stationOrder
└── main.tsx
```

## Audio-arkitektur
`src/audio.ts` eksporterer `getOrCreateAudio()` — opretter `new Audio()` første gang den kaldes (inde i et klik-event). Dette er påkrævet på iOS Safari, som blokerer audio oprettet uden for et user gesture. Alle audio-handlinger (`play`, `pause`, `src`, `volume`) styres direkte fra Zustand-actions — ingen `useEffect`.

**MediaSession API** er implementeret i `useRadioStore.ts`:
- Registrerer WebRadio i OS'et ved første afspilning (lock screen, medietaster, headset-knapper)
- Stationsnavn og logo vises i OS-mediekontroller
- `navigator.mediaSession.setActionHandler` for play/pause/stop
- `artwork` sættes med eksplicitte sizes: stationslogo (256×256) + app-ikoner (192×192, 512×512)

**Sidst afspillede station**: `playStation()` gemmer stationens Firestore-ID i `localStorage` (`webradio_last_station_id`). `setStations()` gendanner ved første load (når `currentStation === null`): sætter stationen som `currentStation` i pauset tilstand og navigerer til dens kategori.

**Resume-adfærd**: Ved pause → resume sættes `audio.src` igen i stedet for blot `audio.play()`. Live streams kan ikke buffere, så reconnect starter fra det aktuelle live-tidspunkt og undgår at en anden app overtager lyden.

**Pause fade-out**: `togglePlay()` fader volume til 0 over 80ms (8 trin × 10ms) inden `audio.pause()` — eliminerer det waveform-klik der opstår ved abrupt afskæring.

**iOS audio session keepalive**: `src/audio.ts` eksporterer `startKeepalive()` — starter et separat `<audio>`-element der looper en **18 Hz sinus-WAV** ved volume 1.0. Kaldes **kun på iOS** (`if (isIOS) startKeepalive()`) — desktop har ikke brug for det og den gamle WAV gav hørbare artefakter. Formål: forhindre iOS i at deaktivere audio-sessionen når streamen pauses.
- **WAV-spec**: 44100 Hz, 16-bit signed PCM, 18 Hz × 18 komplette cyklusser i 44100 samples. Begge loop-endepunkter er præcist 0 → seamless loop uden klik. 44.1 kHz = iOS native sample rate → ingen resampling. Amplitude 100/32767 ≈ −50 dB → uhørbar ved 18 Hz, men iOS klassificerer det som aktiv lyd.
- **Undgå**: 440 Hz (hørbart), PCM-stilhed (iOS suspenderer sessionen), 8 kHz/8-bit (resampling + kvantiseringsstøj).
- MediaSession play-handler kalder `if (isIOS) startKeepalive()` for at genaktivere sessionen fra låseskærm.

**Bluetooth auto-resume**: `devicechange`-eventet i `App.tsx` håndterer AirPods connect/disconnect. To events inden for **10 sekunder** trigger auto-resume (disconnect + reconnect). Vinduet er bevidst kort (10 sek) — AirPods reconnecter på 2-3 sek. Et langt vindue ville fejlagtigt trigge auto-resume ved CarPlay-frakobling (~1 min efter bil slukkes).

**CarPlay**: WebRadio vises i CarPlays "Now Playing"-skærm via MediaSession API (stationsnavn, logo, play/pause via rat). Fuld CarPlay-integration (app-ikon på CarPlay-hjemskærm) kræver en native iOS-app og Apples CarPlay-entitlement — ikke muligt for en web-app.

**Kendt iOS-begrænsning**: AirPods ear detection (automatisk ørengenkendelse) styres på native iOS-niveau via AVAudioSession — web apps kan ikke fuldt ud intercepte dette.

## Firestore collections
- `stations` — felter: `name`, `streamUrl`, `category`, `createdAt`, `logoUrl`, `bitrate`, `country`
  - `sortOrder` felt eksisterer på gamle docs men ignoreres (erstattet af per-device order)
- `favorites/{deviceId}` — felter: `stationIds: string[]`
- `stationOrders/{deviceId}` — felter: `{ [category]: string[] }` — ordnet liste af station-IDs per kategori
- Regler: `allow read, write: if true` (permanent, ingen udløbsdato) på `/{document=**}`
- Auto-seed: 10 stationer indsættes automatisk hvis databasen er tom
- **72 stationer** i databasen pr. juni 2026 — alle har logoer
- **Offline persistence**: aktiveret via `initializeFirestore` + `persistentLocalCache()` i `config.ts` — stationer caches i IndexedDB, appen loader øjeblikkeligt ved genstart

## Kategorier (9)
`70's` | `80's` | `90's` | `Dance` | `Dansk` | `Italo` | `Jul` | `Pop` | `Rock`

Kategorifarver — defineres i `StationCard.tsx`, `CategoryFilter.tsx`, `Player.tsx` og `StationGrid.tsx`:
- 70's: `#A78BFA` (lys lilla)
- 80's: `#F5A623` (amber)
- 90's: `#E8679A` (pink)
- Dance: `#22D3EE` (cyan)
- Dansk: `#4ADE80` (grøn)
- Italo: `#F97316` (orange)
- Jul: `#E8262A` (rød)
- Pop: `#6EC6F5` (lyseblå)
- Rock: `#A855F7` (lilla)

⚠️ Når der tilføjes en ny kategori, skal farven sættes i **alle fire** filer.

## UX-regler
- **Klik** på stationskort → starter afspilning øjeblikkeligt
- **Hold i 2 sek** på stationskort → slet-dialog vises (ingen slet-ikon på kortet)
- **Hold 250ms + bevæg** i kategori-visning → drag & drop reorder
- Play/pause styres kun fra player-baren nederst
- Player viser gul "Forbinder"-indikator mens stream buffererer, rød "Live" + lyttetimer når den spiller
- Stationsnavne bruger dynamisk skriftstørrelse (ingen "..."-afskæring): ≤12 tegn → text-sm, ≤18 → text-xs, længere → 11px
- Stationer vises i device-specifik rækkefølge (drag & drop), fallback til alfabetisk
- Nye radiokanaler tilføjes altid med højeste tilgængelige bitrate
- **`pointer-events: none`** på tekst-container i StationCard — forhindrer iOS 16+ "Kopier/Oversæt/Læs op" callout ved long-press
- **Stationskort-logo**: `w-[55%] object-contain object-right`, opacity 0.4, CSS gradient-maske `linear-gradient(to right, transparent 0%, black 50%)` — viser fuldt logo uden crop og fader venstrekanten ind i kortbaggrunden
- **Stationskort-flag**: ISO 3166-1 alpha-2 kode i `country`-feltet → flag fra `flagcdn.com/w40/{code}.png`, absolut positioneret `bottom-3 left-4 w-[18px]` (flugter med kortets `p-4` padding)
- **Stationskort-equalizer**: live bars absolut positioneret `bottom-3 left-[38px]` (til højre for flaget)
- **Stationskort-bitrate**: vises på egen linje under kategori-badge

## Lyttetimer
Vises i Player row 1 ved siden af "Live"-status (rød farve, tabular-nums):
- Format `MM:SS` når elapsed < 1 time
- Format `TT:MM:SS` når elapsed ≥ 1 time
- Tæller kun aktiv lyttetid (`listenAccumulatedMs` + `listenStartedAt` i store)
- Pauser præcis med lyden, nulstilles ved stationsskift (ikke ved pause/resume)
- `formatListenTime(sec)` funktion i `Player.tsx`

## Drag & drop rækkefølge
- **Kun aktiv** i kategori-specifik visning (ikke "Alle" eller "Favoritter")
- `PointerSensor` med `delay: 250ms, tolerance: 5px` — skelner fra klik og long-press
- `DragOverlay` med klone-kort (let drejet, kategorifarve shadow, `dropAnimation: null`)
- Dragged kort: `opacity: 0` i grid mens DragOverlay vises
- `isDragging` i StationCard annullerer long-press timer + sætter `wasDragged` flag (forhindrer click-after-drag)
- `reorderCategory(category, orderedIds)` i store: optimistisk update + async Firestore write
- Rækkefølge gemmes i `stationOrders/{deviceId}` — påvirker ikke andre enheder
- Nye stationer (ikke i saved order) vises sidst, alfabetisk

## Player (20vh)
På **desktop** (ikke-iOS): tre rækker fordelt med `justify-between`:
1. **Now Playing** (venstre) + sleep timer + Live-status + lyttetimer (højre)
2. **Volume-slider** med speaker-ikoner
3. **Logo** (48×48, afrundet) + stationsinfo + play-knap i kategoriens farve

På **iOS** (isIOS === true): volume-slideren skjules (iOS WebKit gør `audio.volume` read-only). Player bruger `gap-3 py-4` i stedet for fast `h-[20vh]`.

Stationsinfo viser: stationsnavn, kategori-badge (i kategoriens farve), bitrate på egen linje, sangtitel (ICY) og genre (ICY).

## ICY stream-metadata
`api/icy-meta.ts` — Vercel serverless funktion:
- Forbinder til stream-URL med `Icy-MetaData: 1` header
- Læser `icy-metaint` bytes + metadata-blok → parser `StreamTitle` og `icy-genre` header
- Returnerer `{ title, genre }` — `null` hvis streamen ikke understøtter ICY
- **32 ud af 72 stationer** understøtter ICY metadata (DR, SomaFM, RadioMonster, Rock Antenne, 538, laut.fm m.fl.)
- 80s80s- og radio SAW-familierne blokerer server-til-server forbindelser
- Player poller hvert 30. sek når der spiller

## Kendte stream-problemer
- **laut.fm streams** indsætter pre-roll reklamer ved ny tilkobling (platform-level, kan ikke forhindres)
- **80s80s- og radio SAW-familierne** blokerer server-til-server forbindelser (ingen ICY metadata)
- **Big 70s Radio**: stream ændret fra `stream.laut.fm/big-70s` (404) til `stream.laut.fm/radio70`

## Miljøvariabler
Ligger i `.env` (ikke i Git). Skabelon i `.env.example`.
Samme variabler skal sættes i Vercel under Environment Variables.

## App-ikoner og PWA
- `public/app-icon.svg` — kilde-SVG: 512×512, mørk baggrund (#1e0b3d→#0F0F14) + lilla lyn med glow
- `public/apple-touch-icon.png` — 180×180, iPhone hjemskærm
- `public/icons/icon-192.png` og `icon-512.png` — PWA + MediaSession artwork
- `public/manifest.json` — PWA manifest (standalone, theme-color #0F0F14)
- Genskabes med `node generate-icons.mjs` (kræver `sharp` dev-dep)
- `index.html` har `apple-touch-icon`, `manifest`, `theme-color` og `apple-mobile-web-app`-meta

## Logoer
- Alle 72 stationer har `logoUrl` i Firestore
- Logoer hentes fra stationernes egne CDN'er (TuneIn, laut.fm, 80s80s, backend.radiosaw.de, osv.)
- Hostet lokalt i `public/logos/` → serveres via Vercel CDN:
  - `rock-antenne.png`, `retro-radio.png` — PNG-logoer
  - `big-70s-radio.png` — 160×160 kvadratisk version
  - `radiomonster-80s/90s/dance/rock.svg` — custom SVG: pixel-målte fra Tophits-logo (robot + farvet bjælke, x=8-91, y=77-91)
  - `80s80s-*.png` — kanal-specifikke 80s80s-logoer (In The Mix, Party, Maxis)
  - `sky-radio-christmas.png`, `christmas-vinyl-hd.jpg` — Jul-kategori logoer
- Firebase Storage er **ikke** i brug — Storage-regler tillader ikke client-side uploads
- Logo-URL'er administreres via `set-logo.mjs` og opdateres direkte i Firestore
- **Logostandard**: kvadratisk (1:1), ikke-transparent baggrund. Foretrukne kilder: TuneIn CDN (`s{id}q.png`), apple-touch-icon, laut.fm CDN, kanalens eget CDN. Sidst: host lokalt.

## Hjælpescripts (rod-mappen)
- `check-streams.mjs` — checker bitrate og tilgængelighed på alle streams
- `set-logo.mjs` — sætter/opdaterer `logoUrl` på alle stationer i Firestore
- `list-stations.mjs` — lister alle stationer med kategori, stream-URL og logo-URL
- `generate-icons.mjs` — genererer PNG app-ikoner fra `public/app-icon.svg` (kræver sharp)
- `add-new-stations-jun2026.mjs` — tilføjede 3 Dansk + 5 Jul stationer (juni 2026)
- `add-rock-stations-jun2026.mjs` — tilføjede 5 Rock stationer (juni 2026)
- `add-dance-stations-jun2026.mjs` — tilføjede 10 Dance-stationer inkl. ny kategori (juni 2026)
- `set-countries.mjs` — sætter `country` (ISO-kode) på alle stationer i Firestore
- `fix-big70s-stream.mjs` — opdaterede Big 70s Radio stream-URL (juni 2026)

## Workflow ved ændringer
1. Rediger kode lokalt
2. Test med `npm run dev`
3. `git add <filer> && git commit -m "beskrivelse" && git push`
4. Vercel deployer automatisk inden for ~30 sekunder
