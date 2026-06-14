// Kør med: node fix-big70s-stream.mjs
import { initializeApp } from 'firebase/app'
import { getFirestore, collection, getDocs, doc, updateDoc } from 'firebase/firestore'
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
const match = snap.docs.find(d => d.data().name === 'Big 70s Radio')

if (!match) { console.log('Station ikke fundet'); process.exit(1) }

await updateDoc(doc(db, 'stations', match.id), {
  streamUrl: 'https://stream.laut.fm/radio70',
})
console.log(`Opdateret: ${match.id} → https://stream.laut.fm/radio70`)
process.exit(0)
