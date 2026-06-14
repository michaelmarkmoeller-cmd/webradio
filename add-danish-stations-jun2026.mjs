// Tilføjer 12 nye Dansk-kategoristationer
// Kør med: node add-danish-stations-jun2026.mjs
import { initializeApp } from 'firebase/app'
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore'
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

const stations = [
  {
    name: 'NOVA',
    streamUrl: 'https://live-bauerdk.sharp-stream.com/nova_dk_mp3',
    category: 'Dansk', bitrate: 112, country: 'dk',
    logoUrl: 'https://cdn-profiles.tunein.com/s87164/images/logod.png',
  },
  {
    name: 'DR P5',
    streamUrl: 'https://live-icy.gss.dr.dk/A/A29H.mp3',
    category: 'Dansk', bitrate: 128, country: 'dk',
    logoUrl: 'https://cdn-radiotime-logos.tunein.com/s45455q.png',
  },
  {
    name: 'Pop FM',
    streamUrl: 'https://live-bauerdk.sharp-stream.com/popfm_dk_mp3',
    category: 'Dansk', bitrate: 112, country: 'dk',
    logoUrl: 'https://cdn-profiles.tunein.com/s128359/images/logod.png',
  },
  {
    name: "Pop FM 80'er",
    streamUrl: 'https://live-bauerdk.sharp-stream.com/popfm80.mp3',
    category: 'Dansk', bitrate: 112, country: 'dk',
    logoUrl: 'https://cdn-profiles.tunein.com/s340778/images/logod.png',
  },
  {
    name: 'Radio Soft',
    streamUrl: 'https://live-bauerdk.sharp-stream.com/radiosoft_dk_mp3',
    category: 'Dansk', bitrate: 112, country: 'dk',
    logoUrl: 'https://cdn-profiles.tunein.com/s77506/images/logod.png',
  },
  {
    name: 'Radio 100',
    streamUrl: 'https://live-bauerdk.sharp-stream.com/radio100_dk_mp3',
    category: 'Dansk', bitrate: 112, country: 'dk',
    logoUrl: 'https://cdn-profiles.tunein.com/s48229/images/logod.png',
  },
  {
    name: 'The Voice',
    streamUrl: 'https://live-bauerdk.sharp-stream.com/thevoice_dk_mp3',
    category: 'Dansk', bitrate: 112, country: 'dk',
    logoUrl: 'https://cdn-profiles.tunein.com/s9085/images/logod.png',
  },
  {
    name: 'PartyFM',
    streamUrl: 'https://stream1.partyfm.dk/Tunein64',
    category: 'Dansk', bitrate: 64, country: 'dk',
    logoUrl: 'https://cdn-profiles.tunein.com/s199406/images/logod.jpg',
  },
  {
    name: 'Radio Alfa',
    streamUrl: 'https://radioserver.dk/alfa',
    category: 'Dansk', bitrate: 192, country: 'dk',
    logoUrl: 'https://assets.planetradio.co.uk/img/ConfigWebListenBarLogoImageUrl/183.jpg',
  },
  {
    name: 'Radio ABC',
    streamUrl: 'https://radioserver.dk/abc',
    category: 'Dansk', bitrate: 192, country: 'dk',
    logoUrl: 'https://cdn-profiles.tunein.com/s181779/images/logod.png',
  },
  {
    name: "Danske 80'er Hits",
    streamUrl: 'https://live-bauerdk.sharp-stream.com/DK_HQ_RP04.aac',
    category: 'Dansk', bitrate: 128, country: 'dk',
    logoUrl: 'https://assets.planetradio.co.uk/img/ConfigWebListenBarLogoImageUrl/188.jpg',
  },
  {
    name: 'Classic Pop',
    streamUrl: 'https://stream.classicpop.dk/stream',
    category: 'Dansk', bitrate: 192, country: 'dk',
    logoUrl: 'https://cdn-profiles.tunein.com/s337651/images/logod.png',
  },
]

const col = collection(db, 'stations')
for (const s of stations) {
  await addDoc(col, { ...s, createdAt: serverTimestamp() })
  console.log('Tilføjet:', s.name)
}
console.log('\nFærdig — ' + stations.length + ' stationer tilføjet')
process.exit(0)
