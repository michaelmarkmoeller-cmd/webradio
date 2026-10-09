# WebRadio — Test Cases

**Projekt:** WebRadio  
**URL:** https://webradio-chi.vercel.app  
**Senest opdateret:** 2026-10-09 (TC-21 hurtigere skift af titel tilføjet)  
**Antal test cases:** 181 fordelt på 21 grupper

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

**Forventet resultat:** Ingen afbrydelse af stream. Lyden fortsætter uafbrudt. Player-tilstand ændres ikke — status bliver "Live" og skifter ikke til "Forbinder" (BUG-18).

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

### TC-05-08: Sangtitel fra netværks-API vises i stedet for ICY
**Forudsætning:** En streamabc-station med kendt nu-spiller-kilde (fx 80s80s Radio, se `src/utils/nowPlaying.ts`)  
**Trin:**
1. Afspil 80s80s Radio

**Forventet resultat:** Player viser "Kunstner - Titel" fra netværkets API (Iris/loverad). Stationsnavnet ("80s80s Digital Web") vises ikke som sangtitel, og `/api/icy-meta` kaldes ikke.

---

### TC-05-09: Forældet nummer fra netværks-API vises ikke
**Forudsætning:** Netværks-API returnerer et nummer der sluttede for mere end 2 min siden  
**Trin:**
1. Afspil 80s80s Radio

**Forventet resultat:** Ingen sangtitel vises (hellere ingen end en forældet, fx under nyheder/reklamer).

---

### TC-05-10: Fejl fra netværks-API
**Forudsætning:** Netværks-API svarer med fejl (fx HTTP 500)  
**Trin:**
1. Afspil 80s80s Radio

**Forventet resultat:** Ingen sangtitel, ingen fejl-toast, afspilningen fortsætter.

---

### TC-05-11: Klassik Radio Christmas bruger streamabc-metadata-API
**Forudsætning:** Julesæson (Jul-kategorien synlig)  
**Trin:**
1. Afspil Klassik Radio Christmas

**Forventet resultat:** "Kunstner - Titel" vises; en semikolon-dublet i API'ets `song`-felt ("Titel;Titel") vises kun én gang.

---

### TC-05-12: Bauer DK-station henter sangtitel via /api/now-playing
**Forudsætning:** En Bauer DK-station (fx Danske 80'er Hits)  
**Trin:**
1. Afspil Danske 80'er Hits

**Forventet resultat:** Player viser "Kunstner - Titel" hentet via `/api/now-playing?station=deh` (proxy til Bauers listenapi, som kun tillader CORS fra radioplay.dk).

---

### TC-05-13: Forældet Bauer-nummer vises ikke
**Forudsætning:** Bauers seneste nummer sluttede for mere end 2 min siden (fx mens værten taler)  
**Trin:**
1. Afspil NOVA

**Forventet resultat:** Ingen sangtitel vises.

---

### TC-05-14: Albumcover vises i player
**Forudsætning:** Netværks-API leverer cover for aktuelt nummer (fx 80s80s Radio)  
**Trin:**
1. Afspil 80s80s Radio

**Forventet resultat:** Albumcoveret vises i player-baren i stedet for stationslogoet (48×48, afrundet).

---

### TC-05-15: Cover der ikke kan indlæses → stationslogo
**Forudsætning:** Cover-URL'en fejler (fx 404)  
**Trin:**
1. Afspil 80s80s Radio

**Forventet resultat:** Stationslogoet vises igen; sangtitlen vises fortsat.

---

### TC-05-16: Låseskærm/CarPlay viser sangtitel, station og cover
**Forudsætning:** En station med sangtitel + cover spiller  
**Trin:**
1. Afspil 80s80s Radio
2. Lås telefonen / se CarPlay "Now Playing" (automatiseret: læs `navigator.mediaSession.metadata`)

**Forventet resultat:** Titel = "Kunstner - Titel", undertitel = stationsnavn, billede = albumcover (stationslogo + app-ikoner som fallback bagved).

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

**Rettet 22-07-2026 (BUG-17, se BUGS.md):** Hold+bevæg-gesten kolliderede med almindeligt scroll i en lang stationsliste (bevægelse blev tolket som reorder-hensigt med det samme, uanset retning). Der kræves nu 300ms stille hold (`REORDER_ARM_DELAY_MS`), før bevægelse tolkes som reorder-drag — bevæger pointeren sig før da, annulleres holdet helt, og browseren scroller normalt.

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
1. Hold finger/mus nede på et stationskort, uden at bevæge, i mindst 300ms (`REORDER_ARM_DELAY_MS`)
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

### TC-09-09: Bevægelse før arm-forsinkelsen tolkes som scroll, ikke reorder (BUG-17)
**Forudsætning:** En specifik kategori er valgt, mindst 2 stationer  
**Trin:**
1. Hold finger/mus nede på et stationskort
2. Bevæg >8px **med det samme** (før de 300ms er gået)

**Forventet resultat:** Holdet annulleres helt — hverken reorder-listen eller slet-dialogen åbner. Svarer til et almindeligt scroll-swipe i en lang liste.

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

*Lydløs pause (TC-17-05..18) tilføjet 23-09-2026. TC-17-05..15 automatiseret i `tests/tc-17b.spec.ts` (iPhone-UA i Chromium, falsk ur, simuleret `visibilityState`); TC-17-16..18 kræver rigtig iPhone.*

### TC-17-05: Pause på iOS skifter til stilhedsløkke i stedet for at stoppe
**Forudsætning:** iPhone, en station spiller  
**Trin:**
1. Tryk Pause i appen

**Forventet resultat:** Player viser Afspil, MediaSession `paused`. Audio-elementet spiller stilhedsløkken (`blob:`-URL, `loop`) — ikke stoppet, ikke muted.

---

### TC-17-06: PLAY under lydløs pause kobler radiostreamen på igen
**Forudsætning:** TC-17-05, 10 sek. efter pause  
**Trin:**
1. Tryk Afspil

**Forventet resultat:** Radiostreamen kobles på igen (nyt `loadstart`), løkken slås fra, MediaSession `playing`.

---

### TC-17-07: Pause i appen stoppes rigtigt efter 20 sek., hvis appen forbliver åben
**Forudsætning:** iPhone, en station spiller  
**Trin:**
1. Tryk Pause og bliv i appen i 21 sek.

**Forventet resultat:** Efter 19 sek. spiller stilhedsløkken stadig; efter 21 sek. rigtigt stoppet (`paused`).

---

### TC-17-08: Låseskærm-pause holder stilhedsløkken i gang i 30 min., derefter rigtigt stop
**Forudsætning:** iPhone, skærm låst, en station spiller  
**Trin:**
1. Tryk Pause på låseskærmen og vent 30 min.

**Forventet resultat:** Stilhedsløkken kører indtil 30 min.; derefter rigtigt stoppet.

---

### TC-17-09: Låseskærm-PLAY efter 2 min. lydløs pause kobler radiostreamen på igen
**Forudsætning:** TC-17-08  
**Trin:**
1. Tryk PLAY på låseskærmen efter 2 min.

**Forventet resultat:** Radiostreamen kobles på igen, MediaSession `playing`.

---

### TC-17-10: Pause i appen → lås inden 20 sek. → lydløs pause fortsætter op til loftet
**Forudsætning:** iPhone, en station spiller  
**Trin:**
1. Pause i appen, lås efter 10 sek., vent 1 min., tryk PLAY på låseskærmen

**Forventet resultat:** Stadig lydløs efter 1 min.; PLAY slår lyden til.

---

### TC-17-11: Åbnes appen under lydløs pause, stoppes streamen 20 sek. senere
**Forudsætning:** TC-17-08, 1 min. inde  
**Trin:**
1. Lås op og åbn appen

**Forventet resultat:** Player viser Afspil (ikke "spiller"); streamen stoppes rigtigt 20 sek. efter.

---

### TC-17-12: PLAY efter loftet kobler streamen på igen som normalt
**Forudsætning:** Lydløs pause udløbet (30 min.)  
**Trin:**
1. Åbn appen og tryk Afspil

**Forventet resultat:** Ny forbindelse (`loadstart`), afspilning som før.

---

### TC-17-13: Stationsskift under lydløs pause giver lyd på den nye station
**Forudsætning:** Lydløs pause aktiv  
**Trin:**
1. Klik en anden station

**Forventet resultat:** Den nye station spiller (ikke stilhedsløkken).

---

### TC-17-14: Søvntimer stopper streamen rigtigt (ingen lydløs pause)
**Forudsætning:** iPhone, søvntimer 10 min.  
**Trin:**
1. Vent til timeren udløber

**Forventet resultat:** Streamen er rigtigt stoppet — ingen stilhedsløkke.

---

### TC-17-15: Pause på pc stopper streamen med det samme
**Forudsætning:** Pc, en station spiller  
**Trin:**
1. Tryk Pause

**Forventet resultat:** Streamen stoppes (fade-out) som hidtil — ingen lydløs pause.

---

### TC-17-16: iPhone: PLAY på låseskærmen efter 1-4 min. pause (manuel)
**Forudsætning:** Rigtig iPhone, skærm slukket  
**Trin:**
1. Pause på låseskærm, vent 1-4 min. (skærm fadet ud), væk skærmen, tryk PLAY

**Forventet resultat:** WebRadio bliver på låseskærmen under pausen (ingen fremmed app/cover); PLAY giver musik igen efter 1-2 sek.

---

### TC-17-17: iPhone: pause i appen → lås → PLAY på låseskærmen efter 1 min. (manuel)
**Forudsætning:** Rigtig iPhone  
**Trin:**
1. Pause i appen, lås inden 20 sek., vent 1 min., tryk PLAY

**Forventet resultat:** Musikken spiller igen med det samme.

---

### TC-17-18: iPhone: AirPods ud/ind med appen åben og med låst skærm (manuel)
**Forudsætning:** Rigtig iPhone + AirPods  
**Trin:**
1. Afspil med AirPods i, lås skærmen
2. Tag AirPods ud, vent ca. 10 sek., sæt dem i igen
3. Tryk PLAY på AirPods (og derefter prøv PLAY på låseskærmen)

**Forventet resultat:** WebRadio bliver på låseskærmen efter AirPods ud (stilhedsløkken genstartes); både headsettets knap og låseskærmens PLAY giver musik igen. Ingen automatisk genstart ved isætning (iOS sender ingen play), og AirPods' "ding" udebliver, mens løkken kører — begge accepteret 24-09-2026.

---

### TC-17-19: Headset ud under afspilning giver rigtigt stop, ikke lydløs pause
**Forudsætning:** En station spiller (simuleret iPhone)
**Trin:**
1. Frakobl en lydenhed (`devicechange` med færre enheder)

**Forventet resultat:** Rigtigt stop (`paused`, ikke stilhedsløkken); "Forbinder" vises ikke.

---
### TC-17-20: Headset ind igen inden 10 sek. genoptager radiostreamen
**Forudsætning:** TC-17-19
**Trin:**
1. Tilkobl enheden igen efter 3 sek.

**Forventet resultat:** Radiostreamen spiller igen, MediaSession `playing`.

---
### TC-17-21: MediaSession-pause fra samme frakobling omdannes til rigtigt stop med streamen klar
**Forudsætning:** En station spiller
**Trin:**
1. MediaSession-pause efterfulgt af `devicechange` (frakobling), derefter tilkobling

**Forventet resultat:** Stilhedsløkken afsluttes, elementet er pauset; tilkobling genoptager radiostreamen.

---
### TC-17-22: "Forbinder" vises ikke under lydløs pause
**Forudsætning:** Lydløs pause aktiv
**Trin:**
1. Audio-elementet sender `waiting`

**Forventet resultat:** Statuslinjen viser ikke "Forbinder".

---

### TC-17-24: iOS stopper stilhedsløkken (AirPods ud) → genstartes én gang
**Forudsætning:** Lydløs pause aktiv, låst skærm (simuleret iPhone)
**Trin:**
1. iOS pauser stilhedsløkken (`pause` på elementet), vent 1,5 sek.
2. iOS pauser den igen, vent 1,5 sek.
3. PLAY på låseskærmen

**Forventet resultat:** Efter trin 1 kører løkken igen; efter trin 2 opgives den (elementet pauset); PLAY kobler radiostreamen på (`playing`).

---
### TC-17-25: Headset-knap under lydløs pause kobler streamen på — dog ikke de første 3 sek.
**Forudsætning:** Lydløs pause aktiv, låst skærm (simuleret iPhone)
**Trin:**
1. MediaSession-pause 1 sek. efter pausen (iOS' egen ekstra pause ved AirPods ud)
2. MediaSession-pause efter yderligere 10 sek. (headsettets knap — iOS sender "pause", fordi løkken spiller)

**Forventet resultat:** Trin 1 ignoreres (stadig lydløs pause); trin 2 kobler radiostreamen på, MediaSession `playing`.

---

## TC-18: Stor afspiller (NowPlayingSheet)

### TC-18-01: Tryk på player-baren åbner den store afspiller
**Forudsætning:** En station spiller  
**Trin:**
1. Tryk på stationsnavnet i player-baren

**Forventet resultat:** Den store afspiller (dialog "Afspiller") vises i fuld skærm og glider helt op (ingen forskydning).

---

### TC-18-02: Knapper i player-baren åbner ikke den store afspiller
**Forudsætning:** En station spiller  
**Trin:**
1. Tryk på søvntimer, Sonos, lydstyrke-slider og pause i player-baren

**Forventet resultat:** Knapperne virker som før (pause → Afspil); den store afspiller åbnes ikke.

---

### TC-18-03: Albumcover vises stort og stationslogo lille
**Forudsætning:** Netværks-API leverer et albumcover (mock)  
**Trin:**
1. Åbn den store afspiller

**Forventet resultat:** Albumcoveret vises stort (> 250 px); stationslogoet vises lille (< 60 px) ved stationsnavnet.

---

### TC-18-04: Uden albumcover vises stationslogoet stort
**Forudsætning:** Netværks-API leverer titel uden cover (mock)  
**Trin:**
1. Åbn den store afspiller

**Forventet resultat:** Intet albumcover; stationslogoet vises én gang og stort (> 250 px).

---

### TC-18-05: Titel og kunstner vises hver for sig
**Forudsætning:** Nu spiller = "TC18 Artist - TC18 Song" (mock)  
**Trin:**
1. Åbn den store afspiller

**Forventet resultat:** Titlen vises med stor skrift, kunstneren under; den samlede streng vises ikke.

---

### TC-18-06: Tryk på albumcoveret lukker — musikken spiller videre
**Forudsætning:** Stor afspiller åben med albumcover  
**Trin:**
1. Tryk på albumcoveret

**Forventet resultat:** Den store afspiller lukker; player-baren viser Pause-knap og Live.

---

### TC-18-07: Tryk på det lille stationslogo lukker — musikken spiller videre
**Forudsætning:** Stor afspiller åben med albumcover  
**Trin:**
1. Tryk på det lille stationslogo

**Forventet resultat:** Den store afspiller lukker; musikken spiller videre.

---

### TC-18-08: Tryk på det store stationslogo (uden cover) lukker
**Forudsætning:** ICY-station spiller (intet cover)  
**Trin:**
1. Åbn den store afspiller, tryk på stationslogoet

**Forventet resultat:** Den store afspiller lukker; musikken spiller videre.

---

### TC-18-09: ⌄-pilen og Escape lukker
**Forudsætning:** Stor afspiller åben  
**Trin:**
1. Tryk på ⌄-pilen
2. Åbn igen, tryk Escape

**Forventet resultat:** Lukker begge gange; musikken spiller videre.

---

### TC-18-10: Swipe ned lukker — kort swipe glider tilbage
**Forudsætning:** iPhone (touch), stor afspiller åben  
**Trin:**
1. Swipe 50 px ned
2. Swipe 250 px ned

**Forventet resultat:** Trin 1: afspilleren glider tilbage og forbliver åben. Trin 2: den lukker; musikken spiller videre.

---

### TC-18-11: Play/pause i den store afspiller styrer afspilningen
**Forudsætning:** Stor afspiller åben, station spiller  
**Trin:**
1. Tryk på pause
2. Tryk på afspil

**Forventet resultat:** Trin 1: status "Pause", player-baren viser Afspil. Trin 2: Live igen, player-baren viser Pause.

---

### TC-18-12: Favorit-hjertet tilføjer og fjerner favorit
**Forudsætning:** Ny browser-kontekst (eget test-device-ID)  
**Trin:**
1. Tryk på hjertet
2. Tryk igen

**Forventet resultat:** Trin 1: hjertet fyldes, og stationskortet viser også favorit. Trin 2: fjernet igen begge steder (test rydder selv op).

---

### TC-18-13: Stream-detaljer for netværks-API-station
**Forudsætning:** 80s80s Radio spiller  
**Trin:**
1. Åbn den store afspiller

**Forventet resultat:** Stream-boksen viser 192 kbps, MP3, Tyskland, "Netværks-API (Loverad/Iris)" og stream-URL'en; kategori-badge og flag vises.

---

### TC-18-14: ICY-station viser ICY som kilde og genre
**Forudsætning:** ICY-station spiller, ICY-titel + genre (mock)  
**Trin:**
1. Åbn den store afspiller

**Forventet resultat:** Kilde = "ICY (streamen)", genre vises, titel vises med stor skrift.

---

### TC-18-15: Søvntimer i den store afspiller følger player-baren
**Forudsætning:** Stor afspiller åben  
**Trin:**
1. Vælg søvntimer 30 min
2. Vælg Fra

**Forventet resultat:** Trin 1: knappen viser 29-30 min, og player-baren viser 29-30m. Trin 2: knappen viser "Søvntimer".

---

### TC-18-16: Sonos-menuen åbner med alle tre rum
**Forudsætning:** Stor afspiller åben  
**Trin:**
1. Tryk på Sonos (intet rum vælges — intet sendes til højttalerne)

**Forventet resultat:** Menuen viser Bad, Køkken og Stue; den store afspiller forbliver åben.

---

### TC-18-17: Volumen-slider vises på pc
**Forudsætning:** Pc, stor afspiller åben  
**Trin:**
1. Sæt lydstyrken til 0,5

**Forventet resultat:** Slideren vises; player-barens slider følger med (0,5).

---

### TC-18-18: Volumen-slider skjult på iOS
**Forudsætning:** iPhone, stor afspiller åben  
**Trin:**
1. Åbn den store afspiller

**Forventet resultat:** Ingen lydstyrke-slider; play/pause vises.

---

### TC-18-19: iPhone: stor afspiller i PWA'en (manuel) — ✅ bekræftet af Michael 07-10-2026
**Forudsætning:** WebRadio installeret på hjemskærmen  
**Trin:**
1. Tryk på player-baren
2. Tjek at ⌄-pilen ikke sidder under statuslinjen
3. Luk med tryk på cover/logo og med swipe ned

**Forventet resultat:** Afspilleren åbner og lukker glat; ⌄-pilen kan trykkes; musikken spiller uafbrudt.

---

## TC-19: Forrige / næste station (store afspiller)

### TC-19-01: NEXT spiller næste station i kategorien
**Forudsætning:** Kategorien Rock er valgt; første station spiller; den store afspiller er åben  
**Trin:**
1. Tryk på næste-knappen (»)

**Forventet resultat:** Stationen nr. 2 i kategoriens rækkefølge spiller; baren viser dens navn; afspilningen kører.

---

### TC-19-02: NEXT på den sidste station spiller den første
**Forudsætning:** Sidste station i Rock spiller; den store afspiller er åben  
**Trin:**
1. Tryk på »

**Forventet resultat:** Den første station i kategorien spiller (wrap-around).

---

### TC-19-03: PREV på den første station spiller den sidste
**Forudsætning:** Første station i Rock spiller; den store afspiller er åben  
**Trin:**
1. Tryk på forrige-knappen («)

**Forventet resultat:** Den sidste station i kategorien spiller (wrap-around).

---

### TC-19-04: PREV spiller forrige station midt i kategorien
**Forudsætning:** Station nr. 3 i Rock spiller  
**Trin:**
1. Tryk på « to gange

**Forventet resultat:** Først station nr. 2, derefter station nr. 1.

---

### TC-19-05: Følger stationens egen kategori, også når "Alle" er valgt
**Forudsætning:** Visningen "Alle"; den sidste Rock-station er startet derfra  
**Trin:**
1. Tryk på »

**Forventet resultat:** Den første Rock-station spilles (wrap inden for Rock) — ikke næste station i "Alle".

---

### TC-19-06: NEXT på en pauset station starter den nye station
**Forudsætning:** En station er pauset i den store afspiller  
**Trin:**
1. Tryk på »

**Forventet resultat:** Næste station starter med det samme; knappen viser Pause.

---

### TC-19-07: PREV/NEXT har samme farve som play/pause og er 20 % mindre
**Forudsætning:** Den store afspiller er åben  
**Trin:**
1. Mål baggrundsfarve og størrelse på «, play/pause og »

**Forventet resultat:** Samme baggrundsfarve; bredde og højde = 80 % af play/pause-knappen (64 px mod 80 px); rækkefølge « · play · ».

---

### TC-19-08: Låseskærm/headset (MediaSession previoustrack/nexttrack) skifter station
**Forudsætning:** En station spiller (første afspilning har registreret MediaSession)  
**Trin:**
1. Kald de registrerede handlere `nexttrack` og `previoustrack`

**Forventet resultat:** Begge handlere er registreret; næste/forrige station i kategorien spilles.

---

### TC-19-09: iPhone: « og » i den store afspiller og på låseskærmen (manuel) — ✅ bekræftet af Michael 08-10-2026
**Forudsætning:** WebRadio installeret på hjemskærmen  
**Trin:**
1. Åbn den store afspiller og tryk « og »
2. Lås skærmen og brug skip-knapperne på låseskærmen

**Forventet resultat:** Stationen skifter i kategoriens rækkefølge, og lyden følger med; knapperne passer på skærmen sammen med søvntimer og Sonos.

---

## TC-20: Albumcover via Apple Music + kilde-tekst

*iTunes Search API, Iris, Bauer og ICY mockes med `page.route` — ingen rigtige opslag.*

### TC-20-01: ICY-station får cover fra Apple Music — kilde står under "Now Playing"
**Forudsætning:** ICY-station spiller; Apple returnerer et match  
**Trin:**
1. Åbn den store afspiller

**Forventet resultat:** Coveret vises stort; teksten "Cover fra Apple Music" står lige under "Now Playing" med samme skriftstørrelse og farve.

---

### TC-20-02: Intet match hos Apple → stationslogo og ingen kilde-tekst
**Forudsætning:** ICY-station; Apple returnerer kun forkerte numre  
**Trin:**
1. Åbn den store afspiller

**Forventet resultat:** Stationslogoet vises; ingen "Cover fra …"-tekst.

---

### TC-20-03: Iris-station — eget Apple-opslag har forrang over Iris' cover
**Forudsætning:** Iris giver et cover; Apple har også et match  
**Trin:**
1. Åbn den store afspiller

**Forventet resultat:** Apples cover vises (ikke Iris'); kilde "Apple Music".

---

### TC-20-04: Iris-station uden Apple-match bruger Iris' cover — kilde "Loverad/Iris"
**Forudsætning:** Iris giver et cover; Apple finder intet  
**Trin:**
1. Åbn den store afspiller

**Forventet resultat:** Iris' cover vises; teksten "Cover fra Loverad/Iris".

---

### TC-20-05: Iris uden cover → Apple Music bruges som fallback
**Forudsætning:** Iris giver kun titel; Apple har et match  
**Trin:**
1. Åbn den store afspiller

**Forventet resultat:** Apples cover vises; kilde "Apple Music".

---

### TC-20-06: Bauer-station viser kilde "Bauer/Radioplay"
**Forudsætning:** NOVA spiller; Bauer-API'et leverer et cover  
**Trin:**
1. Åbn den store afspiller

**Forventet resultat:** Bauers cover vises; teksten "Cover fra Bauer/Radioplay".

---

### TC-20-07: Rangordning — single vinder over album og opsamling
**Forudsætning:** Apple returnerer opsamling, album og single for samme nummer  
**Trin:**
1. Åbn den store afspiller

**Forventet resultat:** Singlens cover vælges.

---

### TC-20-08: Rangordning — album vinder over opsamling
**Forudsætning:** Apple returnerer opsamling og album  
**Trin:**
1. Åbn den store afspiller

**Forventet resultat:** Albummets cover vælges.

---

### TC-20-09: Senere versioner (rework, remix, live, år i titlen) afvises
**Forudsætning:** Radioens titel er "Gazebo - I Like Chopin"; Apple returnerer rework-single, 2020-single, live-album og studiealbum  
**Trin:**
1. Åbn den store afspiller

**Forventet resultat:** Studiealbummets cover vælges; rework, år-version og live afvises.

---

### TC-20-10: Nævner radioens titel selv "Remix", er en remix-version tilladt
**Forudsætning:** Radioens titel indeholder "(Extended Remix)"  
**Trin:**
1. Åbn den store afspiller

**Forventet resultat:** Remix-singlens cover vælges (frem for albummet).

---

### TC-20-11: Søgeordet: "&" → "and" og versionsangivelse i parentes udelades
**Forudsætning:** Radioen sender "Blur - Girls & Boys (Extended Remix)"  
**Trin:**
1. Afvent opslaget

**Forventet resultat:** Søgeordet til Apple er "Blur Girls and Boys".

---

### TC-20-12: "Feat. X" uden parentes og byttet hoved-/gæstekunstner matcher
**Forudsætning:** Radioen sender "Tegan & Sara - Feel It In My Bones Feat. Tiësto"; Apple har "Tiësto — … (feat. Tegan & Sara)"  
**Trin:**
1. Åbn den store afspiller

**Forventet resultat:** Coveret findes.

---

### TC-20-13: Årstal som hale på titlen ("* 1984", "- 1987") ignoreres
**Forudsætning:** Radioen sender "Tony Esposito - Kalimba de luna * 1984"  
**Trin:**
1. Åbn den store afspiller

**Forventet resultat:** Coveret til "Kalimba De Luna" findes.

---

### TC-20-14: DR — "/ " foran kunstneren fjernes, og cover slås op
**Forudsætning:** DR P3 sender "/ Freya Skye - bad taste"  
**Trin:**
1. Se player-baren og den store afspiller

**Forventet resultat:** Titlen vises uden "/ "; coveret findes.

---

### TC-20-15: Småfejl i kunstnerens stavemåde tåles
**Forudsætning:** Radioen sender "Gazilion Zero  - Living In A Bubble"; Apple har "Gazillion Zero"  
**Trin:**
1. Åbn den store afspiller

**Forventet resultat:** Coveret findes.

---

### TC-20-16: Apple-coveret sendes også til låseskærmen (MediaSession)
**Forudsætning:** ICY-station med Apple-cover  
**Trin:**
1. Læs `navigator.mediaSession.metadata.artwork`

**Forventet resultat:** Første artwork er Apple-coveret via `/api/artwork?url=…`.

---

### TC-20-17: Samme nummer slås kun op én gang (cache), også efter flere polls
**Forudsætning:** ICY-station; tre 30 sek.-polls med samme titel (`page.clock`)  
**Trin:**
1. Lad uret løbe 95 sek.

**Forventet resultat:** Kun ét kald til Apple; coveret står stadig i baren (ingen flimren).

---

### TC-20-18: Soundtrack og "Various Artists"-udgivelser vælges ikke frem for studiealbummet
**Forudsætning:** Billy Ocean - Love really hurts without you; Apple returnerer soundtrack (Filth), en Various Artists-opsamling og studiealbummet  
**Trin:**
1. Åbn den store afspiller

**Forventet resultat:** Studiealbummets cover vælges (soundtracks og "Various Artists" tæller som opsamlinger).

---

### TC-20-19: Kunstnerens egen opsamling vælges frem for "Various Artists"-opsamlinger
**Forudsætning:** Apple returnerer kun opsamlinger: Various Artists, soundtrack og kunstnerens egen "The Very Best of …"  
**Trin:**
1. Åbn den store afspiller

**Forventet resultat:** Kunstnerens egen opsamlings cover vælges.

---

### TC-20-20: Blankt hvidt standardcover springes over — næste kandidat vælges
**Forudsætning:** Luv' - Casanova; den bedst rangerede kandidat (EP) har et næsten helt hvidt standardcover (CORS-læsbart), næste er et rigtigt album  
**Trin:**
1. Åbn den store afspiller

**Forventet resultat:** Albummets cover vises; det hvide cover vises ikke.

---

### TC-20-21: Er alle kandidater blanke, vises stationslogoet
**Forudsætning:** Kun én kandidat, og dens cover er næsten helt hvidt  
**Trin:**
1. Åbn den store afspiller

**Forventet resultat:** Stationslogoet vises; ingen "Cover fra …"-tekst.

---

### TC-20-22: Bauer-station — eget Apple-opslag har forrang over Bauers cover
**Forudsætning:** NOVA spiller; Bauer-API'et leverer et cover (opsamling); Apple har et match  
**Trin:**
1. Åbn den store afspiller

**Forventet resultat:** Apples cover vises (ikke Bauers); teksten "Cover fra Apple Music". (Uden Apple-match bruges Bauers cover — TC-20-06.)

---

### TC-20-23: ANR — "TITEL-KUNSTNER" vendes til "Kunstner - Titel", og cover slås op
**Forudsætning:** Radio ANR spiller; ICY sender `OPALITE-TAYLOR SWIFT` (store bogstaver, titel først, ingen mellemrum om bindestregen)  
**Trin:**
1. Se player-baren
2. Åbn den store afspiller

**Forventet resultat:** Baren viser "Taylor Swift - Opalite"; i den store afspiller står "Opalite" som titel og "Taylor Swift" som kunstner; coveret fra Apple Music vises.

---

### TC-20-24: Nummer der kun findes i Apples danske butik får cover (Danmark søges først)
**Forudsætning:** Radio ANR sender `FASCINATION-ALPHABEAT`; nummeret findes kun i Apples danske butik  
**Trin:**
1. Se player-baren
2. Åbn den store afspiller

**Forventet resultat:** Baren viser "Alphabeat - Fascination"; coveret fra den danske butik vises; der er kun ét opslag (`country=dk`) — intet ekstra opslag, når første butik giver et match.

---

### TC-20-25: Findes nummeret ikke i den danske butik, prøves USA
**Forudsætning:** ICY-station; nummeret findes kun i Apples amerikanske butik  
**Trin:**
1. Åbn den store afspiller

**Forventet resultat:** Coveret fra USA-butikken vises; opslagene er `dk` og derefter `us`.

---

### TC-20-26: Radio Nord — "Kunstner, Titel" (komma) bliver til "Kunstner - Titel", og cover slås op
**Forudsætning:** Radio Nord sender `Andreas Odbjerg, Jeg tror jeg elsker dig for evigt`  
**Trin:**
1. Se player-baren
2. Åbn den store afspiller

**Forventet resultat:** Baren viser "Andreas Odbjerg - Jeg tror jeg elsker dig for evigt"; kunstner og titel vises hver for sig; søgeordet til Apple er `Andreas Odbjerg Jeg tror jeg elsker dig for evigt`; coveret vises.

---

### TC-20-27: Hovedkunstnerens egen udgivelse slår en andens EP, hvor kunstneren kun er gæst
**Forudsætning:** Retro Radio sender `Dolly Parton - Jolene`; Apple returnerer Pentatonix' EP "PTX, Vol. IV: Classics" (`Jolene (feat. Dolly Parton)`), opsamlingen "Ultimate Dolly Parton" og albummet "Jolene"  
**Trin:**
1. Åbn den store afspiller

**Forventet resultat:** Albummet "Jolene" vælges; Pentatonix' cover vises ikke (gæste-match er kun reserve; "Ultimate …" tæller som opsamling).

---

### TC-20-28: iPhone: cover på rigtige stationer (manuel) — ✅ bekræftet af Michael 08-10-2026
**Forudsætning:** WebRadio på iPhone; rigtige stationer (80s80s Maxis/Italo Hits, Vinyl Maxi FM, RadioMonster, PartyFM, Italo Disco New Gen, RdMix, DR P3, 1.FM 70s Best, Big 70s Radio m.fl.)  
**Trin:**
1. Åbn den store afspiller på hver station mens et nummer spiller
2. Tjek coveret og teksten "Cover fra …"

**Forventet resultat:** Passende cover vises med korrekt kilde (ikke soundtrack, opsamling eller blankt standardcover, hvis der findes et bedre); numre Apple ikke har (fx DR P3 "Engel") viser stationslogoet.

---

## TC-21: Hurtigere skift af titel og cover

*Poll-ændringer 09-10-2026: ICY 10 sek., Iris/Bauer ved nummerets slutning, hentning ved synlig, behold titel ved tom ICY-blok. Netværk og ICY mockes med `page.route`, tiden styres med `page.clock` (undtagen TC-21-06, der måler den rigtige Bauer-cache mod produktion).*

### TC-21-01: ICY hentes hvert 10. sekund (ikke hvert 30.)
**Forudsætning:** ICY-station spiller; uret køres 35 sek. frem (`page.clock`)  
**Trin:**
1. Kør uret/hændelsen frem som beskrevet

**Forventet resultat:** Mindst tre hentninger på 35 sek. (med 30 sek.-intervallet var det én).

---

### TC-21-02: Nyt ICY-nummer vises inden for 10 sekunder
**Forudsætning:** ICY-station viser nummer A; stationen skifter til nummer B  
**Trin:**
1. Kør uret/hændelsen frem som beskrevet

**Forventet resultat:** Nummer B vises i baren, efter uret er kørt 10,5 sek. frem.

---

### TC-21-03: Tom ICY-blok beholder titel og cover — ryddes først efter ca. et minut
**Forudsætning:** ICY-station viser nummer med cover; stationen begynder at sende tomme blokke  
**Trin:**
1. Kør uret/hændelsen frem som beskrevet

**Forventet resultat:** Efter 25 sek. står titel og cover stadig; efter 75 sek. uden titel er titlen ryddet.

---

### TC-21-04: Iris hentes igen lige efter nummerets slutning (ikke efter fast interval)
**Forudsætning:** Iris-station; nummeret slutter om ca. 12 sek.  
**Trin:**
1. Kør uret/hændelsen frem som beskrevet

**Forventet resultat:** Efter 8 sek. er der kun hentet én gang; efter 16 sek. (sluttid + 2 sek.) er næste nummer hentet og vist.

---

### TC-21-05: Bauer hentes igen lige efter nummerets slutning
**Forudsætning:** NOVA spiller; Bauer oplyser sluttid om 8 sek.  
**Trin:**
1. Kør uret/hændelsen frem som beskrevet

**Forventet resultat:** Efter 4 sek. er der kun hentet én gang; efter 12 sek. er næste nummer hentet og vist.

---

### TC-21-06: Bauer-API caches kun kort (ca. 5 sek.) — ikke længere 15
**Forudsætning:** Produktion; `/api/now-playing?station=nov` kaldes to gange med 6,5 sek. imellem  
**Trin:**
1. Kør uret/hændelsen frem som beskrevet

**Forventet resultat:** Det andet svar er ikke længere et friskt cache-HIT (Vercel viser ikke `s-maxage`, så adfærden måles).

---

### TC-21-07: Titlen hentes straks når appen bliver synlig igen
**Forudsætning:** ICY-station; uret står stille; stationen skifter nummer  
**Trin:**
1. Kør uret/hændelsen frem som beskrevet

**Forventet resultat:** Appen får en `visibilitychange` (synlig).

---

*Sidst opdateret: 2026-10-09 — 181 test cases, 21 grupper (TC-21 hurtigere skift af titel: `tests/tc-21.spec.ts`; manuelle: TC-19-09 og TC-20-28)*
