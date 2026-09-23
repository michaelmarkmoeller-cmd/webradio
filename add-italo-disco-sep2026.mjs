// Erstatter 95.5 Charivari Italo-Hits med en ren italo disco-kanal + tilføjer to mere (23-09-2026)
// Kør med: node add-italo-disco-sep2026.mjs
import { collection, addDoc, doc, getDoc, getDocs, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from './firebase-init.mjs'

// Genbruger Charivari-dokumentet, så plads i rækkefølge + favoritter bevares
const CHARIVARI_ID = 'A6EMaQiezKwSuPs4gq31'
const replacement = {
  name:      'Italo Disco New Gen',
  streamUrl: 'https://ams-pioneer02.dedicateware.com:2545/stream',
  bitrate:   320,
  country:   'pl',
  logoUrl:   'https://cdn-profiles.tunein.com/s166410/images/logoq.png',
}

const newStations = [
  {
    name:      '80s80s Italo Disco Mix',
    streamUrl: 'https://streams.80s80s.de/italodiscomix/mp3-192/stream.mp3',
    category:  'Italo',
    bitrate:   192,
    country:   'de',
    logoUrl:   'https://cdn-profiles.tunein.com/s349901/images/logoq.png',
  },
  {
    name:      'Radio Italo Disco Net',
    streamUrl: 'https://cast2.asurahosting.com/proxy/alen/stream',
    category:  'Italo',
    bitrate:   320,
    country:   'hr',
    logoUrl:   'https://cdn-profiles.tunein.com/s339124/images/logoq.png',
  },
]

const ref = doc(db, 'stations', CHARIVARI_ID)
const snap = await getDoc(ref)
if (snap.exists() && snap.data().name === '95.5 Charivari Italo-Hits') {
  await updateDoc(ref, replacement)
  console.log(`✓  95.5 Charivari Italo-Hits → ${replacement.name}`)
} else {
  console.log(`Springer erstatning over: fandt "${snap.data()?.name}"`)
}

const existing = new Set((await getDocs(collection(db, 'stations'))).docs.map(d => d.data().streamUrl))
for (const s of newStations) {
  if (existing.has(s.streamUrl)) { console.log(`–  ${s.name} findes allerede`); continue }
  await addDoc(collection(db, 'stations'), { ...s, createdAt: serverTimestamp() })
  console.log(`✓  ${s.name} (${s.category}, ${s.bitrate} kbps)`)
}
process.exit(0)
