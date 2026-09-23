// Skifter 90s90s Radio fra 90s00s Millennium-kanalen til hovedkanalen 90s90s DIGITAL (23-09-2026)
// Kør med: node fix-90s90s-stream.mjs
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore'
import { db } from './firebase-init.mjs'

const snap = await getDocs(collection(db, 'stations'))
const match = snap.docs.find(d => d.data().name === '90s90s Radio')
if (!match) { console.log('Station ikke fundet'); process.exit(1) }

const newUrl = 'https://streams.90s90s.de/pop/mp3-192/stream.mp3'
console.log(`før: ${match.data().streamUrl}`)
await updateDoc(doc(db, 'stations', match.id), { streamUrl: newUrl })
console.log(`nu:  ${newUrl}`)
process.exit(0)
