# WebRadio — Test Rapport

**Projekt:** WebRadio  
**URL:** https://webradio-chi.vercel.app  
**Rapport oprettet:** 2026-06-15  
**Tester:** —  
**Git branch:** main  
**Antal test cases:** 86

---

## Samlet status

| Godkendt | Fejlet | Ikke testet | I alt |
|----------|--------|-------------|-------|
| 38 | 0 | 48 | 86 |

---

## TC-01: App-start & State Restore

| TC# | Titel | Status | Beskrivelse | Dato |
|-----|-------|--------|-------------|------|
| TC-01-01 | Stationer loader fra Firestore | 🟢 Godkendt | Stationsliste vises inden for 5 sek ved app-åbning | 15-06-2026 |
| TC-01-02 | Sidst afspillede station gendannes | 🟢 Godkendt | `webradio_last_station_id` gendannes som pauset currentStation | 15-06-2026 |
| TC-01-03 | Kategori-navigation gendannes | 🟢 Godkendt | Aktiv kategori-pill matcher gendannet stations kategori | 15-06-2026 |
| TC-01-04 | Station med ukendt kategori — fallback | 🟢 Godkendt | `stationsService.ts:50` — fallback til `CATEGORIES[0]` = `70's` bekræftet via kodeinspeksion | 15-06-2026 |
| TC-01-05 | Firestore-fejl under auto-seed håndteres | 🟢 Godkendt | `stationsService.ts:61` — `seedStations().catch(onError)` bekræftet via kodeinspeksion | 15-06-2026 |

**Resultat: 5/5 godkendt**

---

## TC-02: Stationskort — Visuel

| TC# | Titel | Status | Beskrivelse | Dato |
|-----|-------|--------|-------------|------|
| TC-02-01 | Korrekte metadata vises | 🟢 Godkendt | Navn, kategori-farve, landsflag og bitrate vises på kortet | 15-06-2026 |
| TC-02-02 | Logo badge øverst til venstre | 🟢 Godkendt | `logoUrl` vises som 44×44px badge absolut øverst til venstre | 15-06-2026 |
| TC-02-03 | Dynamisk skriftstørrelse | 🟢 Godkendt | Navnestørrelse skalerer korrekt efter nameSize()-funktion | 15-06-2026 |
| TC-02-04 | Aktiv station har accentfarvet kant | 🟢 Godkendt | Aktivt kort har left-border i kategoriens farve + glow | 15-06-2026 |
| TC-02-05 | Equalizer-bars kun ved afspilning | 🟢 Godkendt | Animerede bars vises kun ved aktiv afspilning | 15-06-2026 |
| TC-02-06 | Bitratefarve | 🟡 Ikke testet | Bitratefarve: grøn ≥320, amber ≥192, rød <192 kbps | — |
| TC-02-07 | Alle stationskort i samme række har ens højde | 🟢 Godkendt | Alle kort i én grid-række er præcis samme højde | 15-06-2026 |
| TC-02-08 | Kort navn → 2 linjers navnefelt-plads bevares | 🟢 Godkendt | Kort navn fylder `min-h-[35px]` — blank plads under | 15-06-2026 |
| TC-02-09 | Meget langt stationsnavn kapper ved 2 linjer | 🟢 Godkendt | Navne >22 tegn kapper med "..." — aldrig 3 linjer | 15-06-2026 |

**Resultat: 8/9 godkendt**

---

## TC-03: Afspilning

| TC# | Titel | Status | Beskrivelse | Dato |
|-----|-------|--------|-------------|------|
| TC-03-01 | Klik starter afspilning | 🟢 Godkendt | Klik på stationskort → "Forbinder" → "Live" + lyd | 15-06-2026 |
| TC-03-02 | Klik på aktiv station starter ikke forfra | 🟢 Godkendt | Klik på spillende station afbryder ikke streamen | 15-06-2026 |
| TC-03-03 | Stationsskift stopper forrige | 🟢 Godkendt | Klik på anden station stopper A og starter B | 15-06-2026 |
| TC-03-04 | Pause → resume reconnect | 🟢 Godkendt | Resume reconnectes fra live — ikke fra buffereret position | 15-06-2026 |
| TC-03-06 | Hurtig pause → play under fade | 🟡 Ikke testet | Fade-interval annulleres ved hurtig resume — ingen race | — |

**Resultat: 4/5 godkendt**

---

## TC-04: Player UI

| TC# | Titel | Status | Beskrivelse | Dato |
|-----|-------|--------|-------------|------|
| TC-04-01 | Stationsinfo vises korrekt | 🟢 Godkendt | Player viser navn, kategori-badge og bitrate | 15-06-2026 |
| TC-04-02 | "Forbinder" indikator under buffering | 🟢 Godkendt | Gul pulserende prik + "FORBINDER" vises ved stream-load | 15-06-2026 |
| TC-04-03 | "Live" indikator ved aktiv afspilning | 🟢 Godkendt | Rød prik + "LIVE" vises når stream er aktiv | 15-06-2026 |
| TC-04-04 | Lyttetimer nulstilles ved stationsskift | 🟢 Godkendt | Lyttetimer nulstilles til 00:00 ved stationsskift | 15-06-2026 |
| TC-04-05 | Lyttetimer pauser præcist | 🟢 Godkendt | Lyttetimer fryser ved pause og fortsætter fra frossen tid | 15-06-2026 |
| TC-04-07 | Volume-slider ændrer lydstyrke | 🟢 Godkendt | Slider ændrer `audio.volume` proportionalt | 15-06-2026 |
| TC-04-08 | Volume-slider skjult på iOS | 🟡 Ikke testet | Volume-rækken ikke synlig i iOS Safari | — |
| TC-04-09 | Player-logo 48×48 | 🟢 Godkendt | Stationslogo vises som 48×48px afrundet firkant i player | 15-06-2026 |

**Resultat: 7/8 godkendt**

---

## TC-05: ICY Stream-metadata

| TC# | Titel | Status | Beskrivelse | Dato |
|-----|-------|--------|-------------|------|
| TC-05-01 | Sangtitel vises for ICY-station | 🟡 Ikke testet | Sangtitel vises i player inden for 30 sek for ICY-station | — |
| TC-05-02 | Genre vises for ICY-station | 🟡 Ikke testet | Genre vises under sangtitel i player | — |
| TC-05-03 | Ingen polling for ikke-ICY station | 🟡 Ikke testet | Kun ét initial request til `/api/icy-meta` for ikke-ICY station | — |
| TC-05-04 | Metadata ryddes ved skift/pause | 🟡 Ikke testet | Sangtitel og genre forsvinder ved stationsskift/pause | — |
| TC-05-05 | Sangtitel med apostrof vises korrekt | 🟡 Ikke testet | Apostrof i sangtitel afkorter ikke titlen | — |
| TC-05-06 | Tom ICY-blok stopper ikke polling | 🟡 Ikke testet | Polling fortsætter ved `{title: null, icySupported: true}` | — |
| TC-05-07 | ICY fetch afbrydes ved stationsskift | 🟡 Ikke testet | Igangværende fetch til gammel station aborteres ved skift | — |

**Resultat: 0/7 godkendt**

---

## TC-06: Søvntimer

| TC# | Titel | Status | Beskrivelse | Dato |
|-----|-------|--------|-------------|------|
| TC-06-01 | Sleep-menu åbner med valgmuligheder | 🟢 Godkendt | Klik ur-ikon → menu med Fra/10/20/30/60 min | 15-06-2026 |
| TC-06-02 | Timer starter og viser nedtælling | 🟢 Godkendt | Valg af tid starter timer og viser "Xm" ved ur-ikon | 15-06-2026 |
| TC-06-03 | Timer pauser afspilning automatisk | 🟡 Ikke testet | Afspilning pauses automatisk når timer udløber | — |
| TC-06-04 | "Sov godt" toast ved udløb | 🟡 Ikke testet | Toast 🌙 "Sov godt" vises ved timer-udløb | — |
| TC-06-05 | Timer deaktiveres via "Fra" | 🟢 Godkendt | Valg af "Fra" annullerer timer uden at stoppe afspilning | 15-06-2026 |
| TC-06-06 | Klik på aktiv station nulstiller ikke timer | 🟡 Ikke testet | Sleep-timer påvirkes ikke ved klik på aktiv station | — |
| TC-06-07 | Ingen stray "0" i det sidste minut | 🟡 Ikke testet | Ingen "0"-tekst ved ur-ikon i det sidste minut | — |
| TC-06-08 | Sleep menu aktiv-highlight fjernes ved 0 min | 🟡 Ikke testet | Ingen option er fejlagtigt highlightet i menu ved <1 min | — |

**Resultat: 3/8 godkendt**

---

## TC-07: Favoritter

| TC# | Titel | Status | Beskrivelse | Dato |
|-----|-------|--------|-------------|------|
| TC-07-01 | Hjerte-knap tilføjer favorit | 🟢 Godkendt | Klik hjerte → rødt hjerte + station i favorit-listen | 15-06-2026 |
| TC-07-02 | Hjerte-knap fjerner favorit | 🟢 Godkendt | Klik rødt hjerte → tomt hjerte + fjernet fra favoritter | 15-06-2026 |
| TC-07-03 | Favoritter synkroniseres til Firestore | 🟡 Ikke testet | Favorit-ID vises i `favorites/{deviceId}.stationIds` i Firestore | — |
| TC-07-04 | Hjerte-knap starter ikke afspilning | 🟢 Godkendt | Klik på hjerte-ikon (ikke kortets øvrige areal) starter ikke stream | 15-06-2026 |
| TC-07-05 | Korrupt favorites-data krasher ikke | 🟡 Ikke testet | Ugyldig Firestore-type i stationIds → tom favorit-liste uden crash | — |
| TC-07-06 | Hjerte-ikon synligt i lys mode (ikke-favorit) | 🟢 Godkendt | Tomt hjerte synlig som grå kontur på lys baggrund | 15-06-2026 |
| TC-07-07 | Hjerte-ikon synligt i mørk mode (ikke-favorit) | 🟡 Ikke testet | Tomt hjerte synlig som lys grå kontur på mørk baggrund | — |

**Resultat: 4/7 godkendt**

---

## TC-08: Kategori-filter

| TC# | Titel | Status | Beskrivelse | Dato |
|-----|-------|--------|-------------|------|
| TC-08-01 | "Alle" viser alle stationer | 🟢 Godkendt | "Alle"-pill viser samtlige stationer på tværs af kategorier | 15-06-2026 |
| TC-08-02 | Kategori-pill filtrerer korrekt | 🟢 Godkendt | Kategori-pill viser kun stationer fra valgt kategori | 15-06-2026 |
| TC-08-03 | Alle 9 kategorier vises med korrekte farver | 🟡 Ikke testet | Alle aktive kategorier har korrekte accentfarver | — |
| TC-08-04 | Favoritter-pill vises altid | 🟢 Godkendt | Hjerte-pill er synlig uanset aktiv kategori | 15-06-2026 |

**Resultat: 3/4 godkendt**

---

## TC-09: Drag & Drop Rækkefølge

| TC# | Titel | Status | Beskrivelse | Dato |
|-----|-------|--------|-------------|------|
| TC-09-01 | Drag & drop aktiv i kategori-visning | 🟡 Ikke testet | Hold 250ms + bevæg i kategori-visning aktiverer drag | — |
| TC-09-02 | Drag & drop inaktiv i "Alle" | 🟡 Ikke testet | Ingen drag i "Alle"-visning | — |
| TC-09-03 | Drag & drop inaktiv i "Favoritter" | 🟡 Ikke testet | Ingen drag i "Favoritter"-visning | — |
| TC-09-04 | Rækkefølge gemmes i Firestore | 🟡 Ikke testet | Rækkefølge bevares i `stationOrders/{deviceId}` efter reload | — |
| TC-09-05 | DragOverlay viser drejet klon | 🟡 Ikke testet | Halvt drejet klon følger mus/finger under drag | — |
| TC-09-06 | Dragged kort skjules i grid | 🟡 Ikke testet | Originalt kort har `opacity: 0` i grid under drag | — |

**Resultat: 0/6 godkendt**

---

## TC-10: Slet Station

| TC# | Titel | Status | Beskrivelse | Dato |
|-----|-------|--------|-------------|------|
| TC-10-01 | Hold 2 sek → slet-dialog vises | 🟡 Ikke testet | Long-press 2 sek åbner DeleteConfirm-dialog | — |
| TC-10-02 | Bekræft sletning → fjernet fra liste | 🟡 Ikke testet | Klik "Slet" → station fjernes fra grid og Firestore | — |
| TC-10-03 | Annuller sletning → ingen ændring | 🟡 Ikke testet | Klik "Annuller" → dialog lukkes, station forbliver | — |
| TC-10-04 | Kort klik → ingen slet-dialog | 🟡 Ikke testet | Hurtigt klik starter afspilning — ingen slet-dialog | — |
| TC-10-05 | Long-press på kort der unmountes krasher ikke | 🟡 Ikke testet | Kategoriskift under long-press giver ingen fejl | — |

**Resultat: 0/5 godkendt**

---

## TC-11: Tilføj Station

| TC# | Titel | Status | Beskrivelse | Dato |
|-----|-------|--------|-------------|------|
| TC-11-01 | Modal åbnes via +-knap | 🟡 Ikke testet | +-knap i header åbner AddStationModal med alle felter | — |
| TC-11-02 | Tom form kan ikke submittes | 🟡 Ikke testet | Submit-knap disabled uden navn og URL | — |
| TC-11-03 | Ny station gemmes i Firestore | 🟡 Ikke testet | Udfyldt form → station vises i grid og Firestore | — |
| TC-11-04 | Modal lukkes med X eller klik udenfor | 🟡 Ikke testet | X-knap eller baggrundsklik lukker modal uden at gemme | — |
| TC-11-05 | Ugyldig protokol i streamUrl afvises | 🟡 Ikke testet | `ftp://`-URL afvises med toast-fejl — gemmes ikke | — |

**Resultat: 0/5 godkendt**

---

## TC-12: Import / Eksport

| TC# | Titel | Status | Beskrivelse | Dato |
|-----|-------|--------|-------------|------|
| TC-12-01 | Eksport henter alle stationer | 🟡 Ikke testet | Download JSON-knap downloader alle stationer | — |
| TC-12-02 | Eksporteret fil har korrekt format | 🟡 Ikke testet | JSON-fil indeholder `exportedAt`, `count`, `stations` | — |
| TC-12-03 | Import parser gyldig JSON | 🟡 Ikke testet | Gyldig JSON viser preview-tabel med grønne ✓ OK | — |
| TC-12-04 | Import afviser manglende navn | 🟡 Ikke testet | Station uden `name` markeres rød i preview | — |
| TC-12-05 | Import afviser ugyldig URL | 🟡 Ikke testet | Ikke-http/https URL markeres rød i preview | — |
| TC-12-06 | Import afviser ukendt kategori | 🟡 Ikke testet | Ukendt kategori markeres rød i preview | — |
| TC-12-07 | Import springer eksisterende stationer over | 🟡 Ikke testet | Duplikat stream-URL springes over — ingen dobbelte stationer | — |
| TC-12-08 | Import afviser logoUrl uden https:// | 🟡 Ikke testet | http:// logoUrl importeres uden logo-felt | — |

**Resultat: 0/8 godkendt**

---

## TC-13: Brugervejledning

| TC# | Titel | Status | Beskrivelse | Dato |
|-----|-------|--------|-------------|------|
| TC-13-01 | Guide åbner som in-app iframe-modal | 🟢 Godkendt | Bog-ikon åbner guide som iframe-overlay — ingen ny tab | 15-06-2026 |
| TC-13-02 | "Tilbage til WebRadio" lukker modalen | 🟡 Ikke testet | Guide-link poster postMessage → modal lukkes i app | — |

**Resultat: 1/2 godkendt**

---

## TC-14: PWA & Offline

| TC# | Titel | Status | Beskrivelse | Dato |
|-----|-------|--------|-------------|------|
| TC-14-01 | PWA manifest og install-prompt | 🟡 Ikke testet | Browser viser install-prompt — manifest og icons tilgængelige | — |
| TC-14-02 | Stationer loader fra IndexedDB offline | 🟡 Ikke testet | Stationer vises fra offline cache ved Offline-mode | — |

**Resultat: 0/2 godkendt**

---

## TC-15: Build & TypeScript

| TC# | Titel | Status | Beskrivelse | Dato |
|-----|-------|--------|-------------|------|
| TC-15-01 | TypeScript checker uden fejl | 🟢 Godkendt | `npx tsc --noEmit` returnerer exit code 0 | 15-06-2026 |
| TC-15-02 | Build kompilerer uden fejl | 🟢 Godkendt | `npm run build` fuldføres uden fejl | 15-06-2026 |

**Resultat: 2/2 godkendt**

---

## TC-16: Stream-tilgængelighed

| TC# | Titel | Status | Beskrivelse | Dato |
|-----|-------|--------|-------------|------|
| TC-16-01 | Alle streams er tilgængelige | 🟢 Godkendt | 80/80 streams OK — alle returnerer HTTP 200 med browser-lignende headers | 15-06-2026 |

**Resultat: 1/1 godkendt**

### TC-16-01 — Per-station detaljer (80 stationer, 15-06-2026)

**70's (6 stationer)**

| Station | Bitrate | Status |
|---------|---------|--------|
| 1.FM 70s Best | 320 kbps | 🟢 OK |
| Big 70s Radio | ? | 🟢 OK |
| laut.fm 70er | ? | 🟢 OK |
| OLDIE ANTENNE 70er | ? | 🟢 OK |
| Radio 10 60s & 70s | ? | 🟢 OK |
| Radio SAW 70er | ? | 🟢 OK |

**80's (11 stationer)**

| Station | Bitrate | Status |
|---------|---------|--------|
| 80s80s In The Mix | ? | 🟢 OK |
| 80s80s Maxis | ? | 🟢 OK |
| 80s80s Radio | ? | 🟢 OK |
| 80s80s Summerhits | ? | 🟢 OK |
| Forever 80 | ? | 🟢 OK |
| radio SAW 80er | ? | 🟢 OK |
| radio SAW In The Mix 80er | ? | 🟢 OK |
| RadioMonster 80s | ? | 🟢 OK |
| Rock Antenne 80er Rock | ? | 🟢 OK |
| Sky Radio 80s Hits | ? | 🟢 OK |
| Vinyl Maxi FM | ? | 🟢 OK |

**90's (6 stationer)**

| Station | Bitrate | Status |
|---------|---------|--------|
| 90s Eurodance | ? | 🟢 OK |
| 90s90s Radio | ? | 🟢 OK |
| Radio 10 90s Hits | ? | 🟢 OK |
| radio SAW 90er | ? | 🟢 OK |
| radio SAW In The Mix 90er | ? | 🟢 OK |
| RadioMonster 90s | ? | 🟢 OK |

**Dance (10 stationer)**

| Station | Bitrate | Status |
|---------|---------|--------|
| bigFM Dance | ? | 🟢 OK |
| Capital Dance | 128 kbps | 🟢 OK |
| ENERGY Dance | 128 kbps | 🟢 OK |
| KISS FM Dance | ? | 🟢 OK |
| Radio 538 | ? | 🟢 OK |
| Radio FG | ? | 🟢 OK |
| RauteMusik Club | ? | 🟢 OK |
| RauteMusik House | ? | 🟢 OK |
| SLAM! FM | ? | 🟢 OK |
| Sunshine Live | ? | 🟢 OK |

**Dansk (19 stationer)**

| Station | Bitrate | Status |
|---------|---------|--------|
| Classic Pop | 192 kbps | 🟢 OK |
| Danske 80'er Hits | 95 kbps | 🟢 OK |
| DR P3 | 128 kbps | 🟢 OK |
| DR P4 Nordjylland | 128 kbps | 🟢 OK |
| DR P5 | 128 kbps | 🟢 OK |
| Limfjord Mix | 128 kbps | 🟢 OK |
| NOVA | 128 kbps | 🟢 OK |
| PartyFM | 64 kbps | 🟢 OK |
| Pop FM | 128 kbps | 🟢 OK |
| Pop FM 80'er | 128 kbps | 🟢 OK |
| Radio 100 | 128 kbps | 🟢 OK |
| Radio ABC | 256 kbps | 🟢 OK |
| Radio Alfa | 192 kbps | 🟢 OK |
| Radio ANR | 256 kbps | 🟢 OK |
| Radio Limfjord | 128 kbps | 🟢 OK |
| Radio Nord | 256 kbps | 🟢 OK |
| Radio Soft | 128 kbps | 🟢 OK |
| Retro Radio | 192 kbps | 🟢 OK |
| The Voice | 128 kbps | 🟢 OK |

**Italo (8 stationer)**

| Station | Bitrate | Status |
|---------|---------|--------|
| 80s80s Italo Hits | ? | 🟢 OK |
| 95.5 Charivari Italo-Hits | ? | 🟢 OK |
| DanceClassics Italo Disco | 128 kbps | 🟢 OK |
| laut.fm Eurobeat | ? | 🟢 OK |
| R.SA Italo Disco Hits | ? | 🟢 OK |
| Radio Stad Den Haag | 256 kbps | 🟢 OK |
| RdMix Italo Disco 80s | 192 kbps | 🟢 OK |
| Synthpop Radio | ? | 🟢 OK |

**Jul (4 stationer)**

| Station | Bitrate | Status |
|---------|---------|--------|
| Christmas Vinyl HD | 320 kbps | 🟢 OK |
| Klassik Radio Christmas | ? | 🟢 OK |
| Sky Radio Christmas | ? | 🟢 OK |
| SomaFM Christmas Rocks! | 128 kbps | 🟢 OK |

**Pop (9 stationer)**

| Station | Bitrate | Status |
|---------|---------|--------|
| 538 Hitzone | ? | 🟢 OK |
| 538 Party | ? | 🟢 OK |
| PopTron | 128 kbps | 🟢 OK |
| Radio 10 Top 4000 | ? | 🟢 OK |
| Radio SAW | ? | 🟢 OK |
| radio SAW In The Mix | ? | 🟢 OK |
| RadioMonster Dance | ? | 🟢 OK |
| RadioMonster Tophits | ? | 🟢 OK |
| Veronica Top 1000 | ? | 🟢 OK |

**Rock (7 stationer)**

| Station | Bitrate | Status |
|---------|---------|--------|
| Radio BOB! | ? | 🟢 OK |
| Radio BOB! Classic Rock | ? | 🟢 OK |
| RadioMonster Rock | ? | 🟢 OK |
| Rock Antenne | ? | 🟢 OK |
| Rock Antenne Classic Perlen | ? | 🟢 OK |
| Rock Antenne Heavy Metal | ? | 🟢 OK |
| SomaFM Metal Detector | 128 kbps | 🟢 OK |

---

## TC-17: iOS & Edge Cases

| TC# | Titel | Status | Beskrivelse | Dato |
|-----|-------|--------|-------------|------|
| TC-17-01 | iOS private browsing — afspilning virker | 🟡 Ikke testet | Afspilning virker i Safari privat tilstand trods localStorage-fejl | — |
| TC-17-04 | MediaSession artwork MIME-type korrekt | 🟡 Ikke testet | SVG-logo viser korrekt i OS-mediekontroller | — |

**Resultat: 0/2 godkendt**

---

## Samlet resultat

> **Resultat: 38/86 godkendt** (48 ikke testet endnu)

---

*Rapport oprettet: 2026-06-15 — klar til testkørsel*
