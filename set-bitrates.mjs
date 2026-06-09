// Kør med: node set-bitrates.mjs
// Checker icy-br header, falder tilbage på URL-mønster og manuelle overrides
import https from 'https'
import http from 'http'
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

// Kendte bitrates der ikke kan udledes af URL
const MANUAL_BITRATES = {
  'Underground 80s':    256, // SomaFM u80s-256-mp3
  'PopTron':            128, // SomaFM poptron-128-mp3
  'Rock Antenne':       128, // rockantenne.de main stream
  'Sky Radio 80s Hits': 128, // streamtheworld standard
  'Radio 10 90s Hits':  128,
  'Radio 10 Top 4000':  128,
  '538 Party':          128,
  '538 Hitzone':        128,
  'Veronica Top 1000':  128,
  'Forever 80':         128, // laut.fm standard
  'Vinyl Maxi FM':      128,
  'Big 70s Radio':      128,
  'RadioMonster Rock':  128,
  'RadioMonster Tophits': 128,
  'RadioMonster Dance': 128,
  'RadioMonster 80s':   128,
  'RadioMonster 90s':   128,
  'laut.fm 70er':       128,
  'Radio 10 60s & 70s': 128,
}

function bitrateFromUrl(url) {
  // mp3-192, mp3-128, mp3-320
  const mp3match = url.match(/mp3-(\d+)/)
  if (mp3match) return parseInt(mp3match[1], 10)
  // -128-mp3, -256-mp3, -320-mp3
  const dashMatch = url.match(/-(\d+)-mp3/)
  if (dashMatch) return parseInt(dashMatch[1], 10)
  // aac-64, aac-128
  const aacMatch = url.match(/aac-(\d+)/)
  if (aacMatch) return parseInt(aacMatch[1], 10)
  return null
}

function checkStream(url, timeoutMs = 8000) {
  return new Promise((resolve) => {
    let parsed
    try { parsed = new URL(url) } catch { return resolve({ ok: false, error: 'ugyldig URL' }) }
    const lib = parsed.protocol === 'https:' ? https : http

    const req = lib.request(
      {
        hostname: parsed.hostname,
        port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
        path: parsed.pathname + parsed.search,
        method: 'GET',
        headers: { 'Icy-MetaData': '1', 'User-Agent': 'WebRadio-BitrateChecker/1.0' },
        timeout: timeoutMs,
      },
      (res) => {
        const br = res.headers['icy-br'] || res.headers['x-audiocast-bitrate'] || null
        req.destroy()
        resolve({
          ok: res.statusCode >= 200 && res.statusCode < 400,
          bitrate: br ? parseInt(br, 10) : null,
        })
      }
    )
    req.on('timeout', () => { req.destroy(); resolve({ ok: false, error: 'timeout' }) })
    req.on('error', (e) => resolve({ ok: false, error: e.message }))
    req.end()
  })
}

async function run() {
  console.log('Henter stationer fra Firestore...')
  const snapshot = await getDocs(collection(db, 'stations'))
  const stations = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
  console.log(`Fandt ${stations.length} stationer\n`)

  let updated = 0
  let skipped = 0

  for (const station of stations) {
    process.stdout.write(`${station.name.padEnd(35)} `)

    // 1) Prøv icy-br header
    const result = await checkStream(station.streamUrl)
    let bitrate = result.ok ? result.bitrate : null
    let source = 'header'

    // 2) Fallback: URL-mønster
    if (!bitrate) {
      bitrate = bitrateFromUrl(station.streamUrl)
      source = 'url'
    }

    // 3) Fallback: manuel override
    if (!bitrate && MANUAL_BITRATES[station.name]) {
      bitrate = MANUAL_BITRATES[station.name]
      source = 'manuel'
    }

    if (!bitrate) {
      console.log(`— ingen bitrate fundet`)
      skipped++
      continue
    }

    await updateDoc(doc(db, 'stations', station.id), { bitrate })
    console.log(`${String(bitrate).padStart(3)} kbps  [${source}]  ✓`)
    updated++
  }

  console.log(`\nFærdig!  Opdateret: ${updated}  Sprunget over: ${skipped}`)
  process.exit(0)
}

run().catch(err => { console.error('Fejl:', err.message); process.exit(1) })
