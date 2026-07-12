> **Status (2026-07-12): Denne plan er forældet/historisk.** Sonos-integrationen er fuldt færdig og udvidet ud over Fase 1/2 herunder — multi-rum (Bad/Køkken/Stue), volumen-styring og stop-funktion er tilføjet efterfølgende. Se `CLAUDE.md` → afsnittet "Sonos-integration" for den aktuelle, gældende arkitektur og tag-kontrakter. Denne fil bevares kun som historisk baggrund for Fase 1/2-beslutningerne.

# Opgave: "Spil på Sonos"-knap i webradio-app via Homey Pro (VERIFICERET arkitektur)

## Rolle og arbejdsform
Du er senior frontend-udvikler. Arbejd plan-først: Analysér kodebasen, præsentér en plan, og vent på min godkendelse før du ændrer kode. Vi arbejder i faser – **Fase 1 skal testes og godkendes af mig, før Fase 2 påbegyndes.**

## Status: Backend-kæden er FÆRDIG og testet

Hele kæden uden for webapp'en er bygget, fejlsøgt og verificeret end-to-end (2026-07-12):

```
Webapp (React/Vite/TS på Vercel)
  → GET https://webhook.homey.app/<HOMEY_ID>/playradio?tag=<url-encoded stream-URL>
  → Homey-flow "Spil Sonos Bad" (Logic webhook-trigger, event: playradio)
  → HomeyScript "playSonosUrl" (webhook-tag som argument)
  → Lokalt UPnP-kald (SetAVTransportURI + Play) til Sonos One "Sonos Bad" (192.168.0.122)
```

**Manuel browsertest bestået:** Kald af webhook-URL'en starter streamen på Sonos inden for 5–10 sek. (cloud-webhook + stream-buffering – forventeligt). Browseren svarer `OK`.

**Webapp'ens ENESTE opgave:** Send GET-kaldet med den aktuelle kanals stream-URL som URL-encoded `tag`-parameter. Intet andet. Ingen Sonos-, UPnP- eller Homey-logik i frontend.

## Verificeret webhook-kontrakt

```
GET https://webhook.homey.app/<HOMEY_ID>/playradio?tag=<encodeURIComponent(streamUrl)>
```

- `<HOMEY_ID>` skal ligge i env-variabel — commit den ALDRIG (fungerer som adgangsnøgle til Homey-webhooks).
- Event-navnet `playradio` ligger i URL-stien (IKKE som query-parameter — det gamle format `webhooks.athom.com/webhook/<id>?event=...` er forældet og svarer "Webhook Not Found").
- Svar: HTTP 200 med body `OK`. **Bemærk:** 200/OK betyder kun at webhooken er modtaget — det garanterer IKKE at afspilningen lykkedes. Succes kan ikke verificeres via HTTP.
- Kaldet går via Athoms cloud (kræver internet), men selve lyden streames lokalt af Sonos.

## Vigtige læringer fra fejlsøgningen (baggrund — påvirker design)

1. **Homeys officielle Sonos-flowkort "Afspil URL" er UBRUGELIGT til dette:** Det afspiller URL'en som et *audio clip* OVENPÅ den eksisterende session (dobbeltlyd, ingen volumenkontrol, kan ikke stoppes fra Sonos-appen). Må aldrig genindføres.
2. **Løsningen er lokal UPnP via HomeyScript:** `SetAVTransportURI` med prefix `x-rincon-mp3radio://` (skemaet `http(s)://` fjernes fra stream-URL'en) + DIDL-Lite-metadata med `upnp:class = object.item.audioItem.audioBroadcast`. Det skaber en ÆGTE session: korrekt "Spiller nu" i Sonos-appen, volumen/stop/play virker fra app, fysiske knapper og Homey-kort.
3. **Kanalskift:** Nyt webhook-kald med ny URL skifter rent (ingen dobbeltlyd) — testet.
4. **Live-streams kan ikke pauses,** kun stoppes/genoptages — Sonos-appen viser derfor STOP i stedet for PAUSE. Korrekt adfærd.
5. **HLS-streams (.m3u8) virker sandsynligvis IKKE** med x-rincon-mp3radio (kun Icecast/Shoutcast MP3/AAC). Kanaler med HLS-streams skal identificeres og håndteres i UI (skjul/deaktivér Sonos-knap).

## HomeyScript "playSonosUrl" (reference — ligger allerede på Homey, skal IKKE ændres af dig)

```javascript
// args[0] = stream-URL, args[1] = valgfrit stationsnavn
const sonosIp = '192.168.0.122'; // Sonos Bad (DHCP-reserveret)
const streamUrl = args[0].replace(/^https?:\/\//, '');
const rinconUri = `x-rincon-mp3radio://${streamUrl}`;
// + DIDL-Lite metadata (audioBroadcast) + SOAP SetAVTransportURI + Play
```

Scriptet modtager webhook-tagget som argument via flowkortet "Kør playSonosUrl med argument [Tag]".

## Fase 1: Minimal integration (STOP efter denne fase)

1. Analysér kodebasen: Find hvor kanaler/stream-URL'er er defineret og hvor player-UI'et bor. Præsentér din forståelse kort.
2. Opret `.env.local`-entry (og dokumentér at samme variabel skal sættes i Vercel):
   ```
   VITE_HOMEY_WEBHOOK_BASE=https://webhook.homey.app/<HOMEY_ID>
   ```
   Bed mig indsætte Homey-ID. Sørg for at `.env.local` er i `.gitignore`.
3. Implementér én funktion:
   ```typescript
   export async function playOnSonos(streamUrl: string): Promise<void> {
     const base = import.meta.env.VITE_HOMEY_WEBHOOK_BASE;
     const url = `${base}/playradio?tag=${encodeURIComponent(streamUrl)}`;
     await fetch(url, { mode: 'no-cors' }); // svaret skal ikke læses; no-cors undgår CORS-krav
   }
   ```
4. Tilføj en simpel, midlertidig "Spil på Sonos"-testknap for den aktuelt valgte kanal.
5. **STOP HER.** Jeg tester på hjemmenetværket og godkender.

**Acceptkriterie Fase 1:** Klik på knappen → Sonos Bad spiller kanalen inden for ~10 sek.

## Fase 2: Fuld løsning (først efter min godkendelse)

1. **UI:** Permanent "Spil på Sonos"-knap/ikon — foreslå placering ud fra eksisterende UI (aktuel kanal og/eller pr. kanal i listen).
2. **Feedback:** Kort ikke-blokerende bekræftelse "Sendt til Sonos" (husk: HTTP OK ≠ afspilning bekræftet; forvent 5–10 sek. forsinkelse — kommunikér evt. dette i UI).
3. **HLS-håndtering:** Detektér .m3u8/HLS-kanaler og deaktivér Sonos-knappen for dem med tooltip "Ikke understøttet på Sonos".
4. **Fejlhåndtering:** Netværksfejl → diskret fejlbesked. Sonos-funktionen må aldrig kunne crashe appen.
5. **Valgfrit (kun efter aftale):** Send også kanalnavn, så Sonos-appen viser stationsnavn i stedet for "Webradio". Standard Logic-webhook har kun ét tag — mulig kontrakt: tag = `navn|url` eller JSON-streng. Homey-siden (flow + script) tilpasser jeg selv; afklar kontrakten med mig først.

## Tekniske krav
- TypeScript, følg eksisterende kodestil og komponentstruktur.
- Ingen nye dependencies.
- Små, fokuserede commits pr. delopgave.
