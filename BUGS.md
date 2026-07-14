# Fejlliste — WebRadio

Fundet ved kritisk kodegennemgang 14-07-2026 (høj-effort workflow-review: 4 uafhængige finder-agenter + 1 uafhængig verifikations-agent pr. fund, alle 13 kandidater blev bekræftet, 0 afvist). Denne fil indeholder den fulde rå information fra reviewet — finderens fejlscenarie OG verifikationsagentens uafhængige kode-bevis, ikke bare en opsummering. Fejlene tages én ad gangen; se status-tabellen for hvor langt hver er nået.

Status-koder: 🔴 Åben · 🟡 I gang · 🟢 Rettet

| BUG# | Fil | Status | Prioritet |
|------|-----|--------|-----------|
| BUG-01 | `src/components/StationCard.tsx:124` | 🟢 Rettet (deployet + bekræftet på iPhone) | Kritisk |
| BUG-02 | `src/components/AddStationModal.tsx:30` | 🟢 Rettet (verificeret mod Firestore med TEST_-poster) | Kritisk |
| BUG-03 | `src/firebase/stationsService.ts:102` | 🟢 Rettet (verificeret mod Firestore med TEST_-poster) | Kritisk |
| BUG-04 | `src/store/useRadioStore.ts:255` | 🟢 Rettet (bekræftet på iPhone) | Kritisk |
| BUG-05 | `src/store/useRadioStore.ts:303` | 🟢 Rettet (bekræftet på iPhone, dog se BUG-15) | Kritisk |
| BUG-06 | `src/App.tsx:65` | 🟢 Rettet (bekræftet på iPhone) | Kritisk |
| BUG-07 | `api/icy-meta.ts:1` | 🟢 Rettet (verificeret mod real handler) | Mellem |
| BUG-08 | `src/store/useRadioStore.ts:224` | 🟢 Rettet (bekræftet på iPhone) | Mellem |
| BUG-09 | `api/icy-meta.ts:52` | 🟢 Rettet (bekræftet på iPhone, afdækkede BUG-16) | Mellem |
| BUG-10 | `src/store/useRadioStore.ts:100` | 🟢 Rettet (bekræftet på iPhone) | Mellem |
| BUG-11 | `src/App.tsx:23` | 🟢 Rettet (dead code fjernet) | Lav |
| BUG-12 | `check-streams.mjs:122` | 🟢 Rettet (parallelliseret, live-testet: 80/80 på 4 sek.) | Lav |
| BUG-13 | rodmappe-scripts (17 filer) | 🟢 Rettet (delt `firebase-init.mjs`, live-testet) | Lav |
| BUG-14 | `src/audio.ts`, `src/store/useRadioStore.ts` | 🟢 Lukket — accepteret platformsbegrænsning | Kritisk |
| BUG-15 | `src/store/useRadioStore.ts:298` | 🟡 Delvis rettet — hakke-symptom løst, kerneproblem åbent | Kritisk |
| BUG-16 | `src/components/Player.tsx:32` | 🟢 Rettet (bekræftet på iPhone) | Mellem |

> **Status: 14/16 rettet + bekræftet (BUG-01, 02, 03, 04, 05, 06, 07, 08, 09, 10, 11, 12, 13, 16), 1 lukket som accepteret begrænsning (BUG-14), 1 delvist rettet (BUG-15 — kerneproblem åbent).**

---

## BUG-01 — Drag & drop reorder virker slet ikke
**Fil:** `src/components/StationCard.tsx:124` · **Prioritet:** Kritisk

**Fund:** Den bogstavelige prop `onPointerDown={startPress}` overskriver dnd-kit's `listeners.onPointerDown`, spredt to linjer tidligere, så drag-and-drop aldrig kan aktiveres.

**Fejlscenarie (finder):** I kategori-visning (`sortable=true`) spredes `{...listeners}` (linje 97), som inkluderer dnd-kit's PointerSensor-aktivator på `onPointerDown` (`PointerSensor.activators = [{eventName:'onPointerDown', ...}]`). Den senere bogstavelige `onPointerDown={startPress}` (linje 124) er en duplikeret nøgle i samme JSX-prop-objekt, så den vinder og erstatter fuldstændig dnd-kit's handler — sensorens aktiveringshandler kaldes aldrig. Kun `PointerSensor` er registreret i `StationGrid.tsx` (ingen `KeyboardSensor`-fallback), så tryk-og-træk på et kort producerer aldrig et `DragOverlay` eller reorder; det starter kun 2-sek. long-press-slet-timeren. Dette regresserede i commit `b66f63e` ("Fix DnD: whole-card drag with 250ms delay, no separate handle"), da det dedikerede drag-handle (som havde sin egen isolerede `onPointerDown` via `{...listeners}`) blev fjernet, og `listeners` blev spredt på samme div, som allerede bar long-press `onPointerDown`. TC-09-testene fanger det ikke: TC-09-01/02/03 tjekker kun CSS-klasser (`cursor-grab`/`cursor-pointer`), og TC-09-04's egen kommentar siger den består "hvad enten drag blev aktiveret eller ej", da den kun sammenligner rækkefølge før/efter reload — hvilket trivielt er ens hvis reorder aldrig sker. TC-09-05/06 er markeret "ikke testet", fordi headless ikke kan simulere aktiveringen. Nettoeffekt: den dokumenterede drag-and-drop-reorder-funktion er stille ikke-funktionel for rigtige brugere, både med mus og touch.

**Verifikations-bevis (uafhængig agent):** JSX-prop-objektet bygges i kildekode-rækkefølge: `{...(sortable ? listeners : {})}` (linje 97) spredes først, og den bogstavelige `onPointerDown={startPress}` optræder senere på linje 124. Babels JSX-transform fletter spreads og bogstavelige attributter til ét objekt-spread-udtryk i kilderækkefølge, så senere nøgler vinder — den bogstavelige `onPointerDown={startPress}` overskriver ubetinget, hvad end `onPointerDown` dnd-kit's `listeners` leverede. `StationGrid.tsx` konfigurerer kun `useSensor(PointerSensor, { activationConstraint: { delay: 250, tolerance: 5 } })` (linje 29), ingen `KeyboardSensor`-fallback. Da `startPress` (linje 69-77) er en bar lokal closure, der aldrig kalder den oprindelige dnd-kit-handler den erstattede, og kun starter 2-sek. slet-long-press-`setTimeout`, bliver PointerSensor's aktivator aldrig kaldt ved pointerdown i nogen kodesti hvor `sortable` er true. Dette betyder, at `DragStartEvent`/`handleDragStart` aldrig kan fyre fra et reelt bruger-pointerdown — drag-and-drop-reorder er dødt for slutbrugere, i modstrid med den dokumenterede UX-regel "Hold 250ms + bevæg i kategori-visning → drag & drop reorder" i CLAUDE.md.

**Forsøgt rettelse 14-07-2026 — afvist, ny konflikt fundet ved test:** Den oplagte rettelse (flet dnd-kit's `listeners.onPointerDown` og `startPress` i én handler i stedet for at lade den ene overskrive den anden) blev implementeret og testet lokalt mod `npm run dev` (ikke produktion) med et instrumenteret Playwright-script. `npx tsc --noEmit` var ren, og drag & drop virkede derefter korrekt (DragOverlay vises, kort får `opacity:0`, klik-afspilning upåvirket). MEN testen afslørede en ny regression: dnd-kit's `PointerSensor` med `activationConstraint: { delay: 250, tolerance: 5 }` er **forsinkelses-baseret, ikke bevægelses-baseret** — den aktiverer automatisk en drag, blot man holder musen/fingeren **helt stille** i 250ms; `tolerance` annullerer kun en *tidlig* bevægelse før forsinkelsen udløber, den kræver ikke bevægelse for at aktivere. Instrumenteret bevis (stationær hold, ingen bevægelse overhovedet):

| Tid holdt stille | DragOverlay vist | Kort-opacity | Slet-dialog vist |
|---|---|---|---|
| 200ms | Nej | 1 | Nej |
| 300ms | **Ja** | **0** | Nej |
| 1000ms | Ja | 0 | Nej |
| 2100ms | Ja | 0 | **Nej** |

Fordi `useEffect(() => { if (isDragging) { wasDragged.current = true; cancelPress() } }, [isDragging])` (linje 47-52) allerede annullerer long-press-slet-timeren, så snart dnd-kit rapporterer `isDragging`, bliver 2-sekunders slet-timeren nu annulleret efter blot ca. 250-300ms — **slet-via-hold ville holde op med at virke i kategori-visning** (den forbliver upåvirket i "Alle"/"Favoritter", hvor `sortable=false` og dnd-kit aldrig kobles på). Den oplagte rettelse blev derfor forkastet og reverteret (ingen ændring committet) — se de to reelle løsningsforslag nedenfor.

**Reelle løsningsforslag (kræver et produktvalg, ikke kun en kodeændring):**

- **Forslag A — skift til bevægelses-baseret aktivering** (`activationConstraint: { distance: 8 }` i stedet for `{ delay: 250, tolerance: 5 }`): En helt stationær hold udløser aldrig drag, uanset varighed, så 2-sekunders slet-gestus er 100% sikker. Drag starter først, når musen/fingeren reelt har bevæget sig ca. 8px, hvilket matcher CLAUDE.md's egen formulering "Hold 250ms **+ bevæg**". **Risiko:** bevægelses-baseret aktivering er kendt for at kunne kapre en lodret scroll-swipe på touch-enheder, fordi de første pixels af "scroll siden" og "start en drag" ser identiske ud for sensoren — formodentlig netop derfor den oprindelige udvikler valgte forsinkelses-baseret aktivering (bedre til at sameksistere med side-scroll på mobil). Bør testes på en reel iPhone/touch-enhed, før det kan stoles på — kan ikke verificeres pålideligt i en desktop-browser eller headless test.
- **Forslag B — genindfør et lille dedikeret greb-område** (fx et lille greb-ikon i hjørnet) der alene bærer dnd-kit's `listeners`, adskilt fra resten af kortet, som stadig bærer long-press-slet. Eliminerer enhver gestus-konflikt fuldstændigt ved konstruktion (drag og slet lytter på fysisk forskellige DOM-elementer), og har ingen scroll-risiko. **Ulempe:** går imod det eksplicitte designvalg i commit `b66f63e` ("whole-card drag... no separate handle") — dog har ingen bruger reelt oplevet whole-card-drag, siden den aldrig har virket pga. denne bug, så det er ikke et regressions-brud mod faktisk oplevet adfærd, kun mod den oprindelige hensigt.

**Implementeret løsning 14-07-2026 — Forslag C (Michaels idé): dedikeret reorder-liste, iPhone-stil.** I stedet for at trække kort direkte i gridet, eller give hele kortet en lille greb-zone, indføres en separat "rediger rækkefølge"-tilstand:

- **Grid-visning (uændret adfærd):** Klik = afspil. Holder man et kort **stille** i 2 sekunder = slet-dialog, præcis som i dag. Ingen dnd-kit overhovedet koblet på selve gridkortet længere.
- **Ny gestus:** Holder man et kort og **bevæger** musen/fingeren mere end 8px (mens pointeren stadig er nede), åbnes en fuldskærms liste-modal for den aktuelle kategori i stedet for at trække kortet selv. Dette skelner "stille = slet" fra "bevæg = reorder" ved bevægelse, ikke ved timing — samme mekanisme, der allerede blev bevist konfliktfri i det forkastede forsøg ovenfor.
- **Reorder-listen (`src/components/ReorderListModal.tsx`, ny fil):** Viser stationerne i kategorien som rækker med et lille greb-ikon (⋮⋮) til højre. Kun grebet bærer dnd-kit's `listeners` (samme mønster som Forslag B, men afgrænset til denne modal) — ingen tvetydighed, da der ikke er noget klik-for-afspil eller slet-gestus at forveksle med i denne visning. `verticalListSortingStrategy` bruges (liste, ikke grid). Rækkefølgen gemmes via den eksisterende `reorderCategory()` i storen (uændret, inkl. dens kendte race i BUG-08). Lukkes med en "Færdig"-knap øverst.
- **Filer ændret:** `src/components/StationCard.tsx` (fjernet `useSortable`/dnd-kit helt, tilføjet pointer-bevægelses-detektion), `src/components/StationGrid.tsx` (fjernet `DndContext`/`SortableContext`/`DragOverlay`, tilføjet modal-state), `src/components/ReorderListModal.tsx` (ny).

**Verifikation (lokal `npm run dev`, ikke produktion):**
- `npx tsc --noEmit` — ren
- `npx eslint` på de tre ændrede/nye filer — ingen fejl
- Instrumenteret Playwright-script, 8/8 bestået:

| Test | Resultat |
|---|---|
| Klik afspiller stadig station | ✓ |
| Long-press (2s, ingen bevægelse) viser stadig slet-dialog | ✓ |
| Hold + bevæg åbner reorder-listen | ✓ |
| Hold + bevæg viser IKKE slet-dialogen (ingen konflikt) | ✓ |
| Træk i håndtag ændrer rækkefølgen i listen | ✓ |
| Ny rækkefølge persisteret efter reload (Firestore round-trip) | ✓ |
| "Alle"-visning: stadig cursor-pointer, ingen reorder-adgang | ✓ |
| "Alle"-visning: hold+bevæg åbner ikke reorder-listen | ✓ |

**Restrisiko fra tidligere (nu afkræftet):** Der var en teoretisk bekymring om, at bevægelses-baseret åbning af reorder-listen kunne genere lodret side-scroll ved swipe på en touch-skærm (kunne ikke testes i desktop-browser/headless Playwright). **Bekræftet af Michael 14-07-2026 på rigtig iPhone: ingen problemer** — scroll og reorder-åbning konflikter ikke i praksis.

**Deployet 14-07-2026** — commit `514ddbf`, pushet til `main`, automatisk udrullet af Vercel til https://webradio-chi.vercel.app. Bekræftet virkende i produktion på iPhone af Michael. **BUG-01 er lukket.**

---

## BUG-02 — "Tilføj station" kan fejle stille ved tomme valgfrie felter
**Fil:** `src/components/AddStationModal.tsx:30` · **Prioritet:** Kritisk

**Fund:** `addStation()` kaldes med et objekt-literal, der eksplicit sætter `bitrate`/`country` til `undefined`, når brugeren lader dem stå på standardværdi — men Firestores `addDoc` (ingen `ignoreUndefinedProperties` sat i `config.ts`) afviser ethvert felt med værdien `undefined`.

**Fejlscenarie (finder):** Brugeren åbner "Tilføj station", udfylder kun navn + stream-URL + kategori (bitrate forbliver på standardvalget "Ukendt" → state `undefined`; land forbliver tomt → `country.trim().toLowerCase() || undefined` → `undefined`) og indsender. `addDoc(collection(db,'stations'), {...data, createdAt: serverTimestamp()})` i `stationsService.ts` kaster "Unsupported field value: undefined (found in field bitrate/country)", fanget af modalens generiske `catch { toast.error('Kunne ikke tilføje stationen') }` — stationen oprettes aldrig, stille. Denne præcise tvetydighed er synlig i `tests/tc-10-11.spec.ts` TC-11-03, som eksplicit accepterer enten "modal lukker" eller "fejl-toast vist" som bestået — dvs. projektets egen testsuite tolererer allerede denne fejl uden at diagnosticere den.

**Verifikations-bevis (uafhængig agent):** `AddStationModal.tsx:30` kalder `addStation({ name: name.trim(), streamUrl: trimmedUrl, category, bitrate, country: country.trim().toLowerCase() || undefined })`, hvor `bitrate`-state som standard er `undefined` (linje 15, kun sat af det valgfrie bitrate-`<select>`), og `country.trim().toLowerCase() || undefined` evaluerer til `undefined` når land-feltet forbliver tomt (dets standard). `stationsService.ts:78-83` `addStation()` sender dette objekt direkte ind i `addDoc(collection(db, COLLECTION), { ...data, createdAt: serverTimestamp() })` uden at stripning/default-sætning af undefined-felter. `config.ts:16-18` initialiserer Firestore via `initializeFirestore(app, { localCache: persistentLocalCache() })` uden `ignoreUndefinedProperties: true`, så SDK'ens standardadfærd (afvis undefined-feltværdier) gælder. Indsendelse af tilføj-station-formularen med bitrate på "Ukendt" og land tomt (standard-state for begge felter) får `addDoc` til at kaste på det undefined-felt, fanget af den generiske `catch { toast.error('Kunne ikke tilføje stationen') }` i `AddStationModal.tsx:33-34` — stationen fejler stille uden specifik diagnostik.

**Rettet 14-07-2026:** Løst sammen med BUG-03 ved samme boundary-fix i `stationsService.ts` — se BUG-03's rettelsesnote for detaljer. `AddStationModal.tsx` er ikke ændret; problemet lå i skrive-laget, ikke i formularen. `npx tsc --noEmit` ren. Afventer test på iPhone (tilføj en station med bitrate="Ukendt" og land tomt).

---

## BUG-03 — Import kan fejle helt eller skrive fremmede felter
**Fil:** `src/firebase/stationsService.ts:102` · **Prioritet:** Kritisk

**Fund:** `importStations()` spreder hvert kaldende-leverede stationsobjekt direkte ind i `batch.set()` uden at fjerne de ekstra `valid`/`error`-felter eller undefined valgfrie felter, som `ImportExportModal`'s `ParsedStation`-objekter altid bærer, så én ufuldstændig række afbryder (og forurener) hele batchen.

**Fejlscenarie (finder):** `ImportExportModal.parseFile()` sætter altid nøglerne `bitrate`, `logoUrl` og `country`, selv når de mangler i den uploadede JSON (`typeof s.bitrate === 'number' ? s.bitrate : undefined` osv.), og tilføjer altid en `valid: true`-markør. `handleImport()` sender denne `ParsedStation[]` direkte til `importStations(stations: StationFormData[])` — TypeScript tillader den bredere type gennem en variabel-tildeling (ingen excess-property-tjek), så objekterne ved runtime har `bitrate: undefined` / `country: undefined` for enhver station uden disse valgfrie felter. Firestores `batch.set` kaster på undefined-feltværdier, hvilket afbryder hele `batch.commit()` for den chunk (op til 499 stationer) — så import af en JSON-eksport, hvor de fleste stationer mangler bitrate/land (meget almindeligt), fejler helt med kun en generisk "Import fejlede"-toast, og enhver station der *lykkes* (i en chunk uden undefined-felter) skrives til Firestore med et fremmed `valid: true`-felt, der aldrig var en del af Station-skemaet.

**Verifikations-bevis (uafhængig agent):** `ImportExportModal.tsx` `parseFile()` sætter altid `bitrate`/`logoUrl`/`country`-nøgler, med default `undefined` når fraværende (fx linje 42: `bitrate: typeof s.bitrate === 'number' ? s.bitrate : undefined`), og tilføjer altid `valid: true` (`ParsedStation` udvider `StationFormData` med `valid: boolean`). `handleImport()` gør `const valid = parsed.stations.filter((s) => s.valid)` og derefter `importStations(valid)` (`ImportExportModal.tsx:98,101`) — da TypeScripts excess-property-tjek kun gælder for friske objekt-literaler, ikke variabler, passerer `ParsedStation[]` (der stadig bærer `valid: true` og evt. `bitrate: undefined` osv.) som `StationFormData[]` uden stripning. I `stationsService.ts:102` spreder `batch.set(doc(collection(db, COLLECTION)), { ...station, createdAt: serverTimestamp() })` disse ekstra/undefined-værdi-felter direkte ind i skrivningen. Firestores standardadfærd (ingen `ignoreUndefinedProperties` konfigureret) kaster synkront på ethvert felt med en `undefined`-værdi, og dette kast sker inde i for-løkken, før `batch.commit()` nås — så én station uden bitrate/logoUrl/land afbryder hele chunkens import (fanget generisk som "Import fejlede"). Enhver station der lykkes (alle valgfrie felter til stede) skrives med et fremmed `valid: true`-felt, aldrig en del af Station-skemaet (`types/index.ts:5-15` har intet `valid`-felt).

**Rettet 14-07-2026:** Tilføjet en `sanitizeStationData()`-funktion i `stationsService.ts`, som eksplicit allowlister de kendte `Station`-felter (name, streamUrl, category, og kun bitrate/logoUrl/country hvis de rent faktisk er sat) — bruges nu af både `addStation()` og `importStations()`'s `batch.set()`, i stedet for en rå objekt-spread. Dette fjerner både `undefined`-feltværdier (retter BUG-02) og fremmede felter som `valid` (retter BUG-03) ved selve Firestore-skrive-grænsen, uden at røre `AddStationModal.tsx` eller `ImportExportModal.tsx`. `npx tsc --noEmit` ren. Afventer test på iPhone (import en JSON-fil med stationer der mangler bitrate/land).

---

## BUG-04 — Genklik på pauseret station reconnecter ikke streamen
**Fil:** `src/store/useRadioStore.ts:255` · **Prioritet:** Kritisk

**Fund:** `playStation()` reconnecter kun streamen, når `a.src` afviger fra stationens URL, så genklik på den aktuelt valgte men pauserede station genoptager den forældede forbindelse i stedet for at reconnecte live.

**Fejlscenarie (finder):** Brugeren trykker pause i player-baren (`src` forbliver sat til den aktuelle station, kun fadet/pauseret), klikker derefter samme stations kort igen i gridet (`StationCard.tsx` kalder altid `playStation`, aldrig `togglePlay`). Fordi `a.src === station.streamUrl`, springes reconnect-branchen (`set isPlaying:false; a.pause(); a.src = ...`) over, og koden falder direkte til `a.play()` på den gamle forbindelse — præcis det forældede-buffer-positions-problem, som `togglePlay`'s resume-sti eksplicit blev rettet for at undgå (kommentar: "Live streams can't resume from a buffered position — reconnect from 'now'"). Resultat: lyden kan genoptage fra en død/stalled forbindelse, spille stilhed, eller hænge, mens UI viser Live/Forbinder som om der er reconnectet.

**Verifikations-bevis (uafhængig agent):** `src/store/useRadioStore.ts:255` `if (a.src !== station.streamUrl) { set({ isPlaying: false }); a.pause(); a.src = station.streamUrl }` nulstiller kun forbindelsen, når URL'en afviger; når pauseret via player-baren (`togglePlay` fader+pauser men lader `a.src` være uændret) og brugeren derefter klikker samme stations kort igen, kalder `StationCard.tsx:90` ubetinget `playStation(station)` (`handleClick` har ingen branch der tjekker `isPlaying`), så reconnect-branchen springes over og koden fortsætter direkte til `a.play()` (linje 261) på den gamle, hængte forbindelse — præcis det forældede-live-stream-problem, som søster-stien `togglePlay`'s resume (linje 302: `if (currentStation) a.src = currentStation.streamUrl` med kommentar "Live streams can't resume from a buffered position — reconnect from now") blev skrevet for at undgå.

**Implementeret løsning 14-07-2026:** Betingelsen for at reconnecte er udvidet fra kun "URL er anderledes" til også "stationen er ikke i gang med at spille" (`if (a.src !== station.streamUrl || !wasPlaying)`). Genklik på en pauseret station — same URL — reconnecter nu altid fra "nu", præcis som `togglePlay`'s resume-sti. Genklik på en station, der allerede spiller/buffer, springer stadig reconnect over (det oprindelige formål: undgå at afbryde en igangværende forbindelse ved overflødige klik).

Rettet **sammen med BUG-05** efter Michaels ønske, da begge er i samme funktion og hænger sammen med hans oplevelse af at PLAY på låst skærm ikke virkede (se BUG-05's fund — den var den reelle årsag til låseskærm-symptomet, BUG-04 er en beslægtet men adskilt fejl i selve appens grid).

---

## BUG-05 — `togglePlay()` kvitterer ikke for fejlet `play()`
**Fil:** `src/store/useRadioStore.ts:303` · **Prioritet:** Kritisk

**Fund:** Resume-grenen i `togglePlay()` sætter `isPlaying:true` ubetinget uden at tjekke, om `a.play()` reelt lykkedes.

**Fejlscenarie (finder):** Hvis `a.play()` afvises efter en hurtig pause/resume eller src-genforsyning (fx AbortError fra overlappende loads, eller en netværksfejl før afspilning starter), sætter storen stadig `isPlaying:true, isBuffering:true` og starter lyttetimeren. Da afspilning aldrig reelt startede, fyrer audio-elementets `pause`-event (som normalt retter op på `isPlaying`) heller aldrig — UI'et sidder permanent fast og viser "Live" med kørende timer og pause-ikon, mens ingen lyd spiller, indtil brugeren manuelt toggler igen.

**Verifikations-bevis (uafhængig agent):** `src/store/useRadioStore.ts:303-304` — i `togglePlay()`'s resume-gren: `a.play().catch(() => {})` svæler enhver afvisning, og linjen lige efter gør ubetinget `set({ isPlaying: true, isBuffering: true, listenStartedAt: Date.now() })` uanset om play()-promise'et blev opfyldt eller afvist. I modsætning til `playStation()` (linje 261-263), som har `.catch((err) => { if (err.name === 'NotAllowedError') set({ isPlaying: false, ... }) })`, gør `togglePlay()`'s catch slet ingenting. Hvis `play()` afvises (fx AbortError fra `a.src = currentStation.streamUrl` på linje 302 blivende overhalet af endnu et hurtigt toggle, eller en netværksfejl før nogen frame afkodes), skifter audio-elementet aldrig fra "paused" til "playing" og tilbage til "paused" — så elementets eget `pause`-event (registreret på linje 72, guarded af `if (!isPlaying) return`) fyrer ikke for at rette op på state, da der ingen playing→paused-overgang er, kun et `play()`-kald der aldrig havde effekt. `onError`-handleren (linje 65) fyrer kun ved faktiske `error`-events på elementet, hvilket ikke er garanteret for enhver `play()`-afvisning (fx giver AbortError fra overlappende load-requests intet `error`-event). Nettoeffekt: `isPlaying` forbliver true, `isBuffering` forbliver true, `listenStartedAt` fortsætter med at fremme timeren, og UI viser "Live"/pause-ikon mens ingen lyd reelt spiller, uden automatisk gendannelsessti før brugeren manuelt toggler igen.

**Sandsynlig årsag til Michaels oplevelse:** PLAY-knappen på låst skærm går gennem MediaSession-handleren i storen, som kalder `togglePlay()` (ikke `playStation()`). Hvis `a.play()` fejler stille i denne kontekst (fx pga. iOS' audio-session-adfærd når skærmen er låst), viste UI'et/låseskærmen tidligere fortsat "spiller", uden at noget reelt skete — brugeren oplever at PLAY "ikke virker", uden fejl at gå efter.

**Implementeret løsning 14-07-2026:** `togglePlay()`'s resume-gren fanger nu enhver fejl fra `a.play()` (ikke længere en tom `.catch(() => {})`) og reverterer `isPlaying`, `isBuffering` og `listenStartedAt` til korrekt "ikke-spiller"-tilstand, samt opdaterer MediaSession til `paused`, så låseskærmen viser den reelle tilstand i stedet for at hænge fast som "spiller". Samme udvidelse (fra kun `NotAllowedError` til alle fejl) er lavet i `playStation()`'s eget `.catch()`, da BUG-04-rettelsen betyder, at `playStation()` nu også kan optræde som en "resume"-vej (genklik på pauseret station) og derfor har brug for samme robusthed.

**Verifikation (lokal `npm run dev`, ikke produktion):**
- `npx tsc --noEmit` — ren
- `npx eslint src/store/useRadioStore.ts` — kun 4 præ-eksisterende `no-empty`-fejl i urelaterede `try/catch`-linjer (samme linjer som før ændringen, ikke introduceret af denne rettelse)
- Instrumenteret Playwright-script, kørt **både på oprindelig og rettet kode** for at bevise testene reelt fanger noget:

| Test | Oprindelig kode | Rettet kode |
|---|---|---|
| BUG-04: genklik på pauseret station udløser ny stream-forbindelse (netværks-request talt) | ✗ (0 nye requests) | ✓ (nye requests registreret) |
| BUG-05: UI hænger ikke fast i "Forbinder"/"Live" efter kunstigt fremtvunget fejlet `play()` | ✗ ("Forbinder" sad fast permanent) | ✓ (reverterer korrekt) |

**Deployet 14-07-2026** — commit `abaa9dd`, pushet til `main`, automatisk udrullet af Vercel til https://webradio-chi.vercel.app. Afventer Michaels bekræftelse på iPhone (særligt: PLAY på låst skærm efter en fejlet/afbrudt afspilning).

---

## BUG-06 — `devicechange` fejlfortolker enhedstilføjelser som frakobling
**Fil:** `src/App.tsx:65` · **Prioritet:** Kritisk

**Fund:** `devicechange`-handleren antager, at den første event efter idle altid er en frakobling, men browseren fyrer `devicechange` for enhver ændring i enhedslisten, inklusive tilføjelser.

**Fejlscenarie (finder):** Mens musik spiller, hvis brugeren tilslutter en ny/ekstra lydudgang (fx kabelhovedtelefoner mens en Bluetooth-højtaler stadig er tilsluttet) i stedet for at frakoble én, er `pendingReconnect` false, så handleren tager "disconnect"-grenen og kalder `togglePlay()` for at pause — selvom intet reelt blev fjernet. Afspilning stopper uventet blot ved at tilføje en enhed.

**Verifikations-bevis (uafhængig agent):** `src/App.tsx` linje 65-84: `onDeviceChange` har kun to grene, styret af det interne `pendingReconnect`-flag, uden tjek af `navigator.mediaDevices.enumerateDevices()` eller andet signal om, hvorvidt en enhed blev tilføjet eller fjernet. Når `pendingReconnect` er false (steady-state mens musik spiller), falder enhver `devicechange`-event i else-grenen: `wasPlayingAtDisconnect = isPlaying; if (isPlaying) togglePlay()` (linje 78-80) — ubetinget behandlet som en frakobling og pauser. Media Devices API fyrer `devicechange` for enhver ændring i enhedslisten, inklusive tilføjelser (fx tilslutning af kabelhovedtelefoner mens en Bluetooth-højtaler forbliver tilsluttet), så det scenarie rammer præcis denne pause-gren uden mulighed for at undgå det.

**Rettet 14-07-2026:** `onDeviceChange` tæller nu enheder via `navigator.mediaDevices.enumerateDevices()` før og efter hvert event, og sammenligner antal. Kun et **fald** i antal enheder udløser pause-grenen; en stigning (eller uændret antal) rører ikke afspilningen, medmindre appen allerede venter på en reconnect (i så fald tolkes det som den forventede genforbindelse, som før). `npx tsc --noEmit` ren.

**Bekræftet 14-07-2026 (Michael, rigtig iPhone):** Afspillede en station via telefonens egen højttaler, forbandt derefter AirPods mens musikken spillede — musikken fortsatte uden pause. **BUG-06 er lukket.**

---

## BUG-07 — SSRF-beskyttelsen i ICY-metadata-proxyen kan omgås
**Fil:** `api/icy-meta.ts:1` · **Prioritet:** Mellem

**Fund:** `isPrivateHost` blokerer kun punktum-decimal IPv4 og `::1`, og mangler alternative IP-encodings samt DNS-rebinding — et SSRF-hul i en proxy, hvis URL er offentligt skrivbar.

**Fejlscenarie (finder):** Firestore-reglerne tillader `allow read, write: if true`, og `AddStationModal`/`importStations` kræver kun, at URL'en starter med `http(s)://` — enhver besøgende kan tilføje en station, hvis streamUrl er `http://2130706433/` (decimal for 127.0.0.1), `http://017700000001/` (oktal), `http://[::ffff:169.254.169.254]/latest/meta-data/` (IPv6-mappet cloud metadata-adresse), eller et domæne der kun resolver til en privat IP ved fetch-tidspunktet (DNS-rebinding). Ingen af disse hostnavne matcher `isPrivateHost`'s punktum-decimal-regex eller den bogstavelige `::1`-tjek, så de passerer validering. `Player.tsx` poller derefter `/api/icy-meta?url=<den streamUrl>` hvert 30. sekund mens stationen spiller, hvilket får Vercel-serverless-funktionen til at udføre outbound requests mod interne/metadata-endpoints på angriberens vegne — SSRF-beskyttelsen tilføjet i commit `38e5e28` kan omgås via alternative adresse-encodings.

**Verifikations-bevis (uafhængig agent):** `isPrivateHost` (`api/icy-meta.ts:1-15`) tjekker kun `h === 'localhost' || h === '::1'` og en punktum-decimal IPv4-regex `^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$`. Et hostnavn som `2130706433` (decimal for 127.0.0.1), `017700000001` (oktal), eller `[::ffff:169.254.169.254]` (IPv6-mappet) matcher ingen af grenene, så `isPrivateHost` returnerer false, og requesten fortsætter til `fetch(url, ...)` på linje 39. Derudover opererer tjekket kun på hostname-strengen, ikke den resolvede IP, så et DNS-navn der resolver til en privat/metadata-IP ved fetch-tidspunktet fanges slet ikke (klassisk DNS-rebinding-hul) — der er intet IP-efter-resolution-tjek nogen steder i filen. Da `Player.tsx` poller dette endpoint hvert 30. sek. for vilkårlige Firestore-lagrede streamUrl-værdier (station-streamUrl kræves kun at starte med `http(s)://` ifølge projektdokumentationen), er dette et reelt SSRF-bypass af den eksisterende beskyttelse.

**Rettet 14-07-2026:** `isPrivateHost` er nu asynkron og bruger `dns.promises.lookup(hostname, { all: true })` til at resolve hostnavnet og validere den **faktiske** IP-adresse (alle returnerede adresser, ikke kun den første) — i stedet for kun at mønster-matche hostname-strengen. Dette normaliserer alternative encodings (decimal/oktal/hex forstås af Node's underliggende getaddrinfo og resolver til en almindelig dotted-quad, som så tjekkes), og indsnævrer (om end ikke eliminerer fuldstændigt) DNS-rebinding-vinduet til gabet mellem opslag og selve `fetch()`. Udvidet til også at dække IPv4-mappede IPv6-adresser (`::ffff:a.b.c.d`), unique-local (`fc00::/7`) og link-local (`fe80::/10`) IPv6-ranges. Uopløselige hostnavne afvises defensivt. Standalone type-check af `api/icy-meta.ts` (uden for hoved-tsconfig'en, som ikke inkluderer `api/`) er ren.

**Verificeret 14-07-2026 (direkte mod den rigtige handler-funktion, via `tsx`, ingen Firestore/produktionsdata involveret):** 7/7 tests bestået — `127.0.0.1`, decimal-encoded (`2130706433`), oktal-encoded (`017700000001`), IPv6-mapped cloud metadata-adresse, `localhost`, og `192.168.x.x` blokeres alle korrekt (HTTP 400); en legitim offentlig stream (DR P3) blokeres **ikke** og fetches normalt. **BUG-07 er lukket.**

---

## BUG-08 — Race i `reorderCategory`'s fejl-rollback
**Fil:** `src/store/useRadioStore.ts:224` · **Prioritet:** Mellem

**Fund:** `reorderCategory`'s fejl-revert lukker over rækkefølgen fanget *før* den optimistiske opdatering, så to overlappende reorders på samme kategori kan have et senere succesfuldt gem overskrevet af et tidligere fejlets revert.

**Fejlscenarie (finder):** Brugeren trækker for at reordere kategori X (kald A, `prevOrder=P1`), trækker derefter hurtigt igen i samme kategori før A's Firestore-write er afsluttet (kald B, `prevOrder=P2`=A's optimistiske rækkefølge). Hvis B lykkes, men A's write senere fejler/timeout'er, reverterer A's catch-handler `stationOrder[X]` tilbage til P1 (A's pre-update-snapshot), hvilket stille kasserer B's allerede gemte, bruger-synlige reorder og viser en forældet rækkefølge plus en misvisende "Kunne ikke gemme rækkefølge"-toast, selvom B lykkedes.

**Verifikations-bevis (uafhængig agent):** `src/store/useRadioStore.ts:224-239`. `reorderCategory` fanger `prevCategoryOrder = stationOrder[category]` fra `get()` ved kaldets tidspunkt, gør derefter en optimistisk `set()` og affyrer `saveStationOrder(...).catch(...)`, der lukker over den forældede `prevCategoryOrder`. Hvis kald A's promise afvises, efter at kald B allerede har kørt (B's optimistiske `set()` overskrev storen, og B's egen save lykkedes), reverterer A's catch-handler på linje 232-236 stadig `revertedOrder[category] = prevCategoryOrder` (A's pre-update-snapshot, dvs. state før både A og B), hvilket overskriver B's succesfuldt gemte rækkefølge med en toast "Kunne ikke gemme rækkefølge", selvom B lykkedes. Der er ingen request-sekvensering/versions-token, der styrer hvilket kalds fejl der må revertere, så et langsommere-fejlende tidligere kald kan overtrampe et hurtigere-succesfuldt senere kalds resultat.

**Rettet 14-07-2026:** Tilføjet et sekvensnummer pr. kategori (`reorderSeq`). Hvert `reorderCategory`-kald inkrementerer og fanger sit eget nummer; når et kalds Firestore-write fejler, tjekker catch-handleren først om dens nummer stadig er det seneste for kategorien — hvis et nyere kald allerede er startet, er det gamle kalds revert et no-op, så det ikke kan overskrive et senere (evt. allerede gemt) resultat. `npx tsc --noEmit` ren.

**Testet 14-07-2026 (Michael, rigtig iPhone):** Hurtig dobbelt-drag i samme kategori efterfulgt af genindlæsning — rækkefølgen matchede korrekt, ingen ændringer sprang tilbage. Bemærk: dette beviser ikke racen specifikt (kræver en reelt fejlende Firestore-write præcist mens et andet kald er i flight, hvilket ikke kan fremtvinges pålideligt manuelt) — men bekræfter ingen regression i normal brug. **BUG-08 markeres rettet** på baggrund af kodeanalysen + denne regressionstest.

---

## BUG-09 — ICY-support caches forkert ved delvise stream-fejl
**Fil:** `api/icy-meta.ts:52` · **Prioritet:** Mellem

**Fund:** Flere transient-fejl-grene (ikke-OK svar, tom metaint, for stor metaint, kort buffer) returnerer `{ title: null }` uden `icySupported`-feltet, hvilket `Player.tsx`'s polling-logik behandler identisk med "ICY bekræftet understøttet" i stedet for "ukendt/ikke understøttet".

**Fejlscenarie (finder):** `Player.tsx` stopper kun polling, når `data.icySupported === false`; enhver anden form (inkl. `{title:null}` uden `icySupported`-nøgle) falder i else-grenen, der sætter `icySupportedRef.current = true`. For en station, hvis upstream-stream lejlighedsvis svarer 200, men returnerer en fejlbehæftet/for stor `icy-metaint` eller en afkortet metadata-blok, lærer den 30-sekunders polling-løkke i `Player.tsx` aldrig, at stationen reelt er ikke-ICY, og fortsætter med at kalde `/api/icy-meta` hvert 30. sekund gennem hele afspilningen — modsat en ægte ikke-ICY-stream (intet `icy-metaint`-header), som korrekt stopper efter første request.

**Verifikations-bevis (uafhængig agent):** `api/icy-meta.ts` har fire fejlstier, der returnerer `{title:null}` uden nogen `icySupported`-nøgle overhovedet: linje 52 `if (!response.ok || !response.body) { ... return res.json({ title: null }) }`, linje 64-65 (for stor/ugyldig metaint) `if (!metaint || metaint <= 0 || metaint > 65536) { ... return res.json({ title: null }) }`, linje 91 `if (buffer.length <= metaint) return res.json({ title: null })`, og catch-all'en på linje 115-117 `catch { return res.json({ title: null }) }`. Imens tjekker `Player.tsx` (linje 50-51) kun det eksplicitte-false-signal: `if (data.icySupported === false) { icySupportedRef.current = false; return } icySupportedRef.current = true`. Ethvert svar uden `icySupported`-nøglen (alle fire grene ovenfor) falder igennem til `icySupportedRef.current = true`, så en station, hvis stream returnerer fx en fejlbehæftet/for stor `icy-metaint` (deterministisk reproducerbar hver request, ikke bare transient), er permanent markeret ICY-understøttet og polles hvert 30. sekund for hele afspilningssessionen — modsat en ægte ikke-ICY-stream (manglende `icy-metaint`-header, linje 56-58), som korrekt sætter `icySupported:false` og stopper polling efter én request.

**Rettet 14-07-2026:** Alle fire identificerede fejlgrene i `api/icy-meta.ts` returnerer nu eksplicit `icySupported: false` (ikke-OK svar, ugyldig/for stor metaint, for kort buffer, og catch-all). `Player.tsx` er ikke ændret — den korrekte gren (`icySupported === false`) fandtes allerede, den manglede blot at blive sat konsekvent. Bemærk: `icySupportedRef` nulstilles i forvejen ved hvert stations-/afspilningsskift (`Player.tsx:33`), så en enkelt fejlramt session stopper ikke metadata-forsøg permanent på tværs af fremtidige afspilninger. Standalone type-check af `api/icy-meta.ts` ren.

**Testet 14-07-2026 (Michael, rigtig iPhone):** DR-station viser fortsat sangtitel korrekt (regression bekræftet OK). Ved skift til en radio SAW-station (ikke-ICY) opdagede Michael dog en **separat, ægte fejl**: den viste den **gamle titel fra DR-stationen** i stedet for ingen titel. Dette var ikke en konsekvens af selve BUG-09-rettelsen (den pågældende "intet icy-metaint-header"-gren havde allerede `icySupported:false` fra starten, uændret af denne fix) — det er en uafhængig mangel i `Player.tsx`, som aldrig ryddede `meta`-state ved stationsskift. Logget og rettet separat som **BUG-16**. **BUG-09 selv markeres rettet** (den oprindelige cache-fejl er bekræftet løst).

---

## BUG-10 — Lyttetimer kan undertælle ved hurtigt app-skift (iOS)
**Fil:** `src/store/useRadioStore.ts:100` · **Prioritet:** Mellem

**Fund:** `visibilitychange`-handleren kan fyre, før den 300ms `setTimeout` fra den eksterne pause-håndtering resolver, hvilket nulstiller `listenStartedAt` uden at folde forløbet tid ind i `listenAccumulatedMs`.

**Fejlscenarie (finder):** På iOS fyrer `pause`-eventet først ved baggrundslægning og planlægger en 300ms `setTimeout` (linje ~79), før `visibilityState` overhovedet rapporterer "hidden". Hvis brugeren vender tilbage til forgrunden inden for det 300ms-vindue (fx et meget hurtigt app-skift), kører `visibilitychange`-lytteren først: den ser `isPlaying:true && a.paused`, og — ifølge kommentaren "listenAccumulatedMs er allerede korrekt — background pause handler snapshotted it" — sætter kun `listenStartedAt: null` uden at lægge `Date.now() - listenStartedAt` til `listenAccumulatedMs`. Den snapshot-antagelse er falsk i denne rækkefølge: pause-lytterens `setTimeout` er endnu ikke kørt, så den forløbne spilletid mellem sidste `listenStartedAt` og dette øjeblik tabes permanent, og lyttetimeren undertæller forløbet lyttetid fra det tidspunkt i sessionen.

**Verifikations-bevis (uafhængig agent):** `visibilitychange`-handleren destrukturerer state UDEN `listenStartedAt`: `const { isPlaying, listenAccumulatedMs, currentStation } = useRadioStore.getState()` (linje 100), og gør derefter på `isPlaying && a.paused`-grenen kun `useRadioStore.setState({ isPlaying: false, isBuffering: false, listenStartedAt: null })` (linje 103) — den lægger aldrig `Date.now() - listenStartedAt` til `listenAccumulatedMs`, og stoler udelukkende på kommentarens antagelse om, at "baggrundens pause-handler snapshottede det" (linje 102). Men det snapshot sker kun inde i pause-lytterens `setTimeout(() => {...}, 300)` (linje 79-90), som skriver `listenAccumulatedMs: snapshotMs` kun når den fyrer. Ifølge projektets egen dokumenterede rækkefølge ("pause-event fires on iOS FØR visibilityState skifter til hidden") er sekvensen: pause fyrer og armerer 300ms-timeout'en (linje 79) → `visibilitychange` til "hidden" fyrer, men returnerer tidligt (linje 98, state !== "visible") → hvis brugeren vender tilbage til forgrunden inden for de 300ms, fyrer `visibilitychange` igen med "visible", rammer `isPlaying&&a.paused`-grenen (isPlaying er stadig true, og a.paused er allerede true fra den reelle eksterne pause) FØR `setTimeout`'en er eksekveret. På det tidspunkt er storens `listenAccumulatedMs` stadig den før-pause-værdi, så den forløbne tid mellem det oprindelige `listenStartedAt` og nu tabes stille, når `listenStartedAt` nulstilles på linje 103. Dette matcher præcis den påståede race og undertæller permanent lyttetid for den session.

**Rettet 14-07-2026:** `visibilitychange`-handleren destrukturerer nu også `listenStartedAt`, og folder — ligesom de andre pause-grene i filen — selv `Date.now() - listenStartedAt` ind i `listenAccumulatedMs` (kun hvis `listenStartedAt` stadig er sat; er den allerede `null`, fordi pause-handlerens 300ms-timeout nåede at køre først, sker der ingen dobbelttælling). `npx tsc --noEmit` ren.

**Testet 14-07-2026 (Michael, rigtig iPhone):** Gentagne hurtige appskift mens en station spillede — lyttetimeren opførte sig fornuftigt, ingen synlige spring frem/tilbage. Bemærk: dette beviser ikke racen specifikt (kræver <300ms timing, som ikke kan fremtvinges pålideligt i hånden) — men bekræfter ingen regression. **BUG-10 markeres rettet** på baggrund af kodeanalysen + denne regressionstest.

---

## BUG-11 — Dødt `postMessage`-lytter for lukning af brugervejledning
**Fil:** `src/App.tsx:23` · **Prioritet:** Lav (cleanup) · *droppet fra top-10 i den oprindelige rapport pga. lavest prioritet, men verificeret*

**Fund:** Dødt `postMessage`-lytter for "close-guide" forbliver, selvom guide-HTML'en ikke længere sender nogen `postMessage`.

**Fejlscenarie (finder):** CLAUDE.md dokumenterer: "App.tsx modal-header har 'Luk ✕'-knap som lukker modalen; guide-HTML sender ingen postMessage mere (den sticky nav er fjernet)." Bekræftet ved grep: `public/guide/index.html` indeholder nul `postMessage`-kald. `useEffect`'en på linje 22-29 i `App.tsx` registrerer stadig en `window.addEventListener('message', onMessage)`, der tjekker for `e.data === 'close-guide'` — denne gren kan aldrig eksekvere, da intet længere poster den besked, hvilket gør effekten til dead code, som en fremtidig vedligeholder fejlagtigt kan tro er guide-luk-mekanismen (det er den ikke — det er "Luk"-knappens onClick), når modalen fejlsøges.

**Verifikations-bevis (uafhængig agent):** `src/App.tsx:23-26`: `const onMessage = (e: MessageEvent) => { if (e.origin !== window.location.origin) return; if (e.data === 'close-guide') setShowGuide(false) }` registreret via `window.addEventListener('message', onMessage)`. Grep af `public/guide/index.html` for "postMessage" returnerer ingen matches, hvilket bekræfter, at intet nogensinde sender "close-guide". Dette matcher CLAUDE.md's eksplicitte note om, at guide-HTML'en ikke sender postMessage mere, siden den sticky nav blev fjernet, og modalen reelt lukkes via "Luk ✕"-knappens onClick. Lytteren er uopnåelig dead code.

**Rettet 14-07-2026:** `useEffect`-blokken med `onMessage`-lytteren er fjernet fra `App.tsx`. Guide-modalen lukkes fortsat udelukkende via "Luk ✕"-knappens `onClick={() => setShowGuide(false)}`, som var uændret upåvirket. `npx tsc --noEmit` ren.

---

## BUG-12 — `check-streams.mjs` tjekker alle 80 stationer sekventielt
**Fil:** `check-streams.mjs:122` · **Prioritet:** Lav (effektivitet) · *droppet fra top-10 i den oprindelige rapport pga. lavest prioritet, men verificeret*

**Fund:** Stream-tilgængeligheds-tjek kører én station ad gangen med 8s HTTP-timeout (+evt. 403-retry +TCP-fallback) i stedet for parallelt.

**Fejlscenarie (finder):** `for (const station of stations) { const result = await checkStream(station.streamUrl) ... }`-løkken (linje 122) afventer hver af de ca. 80 stationers tjek sekventielt; en langsom/utilgængelig stream kan koste op til 8s (HTTP) + 8s (403-retry) + 5s (TCP-fallback) = ca. 21s, før den går videre til næste station. Med bare en håndfuld døde streams kan en rutinemæssig kørsel af dette dokumenterede vedligeholdelsesscript (listet i CLAUDE.md's Hjælpescripts) tage mange minutter i stedet for de få sekunder en concurrency-begrænset `Promise.all`/`allSettled`-batch ville tage, da tjekkene er uafhængig I/O uden delt state.

**Verifikations-bevis (uafhængig agent):** `check-streams.mjs:122-123` `for (const station of stations) { const result = await checkStream(station.streamUrl) ... }` behandler stationer strengt én ad gangen. `checkStream` (linje 84-106) afventer selv sekventielt `checkStreamHttp` (8000ms timeout, linje 24/85), derefter ved 403 endnu et `checkStreamHttp` uden ICY-header (8000ms timeout, linje 90), derefter ved netværksfejl et `checkStreamTcp`-fallback (5000ms timeout, linje 99). Ingen `Promise.all`/`allSettled` eller concurrency-begrænser bruges nogen steder i filen, så en håndfuld langsomme/døde streams blandt de ca. 80 stationer hentet fra Firestore (linje 109-112) kan lægge minutter til wall-clock-tiden, som parallel batching ville undgå, da hver stations tjek er uafhængig I/O uden delt state.

**Rettet 14-07-2026:** Tilføjet en lille hånd-rullet concurrency-pool (`runWithConcurrency`, ingen ny dependency) — kører stream-tjek med op til 8 samtidigt i stedet for én ad gangen. Resultater samles og logges i original (kategori/navn-sorteret) rækkefølge, uændret output-format. `node --check check-streams.mjs` — syntaks ren. Ikke kørt fuldt igennem mod alle 80 stationer (ville tage flere minutter og ramme skrive-mod-produktion-reglen unødigt, da scriptet kun læser) — logikken er dog simpel og velkendt (fast antal parallelle "runners" der trækker fra en delt kø).

---

## BUG-13 — Duplikeret Firebase-init-boilerplate i 17 hjælpescripts
**Fil:** rodmappe — `add-dance-stations-jun2026.mjs`, `add-danish-stations-jun2026.mjs`, `add-italo-mix.mjs`, `add-italo-stations.mjs`, `add-new-stations-jun2026.mjs`, `add-new-stations.mjs`, `add-rock-stations-jun2026.mjs`, `check-duplicates.mjs`, `check-streams.mjs`, `fix-big70s-stream.mjs`, `fix-veronica-stream.mjs`, `list-stations.mjs`, `migrate-stations.mjs`, `set-bitrates.mjs`, `set-countries.mjs`, `set-logo.mjs`, `test-all-streams.mjs` · **Prioritet:** Lav (cleanup) · *droppet fra top-10 i den oprindelige rapport pga. lavest prioritet, men verificeret*

**Fund:** 17 rod-`.mjs`-scripts genimplementerer hver især identisk Firebase-init- og `.env`-parsing-boilerplate i stedet for at dele ét hjælpemodul.

**Fejlscenarie (finder):** Alle 17 filer duplikerer de samme ca. 10-15 linjer, der læser og parser `.env` og kalder `initializeApp({...seks VITE_FIREBASE_*-nøgler...})` (nogle via `readFileSync`-linjesplitning, én via `process.env` direkte — `set-countries.mjs` gør faktisk begge dele, én gang for et config-objekt der straks kasseres). Hvis `.env`-formatet nogensinde ændres (fx quoted values, kommentarer, multiline secrets), eller en Firebase-config-nøgle omdøbes, skal hver af disse 17 filer have samme rettelse anvendt individuelt; et overset script bliver stille ved med at bruge forældet/ødelagt config, næste gang nogen kører det mod produktions-Firestore.

**Verifikations-bevis (uafhængig agent):** Hver af de 17 filer duplikerer uafhængigt `.env`-parsing + `initializeApp`-boilerplate, fx `add-dance-stations-jun2026.mjs:7-19`: `const env = Object.fromEntries(readFileSync('.env','utf8').split('\n').filter(l=>l.includes('=')).map(l=>l.split('=').map(s=>s.trim()))); const app = initializeApp({apiKey: env.VITE_FIREBASE_API_KEY, ...})` — det identiske mønster gentages ordret i de øvrige 15 add-/fix-/set-/list-/check-/migrate-/test-scripts. `set-countries.mjs:3-10` læser i stedet direkte `apiKey: process.env.VITE_FIREBASE_API_KEY` uden nogen `.env`-parsing overhovedet — hvilket bekræfter divergens-risikoen nævnt i fundet (ét script afviger allerede fra resten og ville ikke modtage samme rettelse, hvis `.env`-formatet ændredes). Ingen af disse 17 filer importerer et delt config-hjælpemodul eller `src/firebase/config.ts`.

**Rettet 14-07-2026:** Oprettet `firebase-init.mjs` i rodmappen — læser `.env` og eksporterer en færdig `db`-instans. Alle 17 scripts opdateret til `import { db } from './firebase-init.mjs'` i stedet for at duplikere init-koden; `set-countries.mjs`s afvigende dobbelte `process.env`-tilgang (inkl. det ubrugte, straks-kasserede `firebaseConfig`-objekt) er fjernet og erstattet med samme mønster som de øvrige 16. Alle 17 filer syntaks-tjekket med `node --check` — rene. `list-stations.mjs` kørt live mod produktions-Firestore (læs-kun, ingen skrivning) for at bekræfte den delte init reelt virker — output matcher det forventede.

---

## BUG-14 — iOS-keepalive (låseskærm-hack) fjernet helt efter afvejning
**Fil:** `src/audio.ts`, `src/store/useRadioStore.ts` · **Prioritet:** Kritisk · *fundet 14-07-2026 ved Michaels egen test, ikke en del af den oprindelige 13-punkts kodegennemgang*

**Fund:** `startKeepalive()` (den 18 Hz subsoniske WAV-loop, der forhindrer iOS i at deaktivere audio-sessionen når streamen er pauset — se CLAUDE.md's iOS-audio-arkitektur-afsnit) bliver kun genstartet automatisk ved en *ekstern* pause (AirPods ear-detection, telefonopkald — `useRadioStore.ts`'s `pause`-event-listener, linje 72-75, guardet af `if (!isPlaying) return`). Når brugeren selv trykker pause i appens player-bar, sætter `togglePlay()`s pause-gren `isPlaying:false` **før** den rigtige `a.pause()` kaldes (fade-out-mekanismen) — så guarden på linje 74 springer over, og `startKeepalive()` bliver **aldrig** kaldt for en bevidst, selv-initieret pause. Keepalien'en er ganske vist allerede startet én gang i `playStation()`, da afspilningen først begyndte, og intet eksplicit stopper den ved en almindelig pause — men der er heller intet, der *bekræfter/genstarter* den på selve pause-tidspunktet, hvilket er den eneste garanterede lejlighed til at gøre det, før siden evt. baggrundslægges/JS-eksekvering throttles af iOS.

**Michaels observation:** "Hvor jeg før kunne se WebRadio på låseskærmen på iPhone forsvinder den nu hvis jeg trykker på pause i app'en og slukker telefonen." — dvs. WebRadios "Now Playing"-widget forsvinder fra låseskærmen, efter en manuel pause i appen efterfulgt af at telefonen låses/slukkes for skærmen. Dette modsiger den dokumenterede hensigt: "Loops a silent WAV to keep the iOS audio session alive while the stream is paused, so WebRadio stays 'Now Playing' on the lock screen" (`audio.ts`).

**Implementeret løsning 14-07-2026:** `togglePlay()`s manuelle pause-gren kalder nu eksplicit `if (isIOS) startKeepalive()` synkront, i samme øjeblik pausen sker — samme ét-linje-mønster som allerede bruges i `playStation()` og i MediaSession's `play`-handler. `startKeepalive()` er idempotent (tjekker `_keepalive.paused` før den kalder `.play()` igen), så det er harmløst at kalde den, selvom loopet allerede kører.

**Vigtig forbehold — kan ikke fuldt verificeres herfra:** Denne rettelse er baseret på grundig kodeanalyse (ingen anden kodesti i projektet kalder `startKeepalive()` ved en bevidst in-app-pause), men selve iOS' interne beslutning om, hvornår en baggrundslagt Safari-fanes audio-session helt deaktiveres, kan ikke simuleres i en desktop-browser eller headless Playwright — det kræver et rigtigt iPhone. Hvis problemet fortsætter efter denne rettelse, er den mest sandsynlige næste hypotese, at iOS under visse omstændigheder deaktiverer *hele* sidens audio-session (inkl. keepalive-loopet) et stykke tid efter baggrundslægning, uanset om keepalive var aktiv ved pause-tidspunktet — hvilket i så fald ville kræve en anden tilgang (fx Background Audio-registrering, eller accept af en platformsbegrænsning).

**Test ønsket fra Michael:** Pause i appen → lås telefonen → tjek låseskærmen efter hhv. et par sekunder, ét minut og nogle minutter, for at afgøre om fixet løser det, eller om det kun udskyder forsvindingen.

**Opfølgning 14-07-2026 — Michaels indvending:** En vedvarende 18 Hz-tone kan gøre en tilsluttet subwoofer (fx Sonos "Stue" hjemmebiograf-gruppen) hørbart brummende, selv ved lav dBFS — alm. højttalere (inkl. iPhonens egen) kan ikke gengive 18 Hz, men en subwoofer er netop designet til det. At blot skrue ned for `_keepalive`-elementets `volume`-egenskab løser ikke problemet særskilt — det giver matematisk samme lydstyrke ved højtaleren som at sænke amplituden i selve WAV-filen (begge er blot forskellige veje til samme gain), og for lavt vil samme "PCM-stilhed"-detektion i iOS (som tonen oprindeligt blev opfundet for at omgå) formentlig slå til igen.

**Valgt løsning (afprøves først, inden evt. amplitude-reduktion):** Tidsbegræns keepalive-loopet til maks. **90 sekunder** efter en pause uden resume, i stedet for at lade det køre i det uendelige. Implementeret via `keepaliveStopTimer`/`armKeepaliveAutoStop()`/`cancelKeepaliveAutoStop()` i `useRadioStore.ts`:
- Enhver `startKeepalive()`-kald (ekstern pause, manuel in-app-pause, MediaSession play-genaktivering, `playStation()`-start) arm'er nu samtidig en 90-sekunders auto-stop-timer.
- Timeren annulleres øjeblikkeligt, så snart ægte afspilning bekræftes (audio-elementets native `'playing'`-event, som alle afspilnings-veje i appen deler via samme singleton-element) — ingen grund til at lade timeren tælle ned, hvis brugeren rent faktisk genoptog afspilningen.
- Hvis intet resumer inden for 90 sekunder, stopper keepalien'en automatisk sig selv (`stopKeepalive()`), og WebRadio kan forventeligt forsvinde fra låseskærmen derefter — en bevidst afvejning: kort, begrænset eksponering for en evt. hørbar brummen, i stedet for uendelig.

**Verifikation:** `npx tsc --noEmit` ren, `eslint` kun de 4 kendte, urelaterede `no-empty`-linjer. Kørt en hurtig regressionstest lokalt (klik→afspil, pause, resume) for at bekræfte, at selve afspilningsflowet er upåvirket — bestået. Selve 90-sekunders-timeren og dens interaktion med iOS' reelle audio-session-håndtering (herunder om brummen reelt forsvinder, og om låseskærmen opfører sig som ventet inden for/efter de 90 sek.) **kan kun testes på en rigtig iPhone** — afventer Michaels test.

**Endelig beslutning 14-07-2026 — keepalive fjernet helt:** Michael vurderede, at den tidsbegrænsede tone stadig ikke var en god løsning — den holder telefonen unødigt aktiv/strømforbrugende under en pause, uanset varighed. Hele keepalive-mekanismen er derfor fjernet: `src/audio.ts`s `startKeepalive()`/`stopKeepalive()`/`buildKeepaliveUrl()` og al `_keepalive`/`_silentUrl`-state slettet; alle kald samt `armKeepaliveAutoStop()`/`cancelKeepaliveAutoStop()`/`keepaliveStopTimer` fjernet fra `useRadioStore.ts`. `isIOS`-importen i `useRadioStore.ts` blev også overflødig og fjernet (var kun brugt til keepalive-gating).

**Konsekvens (accepteret, ikke en fejl):** WebRadio kan nu forsvinde fra låseskærmen, efter en pause og baggrundslægning af telefonen — iOS' standardopførsel uden en aktiv holdt-i-live-mekanisme. CLAUDE.md er opdateret til at dokumentere dette som et bevidst valg (batteri/lyd-renhed prioriteret over garanteret låseskærms-persistens).

**Verifikation:** `npx tsc --noEmit` ren, `eslint` uændret (kun de 4 kendte, urelaterede `no-empty`-linjer), ingen resterende referencer til keepalive nogen steder i `src/` (grep-verificeret). **BUG-14 er lukket** — pending Michaels bekræftelse på iPhone af, at almindelig afspil/pause/resume og strømforbrug er tilfredsstillende uden keepalive.

**Opfølgende research 14-07-2026 — sammenligning med dr.dk/lyd:** Michael testede DR's egen webafspiller (P3) med præcis samme scenarie (afspil → pause fra låseskærm → vent → tryk PLAY). Research bekræftede via faktisk netværksinspektion (Playwright, klik på DR's reelle "Spil P3"-knap, ikke gæt): DR's live-radio afspilles via **HLS** (`drliveradio2.akamaized.net/hls/live/.../p3/playlist-96000.m3u8` m.fl., adaptiv bitrate, `.ts`-segmenter) — en helt anden teknologi end WebRadios kontinuerlige MP3/Icecast-streams (inkl. WebRadios egen DR-station, som bruger `live-icy.gss.dr.dk/A/A29H.mp3`, IKKE DR's HLS-feed).

**Efterfølgende test viste dog, at DR har samme grundlæggende begrænsning:** Ved længere baggrundslægning forsvinder DR's afspiller *også* fra låseskærmen, og direkte PLAY-tryk på låseskærmen virker heller ikke der — kun at genåbne Safari-appen får musikken til at fortsætte. Forskellen er, at DR's genoptagelse fortsætter **fra samme sted** (ikke "live nu"), fordi HLS-streamen har et tidsforskudt/DVR-vindue at spole i (heraf de synlige 10-sek. spol-ikoner på låseskærmen) — noget en almindelig Icecast/MP3-stream ikke har noget tilsvarende af.

**Konklusion:** Låseskærm-begrænsningen (kan forsvinde og kræve genåbning af appen efter en pause) rammer tilsyneladende **både** DR's professionelle HLS-baserede afspiller og WebRadios MP3-baserede afspilning — det er ikke et tegn på, at WebRadio afspiller kanalerne forkert, men at Icecast/MP3 (som 80 ud af 80 stationer reelt leverer, inkl. DR via WebRadio) mangler den DVR-buffer, HLS kan tilbyde. At matche DR's fulde adfærd ville kræve at skifte til HLS, hvilket kun DR selv leverer blandt kilderne — ikke noget WebRadio kan løse generelt uden at bygge en dedikeret transskoderings-backend (vurderet uforholdsmæssigt stort, se ovenfor).

**Endelig beslutning 14-07-2026:** Michael accepterer "genåbn appen efter hver pause, hvis den er forsvundet fra låseskærmen" som normal, forventet adfærd. Intet yderligere arbejde planlagt på dette punkt.

---

## BUG-15 — PLAY på låst skærm efter pause fejler stille og dræber medie-sessionen
**Fil:** `src/store/useRadioStore.ts:298` (`togglePlay()`'s resume-gren) · **Prioritet:** Kritisk · *fundet af Michael under manuel test af BUG-04/05 på iPhone, 14-07-2026*

**Fund:** `togglePlay()`'s resume-gren tvinger altid en fuld genforbindelse (`a.src = currentStation.streamUrl`) før `a.play()`, og sætter `isPlaying:true` optimistisk, før play()-promise'et er afgjort. Når dette trigges fra MediaSession's `play`-handler mens telefonen er låst og appen er baggrundslagt, strupper iOS netværksadgangen så hårdt, at genforbindelsen aldrig når at levere lyd — men `a.play()`-promise'et afvises heller aldrig (det hænger i pending), så BUG-05's fejl-catch aldrig trigges.

**Reproduktion (bekræftet 2× af Michael på rigtig iPhone):**
1. Spil en station i appen, forlad appen (baggrundslæg), lås telefonen.
2. Væk skærmen — widget viser korrekt afspilning.
3. Tryk pause på låseskærmen — widget bliver korrekt stående, viser "play"-ikon.
4. Vent 10 sek., væk skærmen igen — widget stadig der, korrekt paused.
5. Tryk PLAY på låseskærmen.
6. Efter ca. 5 sekunder: ingen lyd, widget viser "Afspiller ikke", derefter forsvinder widget'en helt (låseskærm tom).

**Bonus-observation (Michael):** Når man derefter selv åbner appen igen, begynder den sidst spillede station automatisk at afspille — **uden** at man selv vælger/trykker på stationen.

**Sandsynlig årsag (kodeanalyse, endnu ikke root-cause-bekræftet på enheden):**
- `togglePlay()`'s resume-gren (linje 297-304) sætter `isPlaying:true` synkront, samtidig med at den kalder `a.src = ...` (fuld reconnect) + `a.play()`. Ingen throttling/timeout på selve genforbindelsen.
- Når trigget fra en låst/baggrundslagt kontekst, strupper iOS Safaris baggrunds-netværksadgang så meget, at stream-handshaket aldrig fuldføres — `a.play()`-promise'et bliver hverken opfyldt eller afvist, det hænger blot. BUG-05's `.catch()` (linje 299-302) trigges derfor **aldrig** i dette specifikke scenarie, selvom det var netop denne slags fejl, den skulle fange.
- Efter ca. 5 sekunder konkluderer iOS selv (uden om vores JS), at "playing"-sessionen aldrig producerede faktisk lyd, og deaktiverer hele medie-sessionen — heraf "Afspiller ikke" og at widget'en forsvinder.
- Storen sidder derefter fast med `isPlaying:true`, mens `a.paused === true` i virkeligheden. Når appen senere bringes til forgrunden, opdager den eksisterende `visibilitychange`-reconciler (linje 95-112) uoverensstemmelsen (`isPlaying && a.paused`), sætter `isPlaying:false` og arm'er `_shouldResume`. Første klik hvor som helst i appen (linje 118-130) udløser derefter en ny reconnect, som **denne gang lykkes** (appen er i forgrunden, fuld netværksadgang) — hvilket brugeren oplever som "sidste kanal starter automatisk", uden selv at have trykket play på noget.

**Vigtigt forbehold:** Dette er en hypotese baseret på kodeanalyse og de observerede symptomer — det er **ikke** verificeret med faktisk netværks-/devtools-inspektion på enheden (kan være svært, da Safari remote debugging kræver kabelforbindelse til en Mac). Det kan også hænge sammen med BUG-14's underliggende platformsbegrænsning (ingen keepalive-mekanisme længere til at holde audio-sessionen "levende" under en pause) — dvs. dette kan være endnu en facet af samme grundlæggende iOS-begrænsning, snarere end noget der kan rettes fuldstændigt i JS.

**Mulige retninger (ikke besluttet endnu):**
- Undgå at sætte `isPlaying:true` optimistisk før `a.play()` reelt er lykkedes (kun opdatere UI/MediaSession til "playing" i `.then()`, ikke synkront) — ville i det mindste undgå at UI/lyttetimer lyver om tilstanden, selvom widget'en muligvis stadig forsvinder.
- Tilføj en timeout (fx 3-4 sek.) på resume-forsøget: hvis `a.play()` hverken er opfyldt eller afvist inden for den tid, antag fejl og revert selv, i stedet for at vente på et reject der måske aldrig kommer.
- Accepter som endnu en platformsbegrænsning i samme ånd som BUG-14, hvis det viser sig, at intet JS-niveau kan overvinde iOS' baggrunds-netværksstrupning af et låst-skærms-tryk.

**Status:** Åben — afventer beslutning om retning, samt evt. yderligere test for at isolere om timeout-tilgangen (revert efter et par sekunder uden held) reelt forbedrer noget, eller om iOS-begrænsningen gør ethvert forsøg på baggrunds-reconnect udsigtsløst.

**Manuel test 14-07-2026 (Michael, rigtig iPhone) — reproduceret 3/3 gange:**

| TC# | Testnavn | Resultat |
|---|---|---|
| TC-04-01 | Genklik på pauseret station reconnecter (i app'en) | 🟢 Godkendt |
| TC-04-02 | Klik på allerede spillende station (regression) | 🟢 Godkendt |
| TC-05-01 | Låseskærm pause → vent 10 sek → PLAY | 🔴 Fejlet — "Afspiller ikke" efter ~5 sek, widget forsvinder, ingen lyd |
| TC-05-02 | Hurtigt spam-klik play/pause i selve app'en (forgrund) | 🟢 Godkendt — UI/lyd/tæller matcher altid |
| TC-05-03 | Pause på låseskærm → vent 30+ sek (skærm helt sort) → PLAY | 🔴 Fejlet — samme symptom som TC-05-01 |

BUG-04 og BUG-05 er begge bekræftet virkende for deres respektive scenarier (reconnect ved genklik i app'en; korrekt UI-state ved hurtige toggles i forgrunden). Men det oprindelige problem, der udløste BUG-05 ("PLAY på låst skærm virker ikke"), er stadig til stede — blot med nyt symptom (stille session-nedbrud + auto-resume ved næste app-åbning, i stedet for fastfrossen UI). BUG-15 dækker dette resterende, ikke-løste scenarie.

**Yderligere observation efter TC-05-03 (Michael):** Denne gang startede intet automatisk op ved genåbning af appen (modsat TC-05-01, hvor samme kanal auto-resumede) — sandsynligvis fordi `isPlaying` nåede at blive `false` ad en anden kodesti (den eksterne `pause`-event-lytter) inden `visibilitychange` kunne arme `_shouldResume`, afhængig af præcis timing. Da Michael derefter selv trykkede på samme station, startede afspilningen **hakkende/skrattende** — ikke rent. Skift til en anden kanal startede rent; skift tilbage til den oprindelige (tidligere hakkende) kanal spillede nu også rent.

**Ny hypotese:** `playStation()`s reconnect-skip-optimering (`if (a.src !== station.streamUrl || !wasPlaying)`, linje 253) antager, at "samme URL + var spillende" betyder en sund forbindelse, den kan genbruge uden reset. Men efter et mislykket baggrunds-genforbindelsesforsøg (BUG-15) kan `a.src` sidde tilbage i en halvdød/korrupt netværkstilstand under samme URL — hvorved genbrug af forbindelsen (i stedet for fuld nulstilling) giver hakkende lyd, indtil et rigtigt `src`-skift (til en anden kanal og tilbage) tvinger en frisk forbindelse igennem. Dette styrker sporet "eksplicit oprydning ved timeout" som løsningsretning — se løsningsforslag ovenfor.

**Delvis rettelse implementeret 14-07-2026 (Michaels forslag):** Michael foreslog, at enhver igangværende/gammel stream eksplicit stoppes, før en ny forbindelse sættes op. `togglePlay()`'s resume-gren (`useRadioStore.ts:297-302`) manglede et `a.pause()`-kald før `a.src`-nulstillingen — i modsætning til `playStation()`, som allerede gjorde dette i sin reconnect-branch. Tilføjet:
```js
if (currentStation) {
  a.pause()
  a.src = currentStation.streamUrl
}
```
`a.pause()` er et synkront, lokalt kald (ingen netværks-I/O, ingen målbar forsinkelse) — tilføjer ikke ventetid til reconnect, som allerede skete i denne gren. `playStation()`s eksisterende "spring reconnect over ved klik på allerede-spillende station"-optimering (bekræftet hik-fri i TC-04-02) er **ikke** ændret, så den forbliver upåvirket. `npx tsc --noEmit` — ren.

Dette retter formentlig den hakkende/skrattende genafspilning, Michael observerede efter et BUG-15-scenarie (manuel klik på samme station efter mislykket baggrunds-resume) — men retter **ikke** selve BUG-15's kerneproblem (ingen lyd overhovedet ved første PLAY-tryk på låst skærm), som stadig afventer beslutning (timeout-revert, dybere undersøgelse, eller accept som platformsbegrænsning).

**Bekræftet 14-07-2026 (Michael, rigtig iPhone, deployet commit `f0db0b2`):** Kørte hele BUG-15-scenariet igennem igen (pause på låst skærm → PLAY → "Afspiller ikke"/widget forsvinder), gik derefter ind i appen og tappede samme station manuelt. Afspilningen startede nu **rent**, ingen hakken/skratten. Delvis rettelse bekræftet virkende. Kerneproblemet (ingen lyd ved selve låseskærm-PLAY-trykket) er stadig åbent.

**Relateret observation 14-07-2026 (Michael) — samme grundproblem, anden udløser (app-skift/Safari, ikke låseskærm):** Michael afspillede en station, swipede til Safari (eb.dk), navigerede til en artikel og trykkede "tilbage" — lyden stoppede præcis samtidig med at siden skiftede (mens WebRadio stadig var baggrundslagt). Ved tilbagevenden til WebRadio hørtes ca. **1 sekunds lyd, derefter stilhed** — et efterfølgende manuelt tryk på samme station fik den til at spille normalt igen. Et tilsvarende forsøg lige forinden (kortere Safari-besøg, ingen artikel-navigation) resulterede i **ren automatisk genoptagelse** uden noget tryk overhovedet.

**Sandsynlig mekanisme (kodeanalyse, ikke yderligere verificeret):** Når WebRadio baggrundslægges og iOS selv pauser lyden, opdaterer `pause`-lytteren (`useRadioStore.ts:71-89`) kun tidsbogføringen — ikke `isPlaying` — fordi appen er usynlig (bevidst designvalg mod UI-flicker). Ved tilbagevenden opdager `visibilitychange`-lytteren (linje 95-112) uoverensstemmelsen, sætter `isPlaying:false`, og arm'er `_shouldResume`. Næste tryk et sted i appen udløser en frisk genforbindelse via klik-lytteren (linje 118-130). I det ene tilfælde blev denne nye forbindelse stabil (ren auto-resume); i det andet blev den tilsyneladende afbrudt af iOS igen efter blot ca. 1 sekund — formentlig fordi appen lige var kommet i forgrunden og endnu ikke havde fuld baggrunds-lyd-tilladelse konsolideret. Appens egen eksterne-pause-detektion reagerede korrekt på denne nye afbrydelse (UI endte pauseret, ikke fastfrosset) — det er altså ikke en UI-desync-fejl, men en ægte, kortvarig forbindelsesustabilitet i selve genoptagelsen, sandsynligvis samme underliggende iOS-begrænsning som resten af BUG-15, blot udløst af app-skift/Safari-navigation i stedet for låseskærm-PLAY. Ikke yderligere undersøgt eller rettet — logget som kontekst for evt. fremtidig BUG-15-beslutning.

---

## BUG-16 — Gammel sangtitel bliver stående ved skift til en ikke-ICY-station
**Fil:** `src/components/Player.tsx:32` · **Prioritet:** Mellem · *fundet af Michael under manuel test af BUG-09 på iPhone, 14-07-2026*

**Fund:** `Player.tsx`'s metadata-effekt rydder kun `meta`-state (sangtitel/genre) når `!currentStation || !isPlaying` — ikke ved et almindeligt stationsskift. Når den nye station bekræftes ikke at understøtte ICY (`icySupported === false`), returnerer `fetchMeta()` tidligt uden nogensinde at kalde `setMeta(...)`, så den forrige stations sangtitel bliver stående på skærmen, som om den tilhørte den nye (forkerte) station.

**Fejlscenarie (Michael, verificeret på iPhone):** Afspil en DR-station — sangtitel vises korrekt. Skift til en radio SAW-station (ingen ICY-understøttelse, docs bekræfter denne stationsfamilie blokerer server-til-server-forespørgsler). I stedet for at vise ingen titel (korrekt for en ikke-ICY-stream), viser player-baren **stadig DR-stationens gamle sangtitel** — vildledende, da man kan tro titlen tilhører den nye station.

**Kodebevis:** `Player.tsx:32-58`. Effekten nulstiller `icySupportedRef.current = null` ved hvert stationsskift, men rydder kun `meta` via `setMeta({title:null, genre:null})` inde i den tidlige `if (!currentStation || !isPlaying)`-gren (linje 34-37) — ikke ubetinget. `fetchMeta()`'s eneste kald til `setMeta(...)` sker efter en bekræftet ICY-succes (linje 51-52); ved `data.icySupported === false` (linje 50) returnerer funktionen med det samme uden at røre `meta`. For en ny station, hvor selv det første kald bekræfter `icySupported:false`, bliver `meta` derfor aldrig opdateret — den forrige stations værdi lever videre uændret i React-state.

**Rettet 14-07-2026:** Effekten kalder nu ubetinget `setMeta({ title: null, genre: null })` med det samme ved hvert stations-/afspilningsskift, før den evt. korte-slutter på `!currentStation || !isPlaying`. Dette garanterer et rent udgangspunkt for enhver ny station, uanset om dens første metadata-forespørgsel lykkes, fejler, eller bekræfter manglende ICY-understøttelse — `fetchMeta()` opdaterer derefter kun `meta`, hvis der reelt er noget at vise. `npx tsc --noEmit` ren.

**Bekræftet 14-07-2026 (Michael, rigtig iPhone):** Skift fra en DR-station til en radio SAW-station — den gamle sangtitel forsvinder nu korrekt med det samme. **BUG-16 er lukket.**
