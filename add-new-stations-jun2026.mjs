// Kør med: node add-new-stations-jun2026.mjs
// Tilføjer 3 danske stationer + 5 julestationer
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

const stations = [
  // --- Dansk ---
  {
    name:      'Radio Limfjord',
    streamUrl: 'http://media.limfjordnetradio.dk/limfjord128',
    category:  'Dansk',
    bitrate:   128,
    logoUrl:   'https://cdn-radiotime-logos.tunein.com/s10576q.png',
  },
  {
    name:      'Limfjord Mix',
    streamUrl: 'http://media.limfjordnetradio.dk/mix128',
    category:  'Dansk',
    bitrate:   128,
    logoUrl:   'https://cdn-radiotime-logos.tunein.com/s134818q.png',
  },
  {
    name:      'Radio Nord',
    streamUrl: 'http://netradio.radionord.dk:8000/RadioNord',
    category:  'Dansk',
    bitrate:   256,
    logoUrl:   'https://cdn-radiotime-logos.tunein.com/s269114q.png',
  },

  // --- Jul ---
  {
    name:      'Antenne Bayern Weihnachten',
    streamUrl: 'https://stream.antenne.de/weihnachten/mp3-128/stream.mp3',
    category:  'Jul',
    bitrate:   128,
    logoUrl:   'https://cdn-radiotime-logos.tunein.com/s244472q.png',
  },
  {
    name:      '80s80s Xmas',
    streamUrl: 'https://streams.80s80s.de/xmas/mp3-192/stream.mp3',
    category:  'Jul',
    bitrate:   192,
    logoUrl:   'https://cdn-radiotime-logos.tunein.com/s258389q.png',
  },
  {
    name:      'Sky Radio Christmas',
    streamUrl: 'https://playerservices.streamtheworld.com/api/livestream-redirect/SRGSTR08.mp3',
    category:  'Jul',
    bitrate:   128,
    logoUrl:   'https://webradio-chi.vercel.app/logos/sky-radio-christmas.png',
  },
  {
    name:      'Klassik Radio Christmas',
    streamUrl: 'https://stream.klassikradio.de/christmas/mp3-192',
    category:  'Jul',
    bitrate:   192,
    logoUrl:   'https://www.klassikradio.de/apple-touch-icon.png',
  },
  {
    name:      'Christmas Vinyl HD',
    streamUrl: 'https://icecast.walmradio.com:8443/christmas',
    category:  'Jul',
    bitrate:   320,
    logoUrl:   'https://webradio-chi.vercel.app/logos/christmas-vinyl-hd.jpg',
  },
]

for (const s of stations) {
  await addDoc(collection(db, 'stations'), { ...s, createdAt: serverTimestamp() })
  console.log(`✓  ${s.name} (${s.category}, ${s.bitrate} kbps)`)
}

console.log(`\nFærdig — ${stations.length} stationer tilføjet.`)
process.exit(0)
