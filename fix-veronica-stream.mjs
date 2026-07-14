// Opdaterer Radio Veronica Top 1000 stream URL til fungerende endpoint
// Kør med: node fix-veronica-stream.mjs
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore'
import { db } from './firebase-init.mjs'

const snap = await getDocs(collection(db, 'stations'))
const match = snap.docs.find(d => d.data().name === 'Veronica Top 1000')

if (!match) {
  console.log('Station ikke fundet')
  process.exit(1)
}

const newUrl = 'https://stream.radioveronica.nl/web06_mp3'
await updateDoc(doc(db, 'stations', match.id), { streamUrl: newUrl, bitrate: 128 })
console.log(`Opdateret: ${match.data().name}`)
console.log(`Ny URL: ${newUrl}`)
process.exit(0)
