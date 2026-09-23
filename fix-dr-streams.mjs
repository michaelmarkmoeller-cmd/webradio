// Retter DR-stationernes stream-URL'er efter DR's omnummerering af kanalkoder (23-09-2026)
// Verificeret via icy-name: A05H = P3, A10H = P4 Nordjylland, A25H = P5
// Kør med: node fix-dr-streams.mjs
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore'
import { db } from './firebase-init.mjs'

const FIXES = {
  'DR P3': 'https://live-icy.gss.dr.dk/A/A05H.mp3',
  'DR P4 Nordjylland': 'https://live-icy.gss.dr.dk/A/A10H.mp3',
  'DR P5': 'https://live-icy.gss.dr.dk/A/A25H.mp3',
}

const snap = await getDocs(collection(db, 'stations'))
for (const [name, newUrl] of Object.entries(FIXES)) {
  const match = snap.docs.find(d => d.data().name === name)
  if (!match) {
    console.log(`Station ikke fundet: ${name}`)
    continue
  }
  const oldUrl = match.data().streamUrl
  await updateDoc(doc(db, 'stations', match.id), { streamUrl: newUrl })
  console.log(`Opdateret: ${name}\n  før: ${oldUrl}\n  nu:  ${newUrl}`)
}
process.exit(0)
