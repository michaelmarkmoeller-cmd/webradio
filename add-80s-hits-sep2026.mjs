// Tilføjer Bauers "80's Hits" (DK_HQ_RP04) — URL'en Danske 80'er Hits fejlagtigt pegede på (23-09-2026)
// Kør med: node add-80s-hits-sep2026.mjs
import { collection, addDoc, getDocs, serverTimestamp } from 'firebase/firestore'
import { db } from './firebase-init.mjs'

const station = {
  name:      "80's Hits",
  streamUrl: 'https://live-bauerdk.sharp-stream.com/DK_HQ_RP04.aac',
  category:  "80's",
  bitrate:   96,
  country:   'dk',
  logoUrl:   'https://assets.planetradio.co.uk/img/ConfigWebListenBarLogoImageUrl/198.jpg',
}

const existing = (await getDocs(collection(db, 'stations'))).docs.map(d => d.data().streamUrl)
if (existing.includes(station.streamUrl)) { console.log('Findes allerede'); process.exit(0) }
await addDoc(collection(db, 'stations'), { ...station, createdAt: serverTimestamp() })
console.log(`✓  ${station.name} (${station.category}, ${station.bitrate} kbps)`)
process.exit(0)
