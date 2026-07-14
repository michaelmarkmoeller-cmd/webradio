// Kør med: node migrate-stations.mjs
// Sletter de 5 døde stationer i Firestore og tilføjer erstatninger
import { collection, getDocs, deleteDoc, doc, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from './firebase-init.mjs'

// Stationer der skal slettes (matcher på navn)
const DEAD_STATIONS = [
  'Radio 80s',
  'Radio Nostalgia',
  'Radio Pop FM',
  'Absolute Radio',
  'Italo Radio',
]

// Erstatninger med verificerede, arbejdende streams
const REPLACEMENTS = [
  {
    name: 'Underground 80s',
    streamUrl: 'https://ice5.somafm.com/u80s-256-mp3',
    category: "80's",
    note: 'SomaFM · 256 kbps · UK Synthpop & New Wave'
  },
  {
    name: '90s Eurodance',
    streamUrl: 'https://streams.90s90s.de/eurodance/mp3-192/stream.mp3',
    category: "90's",
    note: '90s90s.de · 192 kbps · Eurodance hits'
  },
  {
    name: 'PopTron',
    streamUrl: 'https://ice5.somafm.com/poptron-128-mp3',
    category: 'Pop',
    note: 'SomaFM · 128 kbps · Electro-Pop & Indie Dance'
  },
  {
    name: 'Rock Antenne',
    streamUrl: 'https://stream.rockantenne.de/rockantenne/stream/mp3',
    category: 'Rock',
    note: 'Rock Antenne Germany · Classic & Modern Rock'
  },
  {
    name: 'Synthetic FM',
    streamUrl: 'http://stream.syntheticfm.com:8030/stream',
    category: 'Italo',
    note: 'Synthetic FM · 320 kbps · New Italo & Eurodisco'
  },
]

async function migrate() {
  console.log('Henter stationer fra Firestore...')
  const snapshot = await getDocs(collection(db, 'stations'))
  const stations = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
  console.log(`Fandt ${stations.length} stationer\n`)

  // Slet døde stationer
  let deleted = 0
  for (const station of stations) {
    if (DEAD_STATIONS.includes(station.name)) {
      await deleteDoc(doc(db, 'stations', station.id))
      console.log(`Slettet: ${station.name}`)
      deleted++
    }
  }

  console.log(`\nSlettet ${deleted} stationer`)

  // Tilføj erstatninger
  console.log('\nTilføjer erstatninger:')
  for (const s of REPLACEMENTS) {
    const { note, ...data } = s
    await addDoc(collection(db, 'stations'), { ...data, createdAt: serverTimestamp() })
    console.log(`Tilføjet: ${s.name} (${s.category}) - ${note}`)
  }

  console.log('\nMigration færdig!')
  process.exit(0)
}

migrate().catch(err => {
  console.error('Fejl:', err.message)
  process.exit(1)
})
