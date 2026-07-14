# WebRadio — Test Cases

**Projekt:** WebRadio  
**URL:** https://webradio-chi.vercel.app  
**Senest opdateret:** 2026-07-14 (TC-09 omlagt efter BUG-01, TC-13-02 efter BUG-11)  
**Antal test cases:** 88 fordelt på 17 grupper

---

## TC-01: App-start & State Restore

### TC-01-01: Stationer loader fra Firestore
**Forudsætning:** Appen åbnes i browser med netværksforbindelse  
**Trin:**
1. Åbn https://webradio-chi.vercel.app
2. Vent på at stationslisten loader

**Forventet resultat:** Stationsliste med minimum 60 stationer vises inden for 5 sekunder. Loading-spinner forsvinder.

---

### TC-01-02: Sidst afspillede station gendannes
**Forudsætning:** En station er blevet afspillet tidligere (localStorage indeholder `webradio_last_station_id`)  
**Trin:**
1. Spil en station
2. Luk og genåbn appen (F5 eller ny tab)

**Forventet resultat:** Den sidst afspillede station vises som `currentStation` i pauset tilstand. Ingen automatisk afspilning ved reload.

---

### TC-01-03: Kategori-navigation gendannes
**Forudsætning:** TC-01-02 bestået  
**Trin:**
1. Åbn appen efter at have spillet en station i fx kategorien "Dance"
2. Observer den aktive kategori-pill

**Forventet resultat:** Kategori-pill'en for den gendannede stations kategori er aktiv (markeret).

---

### TC-01-04: Station med ukendt kategori — fallback
**Forudsætning:** Der eksisterer et Firestore-dokument med ukendt `category`-felt (kræver direkte Firebase Console-adgang)  
**Trin:**
1. Opret et testdokument i Firestore `stations`-collection med `category: "TestKategori"`
2. Genindlæs appen
3. Slet testdokumentet efter test

**Forventet resultat:** Stationen vises med `70's` som fallback-kategori. Ingen crash eller console-fejl.

---

### TC-01-05: Firestore-fejl under auto-seed håndteres
**Forudsætning:** Kræver at databasen er tom (meget sjælden tilstand) — kan ikke testes i produktion  
**Trin:** Svær at reproducere manuelt. Verificeres via kodegennemgang af `stationsService.ts`.

**Forventet resultat:** `seedStations()`-fejl routes til `onError`-handler. Ingen unhandled Promise rejection i console.

---

## TC-02: Stationskort — Visuel

### TC-02-01: Korrekte metadata vises
**Forudsætning:** Appen er loaded med stationer  
**Trin:**
1. Find en station der har navn, kategori, bitrate og land (country-felt)
2. Kig på stationskortet

**Forventet resultat:** Kort viser: stationsnavn, kategori-prik i kategoriens farve, kategorinavn, landsflag, bitrate på separat linje.

---

### TC-02-02: Logo badge øverst til venstre
**Forudsætning:** Appen er loaded  
**Trin:**
1. Find en station med `logoUrl`
2. Kig på kortet

**Forventet resultat:** Logo vises som 44×44px badge absolut positioneret øverst til venstre på kortet. Logo er afrundet og har sort/transparent baggrund.

---

### TC-02-03: Dynamisk skriftstørrelse
**Forudsætning:** Appen er loaded  
**Trin:**
1. Find et kort med kort navn (≤12 tegn, fx "DR P3")
2. Find et kort med mellemlangt navn (13-15 tegn, fx "Capital Dance")
3. Find et kort med langt navn (>22 tegn)

**Forventet resultat:**
- ≤12 tegn → `text-sm` (14px)
- 13-15 tegn → `text-xs` (12px)
- 16-22 tegn → `text-[11px]`
- >22 tegn → `text-[10px]`  
Ingen "..."-afskæring på to linjer (kun ved absolut overflow).

---

### TC-02-04: Aktiv station har accentfarvet kant
**Forudsætning:** En station er valgt/spiller  
**Trin:**
1. Spil en station
2. Kig på det aktive stationskort

**Forventet resultat:** Aktivt kort har tyk venstre border i kategoriens accentfarve + glow-effekt. Inaktive kort har transparent/ikke-synlig left-border.

---

### TC-02-05: Equalizer-bars kun ved afspilning
**Forudsætning:** En station spiller  
**Trin:**
1. Spil en station
2. Observer kortets nederste højre hjørne
3. Pause afspilning
4. Observer igen

**Forventet resultat:** Animerede equalizer-bars vises KUN i bund-højre hjørne mens stationen aktivt afspiller. Forsvinder ved pause.

---

### TC-02-06: Bitratefarve
**Forudsætning:** Stationer med forskellig bitrate er synlige  
**Trin:**
1. Find en station med 320 kbps
2. Find en station med 192 kbps
3. Find en station med 128 kbps

**Forventet resultat:**
- ≥320 kbps → grøn prik (`#4ADE80`)
- ≥192 kbps → amber prik (`#F5A623`)
- <192 kbps → rød prik (`#F87171`)

---

### TC-02-07: Alle stationskort i samme række har ens højde
**Forudsætning:** Appen viser stationer i grid-visning  
**Trin:**
1. Kig på en række med mixed navne-længder (korte og lange navne)

**Forventet resultat:** Alle kort i samme række er præcist samme højde. Kategori-rækken og bitrate-rækken er vandret alignet på tværs af kortene.

---

### TC-02-08: Kort navn → 2 linjers navnefelt-plads bevares
**Forudsætning:** Appen er loaded  
**Trin:**
1. Find et kort med et kort navn (fx "DR P3", 5 tegn)
2. Sammenlign kortets totalhøjde med et kort der har et 2-linjes navn

**Forventet resultat:** Kortet med det korte navn er SAMME højde som kortet med 2-linjes navn. Tom plads under den korte tekst udfylder den faste `min-h-[35px]`.

---

### TC-02-09: Meget langt stationsnavn kapper ved 2 linjer
**Forudsætning:** En station med navn >22 tegn eksisterer i databasen  
**Trin:**
1. Find en station med meget langt navn (>22 tegn)
2. Observer navnefeltet på kortet

**Forventet resultat:** Navn vises på præcis 2 linjer. Overskydende tekst afskæres med "...". Kortet sprænger ikke ud af grid-layoutet.

---

## TC-03: Afspilning

### TC-03-01: Klik starter afspilning
**Forudsætning:** Ingen station spiller  
**Trin:**
1. Klik på et stationskort

**Forventet resultat:** Player viser "Forbinder" (gul indikator) → skifter til "Live" (rød) når stream er loadet. Lyd hørbar i højttalere/headset.

---

### TC-03-02: Klik på aktiv station starter ikke forfra
**Forudsætning:** En station spiller  
**Trin:**
1. Klik på det allerede spillende stationskort

**Forventet resultat:** Ingen afbrydelse af stream. Lyden fortsætter uafbrudt. Player-tilstand ændres ikke.

---

### TC-03-03: Stationsskift stopper forrige
**Forudsætning:** Station A spiller  
**Trin:**
1. Klik på Station B (anden station)

**Forventet resultat:** Station A's stream stoppes. Station B's stream starter. Player viser Station B's metadata. Lyttetimer nulstilles.

---

### TC-03-04: Pause → resume reconnect
**Forudsætning:** En station spiller  
**Trin:**
1. Klik Pause-knappen
2. Vent 5-10 sekunder
3. Klik Play-knappen igen

**Forventet resultat:** Stream reconnectes fra live (ikke fra buffereret position). "Forbinder" vises kort, derefter "Live" igen.

---

### TC-03-06: Hurtig pause → play under fade
**Forudsætning:** En station spiller  
**Trin:**
1. Klik Pause
2. Klik Play INDEN for 80ms (hurtigt dobbeltklik)

**Forventet resultat:** Fade-intervallet annulleres. Lyden fortsætter normalt. Ingen tilstand hvor UI viser "spiller" men lyden er faktisk pauset.

---

## TC-04: Player UI

### TC-04-01: Stationsinfo vises korrekt
**Forudsætning:** En station spiller  
**Trin:**
1. Se på player-baren nederst

**Forventet resultat:** Player viser: stationsnavn, kategori-badge i kategoriens farve, bitrate (hvis sat).

---

### TC-04-02: "Forbinder" indikator under buffering
**Forudsætning:** Ingen station spiller  
**Trin:**
1. Klik på en station
2. Observer player row 1 mens stream loader

**Forventet resultat:** Gul pulserende prik + teksten "FORBINDER" vises øverst til højre i player under buffering.

---

### TC-04-03: "Live" indikator ved aktiv afspilning
**Forudsætning:** En station spiller og er færdigbufferet  
**Trin:**
1. Observer player row 1

**Forventet resultat:** Rød pulserende prik + teksten "LIVE" vises. Gul "FORBINDER" er væk.

---

### TC-04-04: Lyttetimer nulstilles ved stationsskift
**Forudsætning:** Station A har spillet i mindst 30 sekunder  
**Trin:**
1. Observer lyttetimeren (vises som "MM:SS" ved siden af "LIVE")
2. Klik på Station B

**Forventet resultat:** Lyttetimeren nulstilles til "00:00" når ny station starter.

---

### TC-04-05: Lyttetimer pauser præcist
**Forudsætning:** En station har spillet i mindst 1 minut  
**Trin:**
1. Note tidspunktet på lyttetimeren
2. Klik Pause
3. Vent 10 sekunder
4. Klik Play
5. Observer lyttetimeren

**Forventet resultat:** Lyttetimeren fryser ved pause. Fortsætter fra frossen tid ved resume (tæller ikke ventetiden med).

---

### TC-04-07: Volume-slider ændrer lydstyrke
**Forudsætning:** En station spiller (ikke iOS)  
**Trin:**
1. Træk volume-slideren til venstre
2. Træk volume-slideren til højre

**Forventet resultat:** Lydstyrken ændres proportionalt med sliderens position. Stationen stopper ikke.

---

### TC-04-08: Volume-slider skjult på iOS
**Forudsætning:** Test udføres på iPhone/iPad i Safari  
**Trin:**
1. Åbn appen
2. Spil en station
3. Observer player-baren

**Forventet resultat:** Volume-slider-rækken (row 2) er ikke synlig. Player har kun 2 synlige rækker.

---

### TC-04-09: Player-logo 48×48
**Forudsætning:** En station med `logoUrl` spiller  
**Trin:**
1. Observer player-baren

**Forventet resultat:** Stationslogoet vises som 48×48px afrundet firkant i player row 3. Logo er synligt og ikke pixeleret.

---

## TC-05: ICY Stream-metadata

### TC-05-01: Sangtitel vises for ICY-station
**Forudsætning:** En station der understøtter ICY-metadata spiller (fx DR P3, SomaFM)  
**Trin:**
1. Spil stationen
2. Vent op til 30 sekunder

**Forventet resultat:** Sangtitel vises under stationsnavnet i player (med musiknote-ikon).

---

### TC-05-02: Genre vises for ICY-station
**Forudsætning:** TC-05-01 bestået  
**Trin:**
1. Observer player mens ICY-station spiller

**Forventet resultat:** Genre vises under sangtitlen (med pause-ikon).

---

### TC-05-03: Ingen polling for ikke-ICY station
**Forudsætning:** En station der IKKE understøtter ICY-metadata (fx 80s80s, Radio SAW)  
**Trin:**
1. Spil stationen
2. Åbn browser DevTools → Network-tab
3. Observer requests til `/api/icy-meta`

**Forventet resultat:** Ét enkelt initial request sendes. Derefter ingen yderligere polling (efter første `null`-svar sættes `icySupportedRef = false`).

---

### TC-05-04: Metadata ryddes ved skift/pause
**Forudsætning:** ICY-metadata vises i player  
**Trin:**
1. Skift til en anden station (eller pause)
2. Observer metadata-felterne i player

**Forventet resultat:** Sangtitel og genre forsvinder fra player.

---

### TC-05-05: Sangtitel med apostrof vises korrekt
**Forudsætning:** En ICY-station spiller en sang med apostrof i titlen (fx "Don't Stop Me Now")  
**Trin:**
1. Observer sangtitel i player

**Forventet resultat:** Komplet titel vises — ikke afkortet ved apostroffen. "Don't Stop Me Now" vises fuldt.

---

### TC-05-06: Tom ICY-blok stopper ikke polling
**Forudsætning:** En ICY-understøttende station spiller  
**Trin:**
1. Observer om polling stoppes selvom `title: null` returneres

**Forventet resultat:** Polling fortsætter hvert 30. sekund selvom et svar returnerer `{title: null, icySupported: true}` (tom metadata-blok).

---

### TC-05-07: ICY fetch afbrydes ved stationsskift
**Forudsætning:** En ICY-station spiller  
**Trin:**
1. Åbn browser DevTools → Network-tab
2. Klik hurtigt på en anden station

**Forventet resultat:** Den igangværende ICY-fetch til den gamle station afbrydes (vises som cancelled/aborted i Network-tab).

---

## TC-06: Søvntimer

### TC-06-01: Sleep-menu åbner med valgmuligheder
**Forudsætning:** En station spiller  
**Trin:**
1. Klik på ur-ikonet i player (øverst til højre)

**Forventet resultat:** Dropdown-menu vises med: Fra / 10 min / 20 min / 30 min / 60 min.

---

### TC-06-02: Timer starter og viser nedtælling
**Forudsætning:** Sleep-menu er åben  
**Trin:**
1. Vælg "10 min"

**Forventet resultat:** Menu lukkes. Ur-ikonet viser "10m" i accentfarve. Nedtælling starter.

---

### TC-06-03: Timer pauser afspilning automatisk
**Forudsætning:** Sleep-timer er sat (sæt til 1 minut for hurtig test — ellers 10 min)  
**Trin:**
1. Sæt sleep-timer
2. Vent til timeren udløber

**Forventet resultat:** Afspilning pauses automatisk. Player viser pauset tilstand.

---

### TC-06-04: "Sov godt" toast ved udløb
**Forudsætning:** TC-06-03  
**Trin:**
1. Observer skærmen når timer udløber

**Forventet resultat:** Toast-besked med 🌙 "Sov godt" vises øverst til højre.

---

### TC-06-05: Timer deaktiveres via "Fra"
**Forudsætning:** Sleep-timer er aktiv (viser "Xm" ved ur-ikon)  
**Trin:**
1. Klik ur-ikonet
2. Vælg "Fra"

**Forventet resultat:** Nedtælling annulleres. "Xm"-teksten forsvinder fra ur-ikonet. Afspilning fortsætter.

---

### TC-06-06: Klik på aktiv station nulstiller ikke timer
**Forudsætning:** Sleep-timer er aktiv og en station spiller  
**Trin:**
1. Note resterende tid (fx "8m")
2. Klik på det allerede spillende stationskort

**Forventet resultat:** Timer fortsætter uændret. Ingen nulstilling af sleep-timer ved klik på aktiv station.

---

### TC-06-07: Ingen stray "0" i det sidste minut
**Forudsætning:** Sleep-timer er sat og har under 1 minut tilbage  
**Trin:**
1. Sæt sleep-timer til korteste interval
2. Vent til der er under 1 minut tilbage
3. Observer ur-ikonet

**Forventet resultat:** Ingen tekststreng "0" vises ved siden af ur-ikonet. Ikonet ser normalt ud.

---

### TC-06-08: Sleep menu aktiv-highlight fjernes ved 0 min
**Forudsætning:** Sleep-timer er sat til 10 min og har under 1 minut tilbage  
**Trin:**
1. Åbn sleep-menu i det sidste minut (resterende < 1 min)

**Forventet resultat:** Ingen af optionerne i menuen er fejlagtigt markeret som aktiv.

---

## TC-07: Favoritter

### TC-07-01: Hjerte-knap tilføjer favorit
**Forudsætning:** Station X er IKKE favorit (tomt hjerte)  
**Trin:**
1. Klik på hjerte-ikonet på et stationskort

**Forventet resultat:** Hjertet fyldes rødt øjeblikkeligt (optimistisk update). Station X tilføjes til favorit-listen.

---

### TC-07-02: Hjerte-knap fjerner favorit
**Forudsætning:** Station X ER favorit (rødt hjerte)  
**Trin:**
1. Klik på det røde hjerte-ikon

**Forventet resultat:** Hjertet tømmes (kontur). Station X fjernes fra favorit-listen.

---

### TC-07-03: Favoritter synkroniseres til Firestore
**Forudsætning:** Adgang til Firebase Console  
**Trin:**
1. Tilføj en station som favorit i appen
2. Åbn Firebase Console → Firestore → `favorites/{deviceId}`

**Forventet resultat:** `stationIds`-arrayet i Firestore indeholder stationens ID.

---

### TC-07-04: Hjerte-knap starter ikke afspilning
**Forudsætning:** Ingen station spiller  
**Trin:**
1. Klik præcist på hjerte-ikonet (IKKE på resten af kortet)

**Forventet resultat:** Favorit-status ændres. Afspilning starter IKKE.

---

### TC-07-05: Korrupt favorites-data krasher ikke
**Forudsætning:** Kræver direkte Firestore-ændring (test via Firebase Console)  
**Trin:**
1. Sæt `stationIds` til et tal (fx `42`) i `favorites/{deviceId}` i Firestore
2. Genindlæs appen

**Forventet resultat:** Favoritter sættes til tom liste `[]`. Ingen crash. Ingen console-fejl. Ret `stationIds` til korrekt array bagefter.

---

### TC-07-06: Hjerte-ikon synligt i lys mode (ikke-favorit)
**Forudsætning:** Appen er i lys mode (klik sol-ikonet i header)  
**Trin:**
1. Skift til lys mode
2. Find et stationskort der IKKE er favorit

**Forventet resultat:** Hjerte-kontur (tomt hjerte) er tydeligt synlig — grå kontur på lys baggrund. Ikke usynlig.

---

### TC-07-07: Hjerte-ikon synligt i mørk mode (ikke-favorit)
**Forudsætning:** Appen er i mørk mode (default)  
**Trin:**
1. Find et stationskort der IKKE er favorit

**Forventet resultat:** Hjerte-kontur (tomt hjerte) er synlig som lys grå kontur på mørk baggrund.

---

## TC-08: Kategori-filter

### TC-08-01: "Alle" viser alle stationer
**Forudsætning:** En kategori er aktiv (ikke "Alle")  
**Trin:**
1. Klik "Alle"-pill'en

**Forventet resultat:** Grid viser samtlige stationer fra Firestore (alle kategorier blandet).

---

### TC-08-02: Kategori-pill filtrerer korrekt
**Forudsætning:** Appen viser "Alle"  
**Trin:**
1. Klik fx "80's"-pill'en

**Forventet resultat:** Kun stationer med kategori "80's" vises. Ingen stationer fra andre kategorier.

---

### TC-08-03: Alle 9 kategorier vises med korrekte farver
**Forudsætning:** Det er ikke juleseson (Dec-Jan) — ellers 9 kategorier inkl. Jul  
**Trin:**
1. Observer kategori-filter-rækken

**Forventet resultat:** Alle aktive kategorier vises som pills med korrekte accentfarver (jf. `categoryColors.ts`):
- 70's: lilla, 80's: amber, 90's: pink, Dance: cyan, Dansk: grøn, Italo: orange, Pop: lyseblå, Rock: lilla.

---

### TC-08-04: Favoritter-pill vises altid
**Forudsætning:** Ingen  
**Trin:**
1. Klik igennem alle kategori-pills

**Forventet resultat:** Favoritter-pill (hjerte-ikon) er synlig uanset aktiv kategori.

---

## TC-09: Rediger rækkefølge

**Omlagt 14-07-2026 (BUG-01, se BUGS.md):** Whole-card dnd-kit-drag direkte i gridet blev erstattet af en dedikeret "rediger rækkefølge"-liste (`ReorderListModal.tsx`). Grid-kortet har ikke længere dnd-kit — kun klik (afspil), stille 2-sek. hold (slet), og hold+bevæg >8px (åbner reorder-listen). Selve trækket sker i listen via et håndtag-ikon med bevægelses-baseret aktivering (`distance: 4`), ikke den gamle forsinkelses-baserede (`delay: 250ms`) mekanisme.

### TC-09-01: Kategori-visning har cursor-grab
**Forudsætning:** En specifik kategori er valgt (ikke "Alle" eller "Favoritter")  
**Trin:**
1. Observer et stationskort

**Forventet resultat:** Kortet har `cursor-grab` — visuelt hint om at hold+bevæg åbner reorder-listen.

---

### TC-09-02: "Alle"-visning: hold+bevæg åbner ikke reorder-listen
**Forudsætning:** "Alle"-visning er aktiv  
**Trin:**
1. Hold finger/mus nede på et stationskort
2. Bevæg >8px mens pointeren er nede

**Forventet resultat:** `cursor-pointer` (ikke `cursor-grab`). Ingen reorder-liste åbner.

---

### TC-09-03: "Favoritter"-visning: hold+bevæg åbner ikke reorder-listen
**Forudsætning:** "Favoritter"-visning er aktiv  
**Trin:**
1. Hold finger/mus nede på et stationskort
2. Bevæg >8px mens pointeren er nede

**Forventet resultat:** Samme som TC-09-02.

---

### TC-09-04: Stille hold (2 sek) viser slet-dialog, ikke reorder-listen
**Forudsætning:** En specifik kategori er valgt  
**Trin:**
1. Hold finger/mus nede på et stationskort i 2 sekunder **uden at bevæge**

**Forventet resultat:** Slet-bekræftelses-dialog vises. Reorder-listen åbner ikke.

---

### TC-09-05: Hold + bevæg åbner reorder-listen, ikke slet-dialogen
**Forudsætning:** En specifik kategori er valgt  
**Trin:**
1. Hold finger/mus nede på et stationskort
2. Bevæg >8px mens pointeren er nede (før 2-sek.-grænsen nås)

**Forventet resultat:** "Rediger rækkefølge"-modalen åbner for den aktuelle kategori. Slet-dialogen vises ikke.

---

### TC-09-06: Klik afspiller stadig station
**Forudsætning:** En specifik kategori er valgt  
**Trin:**
1. Klik (uden bevægelse) på et stationskort

**Forventet resultat:** Stationen begynder at spille — ingen gestus-konflikt med hold/hold+bevæg.

---

### TC-09-07: Træk i håndtag ændrer rækkefølgen
**Forudsætning:** Reorder-listen er åben (via TC-09-05), mindst 3 stationer i kategorien  
**Trin:**
1. Træk håndtag-ikonet (⋮⋮) for én række til en anden position i listen

**Forventet resultat:** Rækkernes rækkefølge i modalen opdateres til at matche den nye placering.

---

### TC-09-08: Ny rækkefølge persisteret efter reload
**Forudsætning:** TC-09-07 udført, modal lukket via "Færdig"  
**Trin:**
1. Genindlæs appen
2. Naviger til samme kategori

**Forventet resultat:** Den nye rækkefølge er bevaret — gemt i `stationOrders/{deviceId}` i Firestore.

---

## TC-10: Slet Station

### TC-10-01: Hold 2 sek → slet-dialog vises
**Forudsætning:** Appen viser stationskort  
**Trin:**
1. Hold finger/mus nede på et stationskort i præcis 2 sekunder

**Forventet resultat:** DeleteConfirm-dialog åbner med stationens navn og knapperne "Slet" / "Annuller".

---

### TC-10-02: Bekræft sletning → fjernet fra liste
**Forudsætning:** TC-10-01 — slet-dialog er åben  
**Trin:**
1. Klik "Slet"-knappen

**Forventet resultat:** Station forsvinder fra grid øjeblikkeligt. Toast viser `"[stationsnavn]" slettet`. Station fjernes fra Firestore.

---

### TC-10-03: Annuller sletning → ingen ændring
**Forudsætning:** TC-10-01 — slet-dialog er åben  
**Trin:**
1. Klik "Annuller"-knappen

**Forventet resultat:** Dialog lukkes. Stationen forbliver i listen. Ingen Firestore-ændring.

---

### TC-10-04: Kort klik → ingen slet-dialog
**Forudsætning:** Ingen station spiller  
**Trin:**
1. Klik hurtigt (< 500ms) på et stationskort

**Forventet resultat:** Stationen starter afspilning. Ingen slet-dialog vises.

---

### TC-10-05: Long-press på kort der unmountes krasher ikke
**Forudsætning:** En kategori med stationer er valgt  
**Trin:**
1. Begynd at holde nede på et stationskort (start long-press timer)
2. Skift til en anden kategori INDEN 2 sekunder er gået

**Forventet resultat:** Ingen fejl i console. Ingen slet-dialog vises for en umounted komponent.

---

## TC-11: Tilføj Station

### TC-11-01: Modal åbnes via +-knap
**Forudsætning:** Ingen  
**Trin:**
1. Klik "Tilføj station"-knappen i headeren

**Forventet resultat:** AddStationModal åbner med felterne: Stationsnavn, Stream URL, Kategori, Bitrate, Land.

---

### TC-11-02: Tom form kan ikke submittes
**Forudsætning:** AddStationModal er åben  
**Trin:**
1. Lad felterne stå tomme
2. Observer "Tilføj station"-knappen

**Forventet resultat:** Submit-knappen er disabled (grå). Formularen kan ikke sendes uden navn og URL.

---

### TC-11-03: Ny station gemmes i Firestore
**Forudsætning:** AddStationModal er åben  
**Trin:**
1. Udfyld: Navn = "TEST Station", URL = "https://ice5.somafm.com/poptron-128-mp3", Kategori = Pop
2. Klik "Tilføj station"
3. Slet teststationen bagefter

**Forventet resultat:** Modal lukkes. Toast viser `"TEST Station" tilføjet`. Station vises i grid under Pop.

---

### TC-11-04: Modal lukkes med X eller klik udenfor
**Forudsætning:** AddStationModal er åben  
**Trin:**
1. Klik X-knappen i modal-headeren
2. (Eller klik på baggrunden uden for modalen)

**Forventet resultat:** Modal lukkes. Ingen data gemmes.

---

### TC-11-05: Ugyldig protokol i streamUrl afvises
**Forudsætning:** AddStationModal er åben  
**Trin:**
1. Udfyld Navn = "TEST"
2. Udfyld Stream URL = `ftp://radio.example.com/stream`
3. Klik "Tilføj station"

**Forventet resultat:** Toast-fejl: "Stream URL skal starte med http:// eller https://". Station gemmes IKKE i Firestore.

---

## TC-12: Import / Eksport

### TC-12-01: Eksport henter alle stationer
**Forudsætning:** Appen er loaded med stationer  
**Trin:**
1. Klik import/eksport-ikonet i headeren
2. Klik "Download JSON-fil"

**Forventet resultat:** JSON-fil downloades med alle stationer. Filnavn: `webradio-stationer-YYYY-MM-DD.json`. Toast viser antal eksporterede stationer.

---

### TC-12-02: Eksporteret fil har korrekt format
**Forudsætning:** TC-12-01 — fil er downloadet  
**Trin:**
1. Åbn den downloadede JSON-fil

**Forventet resultat:** Filen indeholder: `exportedAt` (ISO timestamp), `count` (antal), `stations` (array med name/streamUrl/category per station).

---

### TC-12-03: Import parser gyldig JSON
**Forudsætning:** En gyldig JSON-fil med korrekt format eksisterer (brug eksporteret fil)  
**Trin:**
1. Åbn Import-tab i Import/Eksport-modal
2. Upload den gyldige JSON-fil

**Forventet resultat:** Preview-tabel vises med grønne "✓ OK" på gyldige stationer.

---

### TC-12-04: Import afviser manglende navn
**Forudsætning:** En JSON-fil med en station uden `name`-felt  
**Trin:**
1. Upload filen via Import-tab

**Forventet resultat:** Stationen markeres med rød "✗ Mangler navn" i preview-tabellen.

---

### TC-12-05: Import afviser ugyldig URL
**Forudsætning:** En JSON-fil med en station med `streamUrl: "javascript:alert(1)"` eller `file:///etc`  
**Trin:**
1. Upload filen

**Forventet resultat:** Stationen markeres med rød "✗ Ugyldig URL (kun http/https)".

---

### TC-12-06: Import afviser ukendt kategori
**Forudsætning:** En JSON-fil med en station med `category: "Ukendt"`  
**Trin:**
1. Upload filen

**Forventet resultat:** Stationen markeres med rød `"✗ Ukendt kategori: "Ukendt""`.

---

### TC-12-07: Import springer eksisterende stationer over
**Forudsætning:** En JSON-fil der indeholder en station med samme `streamUrl` som en eksisterende station  
**Trin:**
1. Upload filen
2. Klik "Importér"

**Forventet resultat:** Toast viser "X stationer importeret · Y sprunget over (findes allerede)". Ingen duplikater oprettes i Firestore.

---

### TC-12-08: Import afviser logoUrl uden https://
**Forudsætning:** En JSON-fil med en station med `logoUrl: "http://example.com/logo.png"`  
**Trin:**
1. Upload filen
2. Observer preview

**Forventet resultat:** Stationen er valid (grøn ✓), men importeres UDEN `logoUrl`-feltet (kun https:// accepteres).

---

## TC-13: Brugervejledning

### TC-13-01: Guide åbner som in-app iframe-modal
**Forudsætning:** Ingen  
**Trin:**
1. Klik bog-ikonet i headeren

**Forventet resultat:** Brugervejledningen åbner som en in-app fullscreen iframe-modal OVEN PÅ appen. Ingen ny browser-tab åbnes.

---

### TC-13-02: "Luk ✕"-knap lukker modalen
**Forudsætning:** Guide-modal er åben  
**Trin:**
1. Klik "Luk ✕"-knappen i App.tsx's modal-header (øverst i selve WebRadio-appen, ikke i guide-siden)

**Forventet resultat:** Guide-modalen lukkes. Appen vises igen. Ingen ny browsertab. Afspilning (hvis aktiv) forstyrres ikke.

*(Rettet 14-07-2026, BUG-11: guide-HTML har ikke haft en "Tilbage til WebRadio"-postMessage-mekanisme siden den sticky nav blev fjernet — luk sker udelukkende via "Luk ✕"-knappen i selve appen.)*

---

## TC-14: PWA & Offline

### TC-14-01: PWA manifest og install-prompt
**Forudsætning:** Chrome/Edge desktop browser  
**Trin:**
1. Åbn appen
2. Observer adresselinjen for install-ikon

**Forventet resultat:** Browser viser install-prompt. `manifest.json` er tilgængelig på `/manifest.json`. `apple-touch-icon` er tilgængelig på `/apple-touch-icon.png`.

---

### TC-14-02: Stationer loader fra IndexedDB offline
**Forudsætning:** Appen er besøgt mindst én gang med netværk  
**Trin:**
1. Åbn DevTools → Network → sæt til "Offline"
2. Genindlæs appen (F5)

**Forventet resultat:** Stationer vises fra Firestore offline cache (IndexedDB). Appen er funktionel uden netværk (afspilning virker ikke, men listen vises).

---

## TC-15: Build & TypeScript

### TC-15-01: TypeScript checker uden fejl
**Forudsætning:** Node.js og projekt-afhængigheder er installeret  
**Trin:**
1. Kør `npx tsc --noEmit` i projektets rodmappe

**Forventet resultat:** Kommandoen returnerer exit code 0. Ingen TypeScript-fejl eller advarsler outputtes.

---

### TC-15-02: Build kompilerer uden fejl
**Forudsætning:** TC-15-01 bestået  
**Trin:**
1. Kør `npm run build`

**Forventet resultat:** Build fuldføres uden fejl. `dist/`-mappen oprettes med alle assets.

---

## TC-16: Stream-tilgængelighed

### TC-16-01: Alle streams er tilgængelige
**Forudsætning:** Node.js og Firebase-konfiguration (`.env`) er tilgængelig. Netværksforbindelse kræves.  
**Trin:**
1. Kør `node check-streams.mjs` i projektets rodmappe
2. Observer output for fejl

**Forventet resultat:** Alle streams returnerer HTTP 200 med valid audio-stream. Stationer der fejler listes separat. Mål: 0 fejlede streams.

---

## TC-17: iOS & Edge Cases

### TC-17-01: iOS private browsing — afspilning virker
**Forudsætning:** iPhone/iPad med Safari i privat tilstand  
**Trin:**
1. Åbn Safari i privat tilstand
2. Gå til https://webradio-chi.vercel.app
3. Klik en station

**Forventet resultat:** Afspilning starter normalt. Ingen crash. Sidst afspillede station gemmes ikke (localStorage utilgængelig), men session-ID genereres og favoritter fungerer i sessionen.

---

### TC-17-04: MediaSession artwork MIME-type korrekt
**Forudsætning:** En station med SVG- eller WebP-logo spiller  
**Trin:**
1. Spil en station med SVG-logo (fx RadioMonster-stationer)
2. Observer OS-mediekontroller (lock screen, Control Center)

**Forventet resultat:** Stationslogo vises korrekt i OS-mediekontroller. Ingen broken image. (Internt: `image/svg+xml` sættes som MIME-type i `MediaMetadata`.)

---

*Sidst opdateret: 2026-06-15 — 86 test cases, 17 grupper*
