// Kør med: node set-logo.mjs
import { initializeApp } from 'firebase/app'
import { getFirestore, collection, getDocs, doc, updateDoc } from 'firebase/firestore'
import { readFileSync } from 'fs'

const env = Object.fromEntries(
  readFileSync('.env', 'utf8')
    .split('\n')
    .filter(l => l.includes('='))
    .map(l => l.split('=').map(s => s.trim()))
)

const app = initializeApp({
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
})

const db = getFirestore(app)

const S80 = 'https://upload.80s80s.de/production/static/1697296555757/icons/icon_512.ewwAEi8A30w.png'
const S90 = 'https://upload.90s90s.de/production/static/1780918167754/icons/icon_512.cno7CdHz6$i.png'
const SAW = 'https://www.radiosaw.de/images/radio-saw-logo.svg'
const R10 = 'https://www.radio10.nl/favicon.ico'
const RM  = 'https://www.radiomonster.fm/wp-content/uploads/2024/07/webradio_radiomonster_logo_wide.png'

const LOGOS = {
  // 80s80s (alle varianter bruger samme logo)
  '80s80s In The Mix':         S80,
  '80s80s Partyhits':          S80,
  '80s80s Maxis':              S80,
  '80s80s Summerhits':         S80,
  '80s80s 70er':               S80,
  '80s80s Italo Hits':         S80,

  // SomaFM
  'Underground 80s':           'https://somafm.com/img3/u80s-400.png',
  'PopTron':                   'https://somafm.com/img3/poptron-400.png',

  // Rock
  'Rock Antenne':              'https://www.rockantenne.de/favicon.ico',

  // Italo
  'Synthetic FM':              'https://syntheticfm.com/logo-syntheticfm1.png',

  // 90s90s (alle varianter)
  '90s90s Radio':              S90,
  '90s Eurodance':             S90,

  // Radio SAW (alle varianter)
  'Radio SAW':                 SAW,
  'radio SAW 80er':            SAW,
  'radio SAW 90er':            SAW,
  'radio SAW In The Mix':      SAW,
  'radio SAW In The Mix 80er': SAW,
  'radio SAW In The Mix 90er': SAW,
  'Radio SAW 70er':            SAW,

  // 538
  '538 Party':                 'https://www.538.nl/favicon.ico',
  '538 Hitzone':               'https://www.538.nl/favicon.ico',

  // Veronica / Radio 10
  'Veronica Top 1000':         'https://www.radioveronica.nl/veronica/favicon.ico',
  'Radio 10 90s Hits':         R10,
  'Radio 10 Top 4000':         R10,
  'Radio 10 60s & 70s':        R10,

  // Sky Radio
  'Sky Radio 80s Hits':        'https://www.skyradio.nl/favicon.ico',

  // Dansk
  'Radio Danmark':             'https://www.dr.dk/favicon.ico',
  'DR P3':                     'https://www.dr.dk/favicon.ico',
  'Radio ANR':                 'https://www.anr.dk/media/x0jhtpgi/ah_logo_620x620_neg.svg',
  'Retro Radio':               'https://retro-radio.dk/wp-content/uploads/2023/11/logo-retro-radio-160.png',

  // RadioMonster (alle varianter)
  'RadioMonster Rock':         RM,
  'RadioMonster Tophits':      RM,
  'RadioMonster Dance':        RM,
  'RadioMonster 80s':          RM,
  'RadioMonster 90s':          RM,

  // 1.FM
  '1.FM 70s Best':             'https://www.1.fm/favicon/favicon.ico?v=2',
}

async function run() {
  const snapshot = await getDocs(collection(db, 'stations'))
  const stations = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
  console.log(`Fandt ${stations.length} stationer\n`)

  let updated = 0, skipped = 0

  for (const station of stations) {
    const logoUrl = LOGOS[station.name]
    if (!logoUrl) {
      console.log(`—  ${station.name}`)
      skipped++
      continue
    }
    if (station.logoUrl === logoUrl) {
      console.log(`OK ${station.name} (uændret)`)
      continue
    }
    await updateDoc(doc(db, 'stations', station.id), { logoUrl })
    console.log(`✓  ${station.name}`)
    updated++
  }

  console.log(`\nOpdateret: ${updated}  Intet logo: ${skipped}`)
  process.exit(0)
}

run().catch(err => { console.error('Fejl:', err.message); process.exit(1) })
