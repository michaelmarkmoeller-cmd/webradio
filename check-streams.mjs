// Kør med: node check-streams.mjs
import https from 'https'
import http from 'http'
import net from 'net'
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

// Full HTTP check — tries to get a valid audio response
function checkStreamHttp(url, timeoutMs = 8000, withIcy = true) {
  if (url.startsWith('http://')) {
    return Promise.resolve({ ok: false, error: 'mixed-content: http:// blocked in HTTPS app' })
  }
  return new Promise((resolve) => {
    const parsed = new URL(url)
    const lib = parsed.protocol === 'https:' ? https : http
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
      'Accept': '*/*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Connection': 'keep-alive',
    }
    if (withIcy) headers['Icy-MetaData'] = '1'

    const req = lib.request(
      {
        hostname: parsed.hostname,
        port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
        path: parsed.pathname + parsed.search,
        method: 'GET',
        headers,
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

// TCP fallback — just verifies host:port is reachable (DNS + TCP handshake)
// Used when HTTP is blocked server-side (some streams reject non-browser agents)
function checkStreamTcp(url, timeoutMs = 5000) {
  return new Promise((resolve) => {
    let parsed
    try { parsed = new URL(url) } catch { resolve({ ok: false, error: 'invalid URL' }); return }
    const port = parsed.port ? parseInt(parsed.port) : (parsed.protocol === 'https:' ? 443 : 80)
    const socket = new net.Socket()
    let resolved = false
    const done = (result) => { if (!resolved) { resolved = true; socket.destroy(); resolve(result) } }
    socket.setTimeout(timeoutMs)
    socket.connect(port, parsed.hostname, () => done({ ok: true, method: 'tcp' }))
    socket.on('timeout', () => done({ ok: false, error: 'tcp timeout' }))
    socket.on('error', (e) => done({ ok: false, error: e.message }))
  })
}

async function checkStream(url) {
  const httpResult = await checkStreamHttp(url)
  if (httpResult.ok) return { ...httpResult, method: 'http' }

  // Some servers reject Icy-MetaData header with 403 — retry without it
  if (httpResult.statusCode === 403) {
    const retryResult = await checkStreamHttp(url, 8000, false)
    if (retryResult.ok) return { ...retryResult, method: 'http-no-icy' }
  }

  // For socket hang up / connection reset: server likely blocks automated agents
  // Fall back to TCP to verify the endpoint is actually reachable
  const socketErrors = ['socket hang up', 'read ECONNRESET', 'ECONNREFUSED', 'ENOTFOUND']
  const isNetworkError = socketErrors.some(e => httpResult.error?.includes(e))
  if (isNetworkError) {
    const tcpResult = await checkStreamTcp(url)
    if (tcpResult.ok) {
      return { ok: true, method: 'tcp-only', note: 'HTTP blocked by server (agent filtering), TCP reachable' }
    }
  }

  return { ...httpResult, method: 'http' }
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
const tcpOnly = []
const failed = []

for (const station of stations) {
  const result = await checkStream(station.streamUrl)
  const br = result.bitrate ? `${result.bitrate} kbps` : ''
  if (result.ok && result.method === 'tcp-only') {
    console.log(`  ~  ${station.name.padEnd(35)} TCP OK (HTTP blokeret af server)`)
    tcpOnly.push(station)
  } else if (result.ok) {
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
console.log(`OK (HTTP):    ${ok.length}/${stations.length}`)
console.log(`OK (TCP):     ${tcpOnly.length}/${stations.length}  ← endpoint nåeligt, HTTP blokeres af server`)
console.log(`FEJLER:       ${failed.length}/${stations.length}`)

if (failed.length > 0) {
  console.log('\nFejlede streams:')
  for (const s of failed) {
    console.log(`  - ${s.name.padEnd(35)} [${s.category}]  ${s.streamUrl}`)
    console.log(`    Fejl: ${s.error}`)
  }
}

process.exit(failed.length > 0 ? 1 : 0)
