// Kør med: node list-stations.mjs
import { initializeApp } from 'firebase/app'
import { getFirestore, collection, getDocs } from 'firebase/firestore'
import { readFileSync } from 'fs'

const env = Object.fromEntries(
  readFileSync('.env', 'utf8').split('\n').filter(l => l.includes('=')).map(l => l.split('=').map(s => s.trim()))
)
const app = initializeApp({
  apiKey: env.VITE_FIREBASE_API_KEY, authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID, storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID, appId: env.VITE_FIREBASE_APP_ID,
})
const db = getFirestore(app)
const snap = await getDocs(collection(db, 'stations'))
const stations = snap.docs.map(d => ({ ...d.data() })).sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name))

console.log(`| Kanal | Kategori | Stream URL | Logo URL |`)
console.log(`|-------|----------|------------|----------|`)
for (const s of stations) {
  console.log(`| ${s.name} | ${s.category} | ${s.streamUrl} | ${s.logoUrl ?? '—'} |`)
}
console.log(`\nTotal: ${stations.length} stationer`)
process.exit(0)
