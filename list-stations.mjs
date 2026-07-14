// Kør med: node list-stations.mjs
import { collection, getDocs } from 'firebase/firestore'
import { db } from './firebase-init.mjs'
const snap = await getDocs(collection(db, 'stations'))
const stations = snap.docs.map(d => ({ ...d.data() })).sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name))

console.log(`| Kanal | Kategori | Stream URL | Logo URL |`)
console.log(`|-------|----------|------------|----------|`)
for (const s of stations) {
  console.log(`| ${s.name} | ${s.category} | ${s.streamUrl} | ${s.logoUrl ?? '—'} |`)
}
console.log(`\nTotal: ${stations.length} stationer`)
process.exit(0)
