// Kør med: node check-streams.mjs
import https from 'https'
import http from 'http'
import { initializeApp } from 'firebase/app'
import { getFirestore, collection, getDocs } from 'firebase/firestore'
import { readFileSync } from 'fs'

// Load Firebase config from .env
const env = Object.fromEntries(
  readFileSync('.env', 'utf8').split('\n').filter(l => l.includes('=')).map(l => l.split('=').map(s => s.trim()))
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

function checkStream(url, timeoutMs = 8000) {
  if (url.startsWith('http://')) {
    return Promise.resolve({ ok: false, error: 'mixed-content: http:// blocked in HTTPS app' })
  }
  return new Promise((resolve) => {
    const parsed = new URL(url)
    const lib = parsed.protocol === 'https:' ? https : http

    const req = lib.request(
      {
        hostname: parsed.hostname,
        port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
        path: parsed.pathname + parsed.search,
        method: 'GET',
        headers: {
          'Icy-MetaData': '1',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
          'Accept': '*/*',
          'Accept-Language': 'en-US,en;q=0.9',
          'Connection': 'keep-alive',
        },
        timeout: timeoutMs,
      },
      (res) => {
        const bitrate = res.headers['icy-br'] || res.headers['x-audiocast-bitrate'] || null
        const contentType = res.headers['content-type'] || ''
        req.destroy()
        resolve({
          ok: res.statusCode >= 200 && res.statusCode < 400,
          statusCode: res.statusCode,
          bitrate: bitrate ? parseInt(bitrate, 10) : null,
          contentType,
        })
      }
    )

    req.on('timeout', () => { req.destroy(); resolve({ ok: false, error: 'timeout' }) })
    req.on('error', (e) => resolve({ ok: false, error: e.message }))
    req.end()
  })
}

// Fetch all stations from Firestore
const snap = await getDocs(collection(db, 'stations'))
const stations = snap.docs
  .map(d => ({ id: d.id, ...d.data() }))
  .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name))

console.log('='.repeat(60))
console.log(`WebRadio stream-checker — ${stations.length} stationer fra Firestore`)
console.log('='.repeat(60))

const ok = []
const failed = []

for (const station of stations) {
  const result = await checkStream(station.streamUrl)
  const br = result.bitrate ? `${result.bitrate} kbps` : '?'
  if (result.ok) {
    console.log(`  ✓  ${station.name.padEnd(35)} ${br}`)
    ok.push(station)
  } else {
    const err = result.error || `HTTP ${result.statusCode}`
    console.log(`  ✗  ${station.name.padEnd(35)} FEJLER (${err})`)
    failed.push({ ...station, error: err })
  }
}

console.log('\n' + '='.repeat(60))
console.log('OPSUMMERING')
console.log('='.repeat(60))
console.log(`OK:     ${ok.length}/${stations.length}`)
console.log(`FEJLER: ${failed.length}/${stations.length}`)

if (failed.length > 0) {
  console.log('\nFejlede streams:')
  for (const s of failed) {
    console.log(`  - ${s.name.padEnd(35)} [${s.category}]  ${s.streamUrl}`)
    console.log(`    Fejl: ${s.error}`)
  }
}

process.exit(failed.length > 0 ? 1 : 0)
