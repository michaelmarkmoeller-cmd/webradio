// Danske 80'er Hits pegede på Bauers internationale "80's Hits" (RP04) → Danske 80'er Hits (RP05), jf. radioplay.dk (23-09-2026)
// Kør med: node fix-danske80-stream.mjs
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore'
import { db } from './firebase-init.mjs'

const snap = await getDocs(collection(db, 'stations'))
const match = snap.docs.find(d => d.data().name === "Danske 80'er Hits")
if (!match) { console.log('Station ikke fundet'); process.exit(1) }

const newUrl = 'https://live-bauerdk.sharp-stream.com/DK_HQ_RP05.aac'
console.log(`før: ${match.data().streamUrl}`)
await updateDoc(doc(db, 'stations', match.id), { streamUrl: newUrl })
console.log(`nu:  ${newUrl}`)
process.exit(0)
