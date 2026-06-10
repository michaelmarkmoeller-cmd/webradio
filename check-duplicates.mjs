import { initializeApp } from 'firebase/app'
import { getFirestore, collection, getDocs, deleteDoc, doc } from 'firebase/firestore'
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

const snapshot = await getDocs(collection(db, 'stations'))
const stations = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
console.log(`Total stationer: ${stations.length}\n`)

const byName = {}
for (const s of stations) {
  if (!byName[s.name]) byName[s.name] = []
  byName[s.name].push(s)
}

const dupes = Object.entries(byName).filter(([, arr]) => arr.length > 1)
if (dupes.length === 0) { console.log('Ingen dubletter fundet.'); process.exit(0) }

console.log(`Dubletter (${dupes.length} navne):\n`)
let toDelete = []
for (const [name, arr] of dupes) {
  // Behold den med logoUrl + bitrate, ellers den nyeste (størst createdAt)
  arr.sort((a, b) => {
    const aScore = (a.logoUrl ? 2 : 0) + (a.bitrate ? 1 : 0)
    const bScore = (b.logoUrl ? 2 : 0) + (b.bitrate ? 1 : 0)
    return bScore - aScore
  })
  const [keep, ...del] = arr
  console.log(`  "${name}" — behold: ${keep.id}${keep.logoUrl ? ' (har logo)' : ''}, slet: ${del.map(d => d.id).join(', ')}`)
  toDelete.push(...del)
}

console.log(`\nVil slette ${toDelete.length} dubletter (kør med --fix for at slette):`)
toDelete.forEach(s => console.log(`  "${s.name}" (${s.id})`))

if (process.argv.includes('--fix')) {
  console.log('\nSletter...')
  for (const s of toDelete) {
    await deleteDoc(doc(db, 'stations', s.id))
    console.log(`  Slettet: "${s.name}" (${s.id})`)
  }
  console.log(`\nFærdig. ${stations.length - toDelete.length} stationer tilbage.`)
} else {
  console.log('\nKør med --fix for at slette dubletterne.')
}
process.exit(0)
