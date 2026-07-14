// Kør med: node fix-big70s-stream.mjs
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore'
import { db } from './firebase-init.mjs'
const snap = await getDocs(collection(db, 'stations'))
const match = snap.docs.find(d => d.data().name === 'Big 70s Radio')

if (!match) { console.log('Station ikke fundet'); process.exit(1) }

await updateDoc(doc(db, 'stations', match.id), {
  streamUrl: 'https://stream.laut.fm/radio70',
})
console.log(`Opdateret: ${match.id} → https://stream.laut.fm/radio70`)
process.exit(0)
