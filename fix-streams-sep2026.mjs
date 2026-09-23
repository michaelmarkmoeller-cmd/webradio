// Retter forkerte/døde streams fundet ved icy-name-tjek af alle stationer (23-09-2026)
// Kør med: node fix-streams-sep2026.mjs
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { db } from './firebase-init.mjs'

const FIXES = [
  // Pegede på "Radio 10 Disco Classics"
  { id: 'pYz0PfRh96IGZTSwW5ab', expect: 'Radio 10 60s & 70s',
    data: { streamUrl: 'https://playerservices.streamtheworld.com/api/livestream-redirect/TLPSTR18.mp3' } },
  // Gammel stream24-URL gav 302 → 404
  { id: 'A6EMaQiezKwSuPs4gq31', expect: '95.5 Charivari Italo-Hits',
    data: { streamUrl: 'https://live.stream.charivari.de/955charivari-italohits' } },
  // Hovedkanal-URL'en sender nu kun Prince — skift til 80s80s DIGITAL (hovedkanalen på 80s80s.de)
  { id: '8K53AIMnCXvU9kueQCjJ', expect: '80s80s Radio',
    data: { streamUrl: 'https://streams.80s80s.de/web/mp3-192/stream.mp3' } },
  // R.SA's italo-kanal er nedlagt (sender 60er Oldies) — erstattes af The Disco Paradise Italo Disco (320 kbps)
  { id: 'fSuQFBQyStk4rjQTBkVD', expect: 'R.SA Italo Disco Hits',
    data: {
      name: 'Disco Paradise Italo',
      streamUrl: 'https://broadcast.miami/proxy/italodisco?mp=/stream/',
      logoUrl: 'https://www.thediscoparadise.com/img/logo-square.jpg',
      bitrate: 320,
      country: 'us',
    } },
]

for (const { id, expect, data } of FIXES) {
  const ref = doc(db, 'stations', id)
  const snap = await getDoc(ref)
  if (!snap.exists() || snap.data().name !== expect) {
    console.log(`Springer over ${id}: forventede "${expect}", fandt "${snap.data()?.name}"`)
    continue
  }
  await updateDoc(ref, data)
  console.log(`Opdateret: ${expect}${data.name ? ` → ${data.name}` : ''}\n  før: ${snap.data().streamUrl}\n  nu:  ${data.streamUrl}`)
}
process.exit(0)
