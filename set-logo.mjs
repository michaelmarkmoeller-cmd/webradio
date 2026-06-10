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
const SAW = 'https://backend.radiosaw.de/sites/default/files/styles/square_tiny_200_x_200/public/2023-11/radio-saw-simulcast_0.png.webp?itok=KJstbbvk'
const R10 = 'https://www.radio10.nl/favicon.ico'
const RM  = 'https://play-lh.googleusercontent.com/8xt0bjgFJDXuhZe-HkB4QgKu5ZM3PPkX8Qd0yo1wfgSNcfuMNtOvOw22cbpIN8mrO4Sy=w240-h240'

const LOGOS = {
  // 80s80s (alle varianter bruger samme logo)
  '80s80s Radio':              S80,
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
  'Rock Antenne':              'https://webradio-chi.vercel.app/logos/rock-antenne.png',

  // Italo
  'Synthetic FM':              'https://syntheticfm.com/logo-syntheticfm1.png',

  // 90s90s (alle varianter)
  '90s90s Radio':              S90,
  '90s Eurodance':             S90,

  // Radio SAW (kanal-specifikke square WebP fra backend.radiosaw.de)
  'Radio SAW':                 SAW,
  'radio SAW In The Mix':      'https://backend.radiosaw.de/sites/default/files/styles/square_tiny_200_x_200/public/migrated-images/saw-inthemix.png.webp?itok=P7GtRPZ8',
  'Radio SAW 70er':            'https://backend.radiosaw.de/sites/default/files/styles/square_tiny_200_x_200/public/2023-11/70er.png.webp?itok=qfNZNDGs',
  'radio SAW 80er':            'https://backend.radiosaw.de/sites/default/files/styles/square_tiny_200_x_200/public/2023-11/80er.png.webp?itok=Mt6hoLNC',
  'radio SAW 90er':            'https://backend.radiosaw.de/sites/default/files/styles/square_tiny_200_x_200/public/2023-11/90er.png.webp?itok=m4KKyb-_',
  'radio SAW In The Mix 80er': 'https://backend.radiosaw.de/sites/default/files/styles/square_tiny_200_x_200/public/migrated-images/saw-inthemix80er.png.webp?itok=DThkyWmg',
  'radio SAW In The Mix 90er': 'https://backend.radiosaw.de/sites/default/files/styles/square_tiny_200_x_200/public/migrated-images/saw-inthemix90er.png.webp?itok=85xR_OCL',

  // Veronica / Radio 10 (kanal-specifikke logoer fra Talpa/Contentful CDN)
  'Veronica Top 1000':         'https://www.radioveronica.nl/veronica/favicon.ico',
  'Radio 10 90s Hits':         'https://images.ctfassets.net/fpk5n836jg85/252ZxnFfthteIYOfsBgqFK/23404090945eb25843a8693bfc0a8c57/Brand_Radio_10__Type_90-s_Hits.jpg',
  'Radio 10 Top 4000':         'https://images.ctfassets.net/fpk5n836jg85/65TqNtq7Df2iebZzFSTVnd/4b4f64226a111e358081e73b70bd739e/Brand_Radio_10__Type_Top_4000.jpg',
  'Radio 10 60s & 70s':        'https://images.ctfassets.net/fpk5n836jg85/JepIiUVvENVE6FoJnSccC/6afc5ae514f42fc82624e05f9f1ec42c/NEW_Brand-Radio-10_Type-60s-70s.jpg',

  // Sky Radio
  'Sky Radio 80s Hits':        'https://www.skyradio.nl/favicon.ico',

  // Dansk
  'DR P4 Nordjylland':         'https://www.dr.dk/favicon.ico',
  'DR P3':                     'https://www.dr.dk/favicon.ico',
  'Radio ANR':                 'https://cdn-radiotime-logos.tunein.com/s25765d.png',
  'Retro Radio':               'https://webradio-chi.vercel.app/logos/retro-radio.png',

  // RadioMonster (Google Play app icon — radiomonster.fm WP blokerer direkte adgang)
  'RadioMonster Rock':         RM,
  'RadioMonster Tophits':      RM,
  'RadioMonster Dance':        RM,
  'RadioMonster 80s':          RM,
  'RadioMonster 90s':          RM,

  // 538 (kanal-ikon)
  '538 Party':                 'https://www.538.nl/icons/apple-icon-144x144.png',
  '538 Hitzone':               'https://www.538.nl/icons/apple-icon-144x144.png',

  // laut.fm kanal-specifikke logoer
  'Forever 80':                'https://assets.laut.fm/6f62c113e3fdbefe1a7b4fa442ae5450?t=_120x120',
  'Vinyl Maxi FM':             'https://assets.laut.fm/9f6dbe6878c4226e46f5cd2e90e1d123?t=_120x120',
  'laut.fm 70er':              'https://assets.laut.fm/8972525da4e196b40edba1c8e1f04269?t=_120x120',

  // 1.FM
  '1.FM 70s Best':             'https://cdn-profiles.tunein.com/s9115/images/logod.png',

  // Big R Radio (kvadratisk version i public/logos)
  'Big 70s Radio':             'https://webradio-chi.vercel.app/logos/big-70s-radio.png',
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
