// Kør med: node add-italo-stations.mjs
import { initializeApp } from 'firebase/app'
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { readFileSync } from 'fs'

const env = Object.fromEntries(
  readFileSync('.env', 'utf8')
    .split('\n')
    .filter(l => l.includes('='))
    .map(l => l.split('=').map(s => s.trim()))
)

const app = initializeApp({
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
})

const db = getFirestore(app)

const NEW_STATIONS = [
  {
    name:      'Radio Stad Den Haag',
    streamUrl: 'https://stream.radiostaddenhaag.com/stream/1/',
    category:  'Italo',
    bitrate:   128,
    logoUrl:   'https://www.radiostaddenhaag.com/wp-content/uploads/2024/09/cropped-rsdhlogo2024@075x-e1727282517321.png',
  },
  {
    name:      'DanceClassics Italo Disco',
    streamUrl: 'https://italo-disco.stream.laut.fm/italo-disco',
    category:  'Italo',
    bitrate:   192,
    logoUrl:   'https://assets.laut.fm/8c9067ca2261b700bcc98139d417a6fd?t=_640x640',
  },
  {
    name:      'RdMix Italo Disco 80s',
    streamUrl: 'https://cast1.torontocast.com:2130/stream',
    category:  'Italo',
    bitrate:   192,
    logoUrl:   'https://radiodimensionemix.torontocast.stream/wp-content/uploads/2023/07/RADIO-DIMENSIONE-MIX_200.jpg',
  },
  {
    name:      'R.SA Italo Disco Hits',
    streamUrl: 'http://rsa.streamabc.net/regc-rsasachsenitalo3107586-mp3-192-8734471',
    category:  'Italo',
    bitrate:   192,
    logoUrl:   'https://images.rsa-sachsen.de/files/2024-07/streamtile-rsa-italo-disco-hits.jpg',
  },
  {
    name:      '95.5 Charivari Italo-Hits',
    streamUrl: 'http://rs24.stream24.net/italohits',
    category:  'Italo',
    bitrate:   128,
    logoUrl:   'https://www.charivari.de/apple-touch-icon.png',
  },
]

async function run() {
  console.log(`Tilføjer ${NEW_STATIONS.length} Italo-stationer...\n`)
  for (const station of NEW_STATIONS) {
    await addDoc(collection(db, 'stations'), { ...station, createdAt: serverTimestamp() })
    console.log(`✓ ${station.name} (${station.bitrate} kbps)`)
  }
  console.log('\nFærdig.')
  process.exit(0)
}

run().catch(err => { console.error(err); process.exit(1) })
