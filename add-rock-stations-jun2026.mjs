// Kør med: node add-rock-stations-jun2026.mjs
// Tilføjer 5 nye Rock-stationer
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from './firebase-init.mjs'

const stations = [
  // --- Rock ---
  {
    name:      'Radio BOB!',
    streamUrl: 'https://streams.radiobob.de/bob-national/mp3-192/mediaplayer',
    category:  'Rock',
    bitrate:   192,
    logoUrl:   'https://cdn-radiotime-logos.tunein.com/s96189q.png',
  },
  {
    name:      'Radio BOB! Classic Rock',
    streamUrl: 'https://streams.radiobob.de/bob-classicrock/mp3-192/mediaplayer',
    category:  'Rock',
    bitrate:   192,
    logoUrl:   'https://cdn-radiotime-logos.tunein.com/s242186q.png',
  },
  {
    name:      'Rock Antenne Heavy Metal',
    streamUrl: 'https://stream.rockantenne.de/heavy-metal/stream/mp3',
    category:  'Rock',
    bitrate:   128,
    logoUrl:   'https://cdn-radiotime-logos.tunein.com/s125937q.png',
  },
  {
    name:      'Rock Antenne Classic Perlen',
    streamUrl: 'https://stream.rockantenne.de/classic-perlen/stream/mp3',
    category:  'Rock',
    bitrate:   128,
    logoUrl:   'https://cdn-radiotime-logos.tunein.com/s125938q.png',
  },
  {
    name:      'SomaFM Metal Detector',
    streamUrl: 'https://ice5.somafm.com/metal-128-mp3',
    category:  'Rock',
    bitrate:   128,
    logoUrl:   'https://somafm.com/img3/metal-400.png',
  },
]

for (const s of stations) {
  await addDoc(collection(db, 'stations'), { ...s, createdAt: serverTimestamp() })
  console.log(`✓  ${s.name} (${s.category}, ${s.bitrate} kbps)`)
}

console.log(`\nFærdig — ${stations.length} stationer tilføjet.`)
process.exit(0)
