# WebRadio – Claude Code kontekst

## Samarbejdsregler
- Spørg altid hvis der er tvivl om hvad brugeren mener, eller hvis opgaven kræver yderligere uddybning før den kan løses korrekt.
- **Sessionstart:** Kør altid `git fetch origin` + `git pull origin main` når projektet åbnes — brugeren arbejder på flere PC'er og de lokale filer kan være bagud.

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
- @playwright/test — dev-dep til screenshot-generering af brugervejledning + automatiserede tests (`tests/`)

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
│   ├── ImportExportModal.tsx    # Modal til import/eksport af stationer som JSON
│   └── DeleteConfirm.tsx        # Bekræftelsesdialog ved sletning
├── store/
│   └── useRadioStore.ts         # Zustand store — sortWithOrder(), reorderCategory(), lyttetimer, sleep timer
├── firebase/
│   ├── config.ts                # Firebase init + IndexedDB offline persistence
│   ├── stationsService.ts       # CRUD + onSnapshot + auto-seed + importStations
│   ├── favoritesService.ts      # subscribe + toggle favoritter per device-ID
│   └── stationOrderService.ts   # subscribe + save rækkefølge per device-ID
├── types/
│   └── index.ts                 # Station, Category, CATEGORIES
├── utils/
│   ├── platform.ts              # isIOS — UA-detection
│   ├── deviceId.ts              # UUID fra localStorage (favoritter + stationOrder)
│   └── categoryColors.ts        # CATEGORY_COLORS — fælles farvekort for alle 9 kategorier
├── audio.ts                     # Lazy singleton Audio + iOS keepalive (18 Hz WAV)
├── App.tsx                      # Subscriptions: stations, favorites, stationOrder + device disconnect
└── main.tsx
public/
└── guide/                       # Brugervejledning — HTML + screenshots, serveres på /guide/
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

**Device disconnect → pause**: `devicechange`-eventet i `App.tsx` pauser streamen øjeblikkeligt ved frakobling (CarPlay, AirPods, Bluetooth). `wasPlayingAtDisconnect` gemmes ved frakobling — auto-resume ved reconnect inden **10 sekunder** sker kun hvis APPEN selv pausede (ikke hvis brugeren manuelt pausede inden frakobling). Forhindrer at musik uventet starter ved tilfældig enhedsændring.

**AirPods ear detection**: `useRadioStore.ts` lytter på `pause`-eventet på audio-elementet. Når iOS pauser via ear detection (ikke via vores egen kode), opdateres UI til pauset og `startKeepalive()` kaldes øjeblikkeligt — genstarter keepalive-WAV'en inden iOS fuldt deaktiverer sessionen, så MediaSession forbliver aktiv og næste AirPods-klem virker. `play`-eventet håndterer iOS auto-resume. Guard: `togglePlay()` og `playStation()` sætter begge `isPlaying:false` inden `a.pause()` → interne pauser ignoreres af listeneren.
- **Tab-skift / baggrundsapp**: `pause`-event fyrer på iOS FØR `visibilityState` skifter til `hidden`. Løsning: tjek `visibilityState` igen efter 300ms; er siden stadig skjult springes state-opdatering over. `visibilitychange`-listener reconciler i begge retninger ved retur: `isPlaying:true + a.paused` → opdater til pauset; `isPlaying:false + !a.paused` → opdater til spillende (falsk positiv pause).
- **Brugervejledning**: linket i headeren åbner guiden som in-app iframe-modal (ikke ny tab). Ny tab ville tilføje WebRadio til back-historikken i den nye tab → brugeren lander på en frisk instans ved at trykke tilbage → to parallelle streams. App.tsx modal-header har "Luk ✕"-knap som lukker modalen; guide-HTML sender ingen `postMessage` mere (den sticky nav er fjernet).

**CarPlay**: WebRadio vises i CarPlays "Now Playing"-skærm via MediaSession API (stationsnavn, logo, play/pause via rat). Fuld CarPlay-integration (app-ikon på CarPlay-hjemskærm) kræver en native iOS-app og Apples CarPlay-entitlement — ikke muligt for en web-app.

## Firestore collections
- `stations` — felter: `name`, `streamUrl`, `category`, `createdAt`, `logoUrl`, `bitrate`, `country`
  - `sortOrder` felt eksisterer på gamle docs men ignoreres (erstattet af per-device order)
- `favorites/{deviceId}` — felter: `stationIds: string[]`
- `stationOrders/{deviceId}` — felter: `{ [category]: string[] }` — ordnet liste af station-IDs per kategori
- Regler: `allow read, write: if true` (permanent, ingen udløbsdato) på `/{document=**}`
- Auto-seed: 9 stationer indsættes automatisk hvis databasen er tom
- **80 stationer** i databasen pr. juni 2026 — alle har logoer
- **Offline persistence**: aktiveret via `initializeFirestore` + `persistentLocalCache()` i `config.ts` — stationer caches i IndexedDB, appen loader øjeblikkeligt ved genstart

## Kategorier (9)
`70's` | `80's` | `90's` | `Dance` | `Dansk` | `Italo` | `Jul` | `Pop` | `Rock`

Kategorifarver — defineres **ét sted** i `src/utils/categoryColors.ts` og importeres af alle komponenter:
- 70's: `#A78BFA` (lys lilla)
- 80's: `#F5A623` (amber)
- 90's: `#E8679A` (pink)
- Dance: `#22D3EE` (cyan)
- Dansk: `#4ADE80` (grøn)
- Italo: `#F97316` (orange)
- Jul: `#E8262A` (rød)
- Pop: `#6EC6F5` (lyseblå)
- Rock: `#A855F7` (lilla)

⚠️ Når der tilføjes en ny kategori, opdateres **kun** `src/utils/categoryColors.ts`.

## UX-regler
- **Klik** på stationskort → starter afspilning øjeblikkeligt
- **Hold i 2 sek** på stationskort → slet-dialog vises (ingen slet-ikon på kortet)
- **Hold 250ms + bevæg** i kategori-visning → drag & drop reorder
- Play/pause styres kun fra player-baren nederst
- Player viser gul "Forbinder"-indikator mens stream buffererer, rød "Live" + lyttetimer når den spiller
- Stationsnavne bruger dynamisk skriftstørrelse med `line-clamp-2` sikkerhedsnet: ≤12 tegn → `text-sm`, ≤15 → `text-xs`, ≤22 → `text-[11px]`, længere → `text-[10px]`
- **Stationskort-navnehøjde**: `min-h-[35px]` (fast px, ikke em) sikrer at alle kort i samme række har ens højde uanset navnelængde
- Stationer vises i device-specifik rækkefølge (drag & drop), fallback til alfabetisk
- Nye radiokanaler tilføjes altid med højeste tilgængelige bitrate
- **`pointer-events: none`** på tekst-container i StationCard — forhindrer iOS 16+ "Kopier/Oversæt/Læs op" callout ved long-press
- **Stationskort-logo**: badge `w-11 h-11` absolut positioneret `top-2 left-4`, `rounded-lg`, `bg-black/30`, `object-contain` — kvadratisk thumbnail øverst til venstre. Navn-div: `ml-14` når logo er til stede (giver plads til badge), `pr-7` (giver plads til hjerte-knap)
- **Stationskort-flag**: ISO 3166-1 alpha-2 kode i `country`-feltet → flag fra `flagcdn.com/w40/{code}.png`, vises inline i **kategorirækken** til højre for kategoriteksten (`w-[18px] rounded-sm shrink-0`)
- **Stationskort-equalizer**: live bars inline i bitraterækken efter bitrate-tekst (`h-3`, `w-0.5` bars)
- **Stationskort-padding**: `pt-2 pb-2` (8px top/bund) — minimalt for kompakt kortlayout
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

## Søvntimer
`setSleepTimer(minutes)` i `useRadioStore.ts` — bruger `setTimeout` med præcis resterende tid (ikke polling med `setInterval`). Annulleres ved `clearTimeout` når timeren slukkes eller genstartes. Viser nedtæller i `Player.tsx` via `Math.ceil(remaining / 60_000)` — ingen `Math.max(1,...)` så værdien kan nå 0 inden timeren udløser.

## Brugervejledning
Hostes på `/guide/` (statisk HTML + screenshots i `public/guide/`). Redigeres direkte i `public/guide/index.html`. Opdateres ved at:
1. Køre screenshot-script (kræver `@playwright/test`): `node take-screenshots.mjs`
2. Redigere `public/guide/index.html` direkte (eller via `guide-assets/webradio-guide.html` + copy)
3. Kopiere screenshots: `Copy-Item guide-assets/*.png public/guide/`
4. Genere PDF: `node export-guide-pdf.mjs` → `guide-assets/WebRadio-Brugervejledning.pdf`
Bog-ikonet i app-headeren (`App.tsx`) åbner guiden som iframe-modal. Modalen lukkes med "Luk ✕" i App.tsx-headeren (ikke en knap i guide-HTML'en). Guide-HTML har ingen sticky nav. Guide bruger "Michaels WebRadio"-branding med regnbue-gradient på "Michaels" (identisk med App.tsx). Guide er responsiv (max-width: 820px → `width: 100%`).

## ICY stream-metadata
`api/icy-meta.ts` — Vercel serverless funktion:
- Forbinder til stream-URL med `Icy-MetaData: 1` header
- Læser `icy-metaint` bytes + metadata-blok → parser `StreamTitle` og `icy-genre` header
- Returnerer `{ title, genre }` — `null` hvis streamen ikke understøtter ICY
- **32 ud af 80 stationer** understøtter ICY metadata (DR, SomaFM, RadioMonster, Rock Antenne, 538, laut.fm m.fl.)
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
- Alle 80 stationer har `logoUrl` i Firestore
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

## Kendte fejl

Alle kendte fejl fra kodegennemgang 2026-06-15 er rettet:
- Commit `38e5e28`: SSRF, stale rollback, fade-race, OOM metaint, Firestore batch, streamUrl protokol, blob URL revoke.
- Commit `667b890`: TCP socket, logoUrl validering, seeded remount, Jul-kategori reset, double-fire pointer events.
- Commit `d958adf`: MediaSession stop-rækkefølge, postMessage origin-tjek, keepalive blob URL revoke, stationOrder cast-validering, sleep-timer negativt tal, reorderCategory silent fail, sleep-timer reset ved aktiv station, ICY polling uden support, visibilitychange listenStartedAt, fade-race resume, localStorage try/catch, ICY AbortController, devicechange 150ms guard, stopKeepalive eksport, MediaSession MIME-type, stationsService fejl-håndtering, deviceId private browsing fallback.
- Commit `3ff0822`: Uniform kortstørrelse (`min-h-[35px]` + `line-clamp-2`), nameSize-tærskelværdier strammet, hjerte-ikon synlighed i lys mode (`currentColor` stroke).

**Ingen kendte fejl pr. juni 2026.**

## Test-infrastruktur
- `playwright.config.ts` — Playwright-konfiguration (Chromium, headless, target: live-app)
- `tests/tc-01.spec.ts` — TC-01: app-start + state restore (5 tests)
- `tests/tc-02-to-17.spec.ts` — TC-02 til TC-09 + TC-15/16: store gruppe-tests
- `tests/tc-05.spec.ts` — TC-05: ICY stream-metadata (7 tests, page.route mock)
- `tests/tc-06b.spec.ts` — TC-06: søvntimer (5 tests, page.clock)
- `tests/tc-09.spec.ts` — TC-09: drag & drop (4 pass, 2 skip — headless limitation)
- `tests/tc-10-11.spec.ts` — TC-10/11: slet + tilføj station (10 tests, Firestore REST API)
- `tests/tc-12.spec.ts` — TC-12: import/eksport (8 tests, page.waitForEvent download)
- `tests/tc-rest.spec.ts` — TC-02-06, TC-03-06, TC-04-08, TC-07-03/05/07, TC-08-03, TC-13-02, TC-14, TC-17 (12 tests)
- `tests/db-helper.ts` — Firestore REST API helper til oprettelse/sletning af test-stationer (Node.js-side, undgår browser-side addDoc + IndexedDB konflikt)
- `TEST-CASES.md` — fuld testspecifikation: **86 test cases** fordelt på 17 grupper (4 ikke-automatiserbare fjernet)
- `TEST-REPORT.md` — testrapport: **84/86 godkendt**, 2 ikke testet (TC-09-05/06 kræver visuel drag)
- Kør: `npx playwright test` (kræver netværk til live-appen, 4 workers anbefales på Windows)

## Hjælpescripts (rod-mappen)
- `check-streams.mjs` — checker HTTP-tilgængelighed på alle 80 streams via Firestore (browser-lignende headers)
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
2. Test med `npm run dev` og verificer i browser **inden** push
3. Kør `npx tsc --noEmit` for at tjekke TypeScript
4. `git add <filer> && git commit -m "beskrivelse" && git push`
5. Vercel deployer automatisk inden for ~30 sekunder
