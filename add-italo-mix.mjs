// Kør med: node add-italo-mix.mjs
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

await addDoc(collection(db, 'stations'), {
  name:      '80s80s Italo Mix',
  streamUrl: 'https://streams.80s80s.de/italomix/mp3-192/stream.mp3',
  category:  'Italo',
  bitrate:   192,
  logoUrl:   'https://webradio-chi.vercel.app/logos/80s80s-italo-mix.png',
  createdAt: serverTimestamp(),
})

console.log('✓ 80s80s Italo Mix tilføjet (192 kbps)')
process.exit(0)
