// Test alle stationer fra Firestore — følger redirects, browser UA
import { collection, getDocs } from 'firebase/firestore'
import { db } from './firebase-init.mjs'
import http from 'http'
import https from 'https'
const snap = await getDocs(collection(db, 'stations'))
const stations = snap.docs.map(d => ({ id: d.id, ...d.data() }))
  .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name))

console.log(`Henter ${stations.length} stationer fra Firestore...\n`)

const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Accept': '*/*',
  'Accept-Language': 'da,en;q=0.9',
  'Connection': 'close',
}

function doRequest(url, redirectsLeft = 5) {
  return new Promise((resolve) => {
    let resolved = false
    const done = (result) => { if (!resolved) { resolved = true; resolve(result) } }

    let parsed
    try { parsed = new URL(url) } catch { return done({ ok: false, status: 'bad-url', detail: url }) }

    const mod = parsed.protocol === 'https:' ? https : http
    const options = {
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method: 'GET',
      headers: BROWSER_HEADERS,
      timeout: 9000,
      rejectUnauthorized: false, // ignorér SSL-fejl for at teste om stream eksisterer
    }

    const timer = setTimeout(() => { req.destroy(); done({ ok: false, status: 'timeout', detail: '' }) }, 9000)

    const req = mod.request(options, (res) => {
      const status = res.statusCode
      const ct = (res.headers['content-type'] || '').toLowerCase()
      const icy = res.headers['icy-name'] || res.headers['icy-genre'] || ''
      const loc = res.headers['location'] || ''

      // Følg redirect
      if (status >= 301 && status <= 308 && loc && redirectsLeft > 0) {
        clearTimeout(timer)
        res.destroy()
        const nextUrl = loc.startsWith('http') ? loc : new URL(loc, url).href
        doRequest(nextUrl, redirectsLeft - 1).then(done)
        return
      }

      // 200 — tjek om vi faktisk får audio-data
      if (status === 200 || status === 206) {
        const isAudio = ct.includes('audio') || ct.includes('mpeg') || ct.includes('aac')
          || ct.includes('ogg') || ct.includes('octet') || icy
        if (isAudio) {
          clearTimeout(timer)
          res.destroy()
          return done({ ok: true, status, detail: ct || icy })
        }
        // Ingen content-type endnu — læs lidt data
        let bytes = 0
        res.on('data', (chunk) => {
          bytes += chunk.length
          if (bytes >= 512) {
            clearTimeout(timer)
            req.destroy()
            done({ ok: true, status, detail: 'audio data modtaget' })
          }
        })
        res.on('end', () => {
          clearTimeout(timer)
          done(bytes > 0
            ? { ok: true, status, detail: `${bytes} bytes` }
            : { ok: false, status, detail: 'tom respons' })
        })
        return
      }

      clearTimeout(timer)
      res.destroy()
      done({ ok: false, status, detail: ct || loc })
    })

    req.on('error', (e) => {
      clearTimeout(timer)
      const msg = e.message || ''
      // "Missing expected CR" = ICY-protokol (ICY 200 OK i stedet for HTTP/1.1 200 OK)
      // Node.js parser understøtter ikke ICY, men streamen eksisterer og virker i browser
      if (msg.includes('Missing expected CR') || msg.includes('Parse Error')) {
        return done({ ok: true, status: 'ICY', detail: 'ICY-stream (virker i browser)' })
      }
      done({ ok: false, status: 'fejl', detail: msg.slice(0, 70) })
    })
    req.on('timeout', () => {
      clearTimeout(timer)
      req.destroy()
      done({ ok: false, status: 'timeout', detail: '' })
    })

    req.end()
  })
}

// Kør 10 parallelt
const results = []
const CONCURRENCY = 10
for (let i = 0; i < stations.length; i += CONCURRENCY) {
  const batch = stations.slice(i, i + CONCURRENCY)
  const batchResults = await Promise.all(batch.map(s => doRequest(s.streamUrl).then(r => ({ ...s, ...r }))))
  results.push(...batchResults)
  process.stdout.write(`Progress: ${Math.min(i + CONCURRENCY, stations.length)}/${stations.length}\r`)
}

console.log('\n')
const ok = results.filter(r => r.ok)
const fail = results.filter(r => !r.ok)

let lastCat = ''
console.log('='.repeat(75))
console.log('ALLE STATIONER')
console.log('='.repeat(75))
for (const r of results) {
  if (r.category !== lastCat) {
    console.log(`\n── ${r.category} ──`)
    lastCat = r.category
  }
  const icon = r.ok ? '✅' : '❌'
  const statusStr = r.ok ? `OK (${r.status})` : `FEJL: ${r.status}${r.detail ? ' — ' + r.detail.slice(0, 60) : ''}`
  console.log(`  ${icon}  ${r.name.padEnd(38)} ${statusStr}`)
  if (!r.ok) console.log(`       ${r.streamUrl}`)
}

console.log('\n' + '='.repeat(75))
console.log(`RESULTAT: ${ok.length} OK  |  ${fail.length} FEJLER  |  ${results.length} total`)
console.log('='.repeat(75))
if (fail.length > 0) {
  console.log('\nFEJLENDE:')
  for (const r of fail) {
    console.log(`  ❌  ${r.name.padEnd(38)} (${r.category}) — ${r.status}${r.detail ? ' · ' + r.detail.slice(0, 60) : ''}`)
    console.log(`       ${r.streamUrl}`)
  }
}
process.exit(0)
