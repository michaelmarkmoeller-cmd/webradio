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
api/
└── icy-meta.ts             # Vercel serverless — læser ICY stream-metadata (sangtitel, genre)
src/
├── components/
│   ├── Player.tsx          # Player (20vh) — Now Playing, volume, stationsinfo, ICY-metadata
│   ├── StationCard.tsx     # Stationskort — klik spiller, 2-sek long-press åbner slet-dialog
│   ├── StationGrid.tsx     # 5-kolonne grid (xl:5, lg:4, sm:3, 2 mobil)
│   ├── CategoryFilter.tsx  # Kategoripiller — CATEGORY_COLORS skal matche StationCard
│   ├── AddStationModal.tsx # Modal til tilføjelse af station
│   └── DeleteConfirm.tsx   # Bekræftelsesdialog ved sletning
├── store/
│   └── useRadioStore.ts    # Zustand store — sorterer alfabetisk, styrer audio direkte
├── firebase/
│   ├── config.ts           # Firebase init + IndexedDB offline persistence
│   └── stationsService.ts  # CRUD + onSnapshot + auto-seed ved tom database
├── types/
│   └── index.ts            # Station, Category, CATEGORIES
├── utils/
│   └── platform.ts         # isIOS — UA-detection (iPad/iPhone/iPod + MacIntel + maxTouchPoints)
├── audio.ts                # Lazy singleton Audio-element + keepalive (iOS-kompatibel)
├── App.tsx
└── main.tsx
```

## Audio-arkitektur
`src/audio.ts` eksporterer `getOrCreateAudio()` — opretter `new Audio()` første gang den kaldes (inde i et klik-event). Dette er påkrævet på iOS Safari, som blokerer audio oprettet uden for et user gesture. Alle audio-handlinger (`play`, `pause`, `src`, `volume`) styres direkte fra Zustand-actions — ingen `useEffect`.

**MediaSession API** er implementeret i `useRadioStore.ts`:
- Registrerer WebRadio i OS'et ved første afspilning (lock screen, medietaster, headset-knapper)
- Stationsnavn og logo vises i OS-mediekontroller
- `navigator.mediaSession.setActionHandler` for play/pause/stop
- `artwork` sættes med eksplicitte sizes: stationslogo (256×256) + app-ikoner (192×192, 512×512)

**Resume-adfærd**: Ved pause → resume sættes `audio.src` igen i stedet for blot `audio.play()`. Live streams kan ikke buffere, så reconnect starter fra det aktuelle live-tidspunkt og undgår at en anden app overtager lyden.

**iOS audio session keepalive**: `src/audio.ts` eksporterer `startKeepalive()` — starter et separat `<audio>`-element der looper en **1 Hz sinus-WAV** ved volume 1.0. Kaldes ved første `playStation()` (user gesture). Formål: forhindre iOS i at deaktivere audio-sessionen når streamen pauses, så WebRadio forbliver "Now Playing"-appen på låseskærmen og via headset-knapper.
- **Hvorfor 1 Hz**: Under menneskelig høretærskel (20 Hz) → fuldstændig uhørbar. Præcist 1 komplet cyklus i 8000 samples → begge endpoints er 128 (silence) i 8-bit → ingen loop-klik. iOS klassificerer det ikke som stilhed.
- **Undgå** 440 Hz (hørbart via høretelefoner, giver loop-klik) og PCM-nul/stilhed (iOS suspenderer sessionen).
- MediaSession play-handler kalder `startKeepalive()` eksplicit for at genaktivere sessionen hvis iOS har suspenderet den mens skærmen var låst.

**Bluetooth auto-resume**: `devicechange`-eventet i `App.tsx` håndterer AirPods connect/disconnect. To events inden for **10 sekunder** trigger auto-resume (disconnect + reconnect). Vinduet er bevidst kort (10 sek) — AirPods reconnecter på 2-3 sek. Et langt vindue ville fejlagtigt trigge auto-resume ved CarPlay-frakobling (~1 min efter bil slukkes).

**CarPlay**: WebRadio vises i CarPlays "Now Playing"-skærm via MediaSession API (stationsnavn, logo, play/pause via rat). Fuld CarPlay-integration (app-ikon på CarPlay-hjemskærm) kræver en native iOS-app og Apples CarPlay-entitlement — ikke muligt for en web-app.

**Kendt iOS-begrænsning**: AirPods ear detection (automatisk ørengenkendelse) styres på native iOS-niveau via AVAudioSession — web apps kan ikke fuldt ud intercepte dette.

## Firestore
- Collection: `stations`
- Felter: `name`, `streamUrl`, `category`, `createdAt`, `logoUrl`, `bitrate`, `country`
- Regler: `allow read, write: if true` (permanent, ingen udløbsdato)
- Auto-seed: 10 stationer indsættes automatisk hvis databasen er tom
- **70 stationer** i databasen pr. juni 2026 — alle har logoer
- **Offline persistence**: aktiveret via `initializeFirestore` + `persistentLocalCache()` i `config.ts` — stationer caches i IndexedDB, appen loader øjeblikkeligt ved genstart

## Kategorier (9)
`70's` | `80's` | `90's` | `Dance` | `Dansk` | `Italo` | `Jul` | `Pop` | `Rock`

Kategorifarver — defineres i **både** `StationCard.tsx`, `CategoryFilter.tsx` og `Player.tsx`:
- 70's: `#A78BFA` (lys lilla)
- 80's: `#F5A623` (amber)
- 90's: `#E8679A` (pink)
- Dance: `#22D3EE` (cyan)
- Dansk: `#4ADE80` (grøn)
- Italo: `#F97316` (orange)
- Jul: `#E8262A` (rød)
- Pop: `#6EC6F5` (lyseblå)
- Rock: `#A855F7` (lilla)

⚠️ Når der tilføjes en ny kategori, skal farven sættes i **begge** filer.

## UX-regler
- **Klik** på stationskort → starter afspilning øjeblikkeligt
- **Hold i 2 sek** på stationskort → slet-dialog vises (ingen slet-ikon på kortet)
- Play/pause styres kun fra player-baren nederst
- Player viser gul "Forbinder"-indikator mens stream buffererer, rød "Live" når den spiller
- Stationsnavne bruger dynamisk skriftstørrelse (ingen "..."-afskæring): ≤12 tegn → text-sm, ≤18 → text-xs, længere → 11px
- Stationer vises alfabetisk inden for hver kategori (dansk sortering)
- Nye radiokanaler tilføjes altid med højeste tilgængelige bitrate
- **Stationskort-logo**: `w-[55%] object-contain object-right`, opacity 0.4, CSS gradient-maske `linear-gradient(to right, transparent 0%, black 50%)` — viser fuldt logo uden crop og fader venstrekanten ind i kortbaggrunden
- **Stationskort-flag**: ISO 3166-1 alpha-2 kode i `country`-feltet → flag fra `flagcdn.com/w40/{code}.png`, absolut positioneret `bottom-3 left-4 w-[18px]` (flugter med kortets `p-4` padding)
- **Stationskort-equalizer**: live bars absolut positioneret `bottom-3 left-[38px]` (til højre for flaget)
- **Stationskort-bitrate**: vises på egen linje under kategori-badge

## Player (20vh)
På **desktop** (ikke-iOS): tre rækker fordelt med `justify-between`:
1. **Now Playing** (venstre) + Live/Forbinder-status (højre) — equalizer-animation når der spiller
2. **Volume-slider** med speaker-ikoner
3. **Logo** (48×48, afrundet) + stationsinfo + play-knap i kategoriens farve

På **iOS** (isIOS === true): volume-slideren skjules (iOS WebKit gør `audio.volume` read-only). Player bruger `gap-3 py-4` i stedet for fast `h-[20vh]`.

Stationsinfo viser: stationsnavn, kategori-badge (i kategoriens farve), bitrate på egen linje, sangtitel (ICY) og genre (ICY).
Farve-accent (top-stripe, play-knap, badge) følger stationens kategorifarve — defineret i `CATEGORY_COLORS` i `Player.tsx`.

## ICY stream-metadata
`api/icy-meta.ts` — Vercel serverless funktion:
- Forbinder til stream-URL med `Icy-MetaData: 1` header
- Læser `icy-metaint` bytes + metadata-blok → parser `StreamTitle` og `icy-genre` header
- Returnerer `{ title, genre }` — `null` hvis streamen ikke understøtter ICY
- **32 ud af 70 stationer** understøtter ICY metadata (DR, SomaFM, RadioMonster, Rock Antenne, 538, laut.fm m.fl.)
- 80s80s- og radio SAW-familierne blokerer server-til-server forbindelser
- Player poller hvert 30. sek når der spiller

## Header
Overskriften i toppen viser "Michaels" med regnbue-gradient (CSS `background-clip: text`) og "WebRadio" nedenunder med amber-accent på "Radio".

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
- Alle 70 stationer har `logoUrl` i Firestore
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

## Workflow ved ændringer
1. Rediger kode lokalt
2. Test med `npm run dev`
3. `git add . && git commit -m "beskrivelse" && git push`
4. Vercel deployer automatisk inden for ~30 sekunder
