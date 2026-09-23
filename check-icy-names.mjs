// Læser icy-name/icy-description fra alle stationers streams (rå TCP/TLS, håndterer "ICY 200 OK")
import { collection, getDocs } from 'firebase/firestore'
import { db } from './firebase-init.mjs'
import net from 'net'
import tls from 'tls'

const snap = await getDocs(collection(db, 'stations'))
const stations = snap.docs.map(d => ({ id: d.id, ...d.data() }))
  .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name))

function fetchHeaders(url, redirects = 5) {
  return new Promise(resolve => {
    let u
    try { u = new URL(url) } catch { return resolve({ error: 'bad-url' }) }
    const isTls = u.protocol === 'https:'
    const port = Number(u.port) || (isTls ? 443 : 80)
    const opts = { host: u.hostname, port, servername: u.hostname, rejectUnauthorized: false }
    const sock = isTls ? tls.connect(opts) : net.connect(opts)
    let buf = Buffer.alloc(0), done = false
    const finish = r => { if (!done) { done = true; sock.destroy(); resolve(r) } }
    const timer = setTimeout(() => finish({ error: 'timeout' }), 10000)
    sock.on(isTls ? 'secureConnect' : 'connect', () => {
      sock.write(`GET ${u.pathname}${u.search} HTTP/1.0\r\nHost: ${u.host}\r\nUser-Agent: Mozilla/5.0\r\nIcy-MetaData: 1\r\nAccept: */*\r\n\r\n`)
    })
    sock.on('data', chunk => {
      buf = Buffer.concat([buf, chunk])
      const end = buf.indexOf('\r\n\r\n')
      if (end === -1 && buf.length < 16384) return
      clearTimeout(timer)
      const lines = buf.slice(0, end === -1 ? buf.length : end).toString('latin1').split('\r\n')
      const status = lines[0]
      const h = {}
      for (const l of lines.slice(1)) { const i = l.indexOf(':'); if (i > 0) h[l.slice(0, i).trim().toLowerCase()] = l.slice(i + 1).trim() }
      const code = Number(status.split(' ')[1])
      if (code >= 300 && code < 400 && h.location && redirects > 0) {
        done = true; sock.destroy()
        return resolve(fetchHeaders(new URL(h.location, url).href, redirects - 1))
      }
      finish({ status, name: h['icy-name'] ?? '', desc: h['icy-description'] ?? '' })
    })
    sock.on('error', e => { clearTimeout(timer); finish({ error: e.code || e.message }) })
  })
}

const results = new Array(stations.length)
let next = 0
await Promise.all(Array.from({ length: 8 }, async () => {
  while (next < stations.length) {
    const i = next++
    results[i] = { s: stations[i], r: await fetchHeaders(stations[i].streamUrl) }
  }
}))
for (const { s, r } of results) {
  console.log([s.category, s.name, r.error ? `FEJL:${r.error}` : r.name, r.desc || '', r.status || '', s.streamUrl].join(' ¦ '))
}
process.exit(0)

