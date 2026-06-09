// Kør med: node set-logo.mjs
import { initializeApp } from 'firebase/app'
import { getFirestore, collection, getDocs, doc, updateDoc } from 'firebase/firestore'
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

const LOGOS = {
  '80s80s Radio': 'https://upload.80s80s.de/production/static/1697296555757/icons/icon_512.ewwAEi8A30w.png',
}

async function run() {
  const snapshot = await getDocs(collection(db, 'stations'))
  const stations = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))

  for (const station of stations) {
    const logoUrl = LOGOS[station.name]
    if (!logoUrl) continue
    await updateDoc(doc(db, 'stations', station.id), { logoUrl })
    console.log(`OK  ${station.name}`)
  }

  console.log('Færdig!')
  process.exit(0)
}

run().catch(err => { console.error('Fejl:', err.message); process.exit(1) })
