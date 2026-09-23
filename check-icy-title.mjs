// Midlertidigt: læs icy-name + første StreamTitle for udvalgte URL'er (rå TCP/TLS)
import net from 'net'
import tls from 'tls'

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'

function probe(url, redirects = 5) {
  return new Promise(resolve => {
    const u = new URL(url)
    const isTls = u.protocol === 'https:'
    const opts = { host: u.hostname, port: Number(u.port) || (isTls ? 443 : 80), servername: u.hostname, rejectUnauthorized: false }
    const sock = isTls ? tls.connect(opts) : net.connect(opts)
    let buf = Buffer.alloc(0), hdr = null, done = false
    const finish = r => { if (!done) { done = true; clearTimeout(t); sock.destroy(); resolve(r) } }
    const t = setTimeout(() => finish({ ...(hdr || {}), title: '(timeout)' }), 15000)
    sock.on(isTls ? 'secureConnect' : 'connect', () =>
      sock.write(`GET ${u.pathname}${u.search} HTTP/1.1\r\nHost: ${u.host}\r\nUser-Agent: ${UA}\r\nIcy-MetaData: 1\r\nAccept: */*\r\nConnection: close\r\n\r\n`))
    sock.on('data', c => {
      buf = Buffer.concat([buf, c])
      if (!hdr) {
        const end = buf.indexOf('\r\n\r\n'); if (end === -1) return
        const lines = buf.slice(0, end).toString('latin1').split('\r\n')
        const h = {}; for (const l of lines.slice(1)) { const i = l.indexOf(':'); if (i > 0) h[l.slice(0, i).trim().toLowerCase()] = l.slice(i + 1).trim() }
        const code = Number(lines[0].split(' ')[1])
        if (code >= 300 && code < 400 && h.location && redirects > 0) { done = true; clearTimeout(t); sock.destroy(); return resolve(probe(new URL(h.location, url).href, redirects - 1)) }
        hdr = { status: lines[0], name: h['icy-name'] ?? '', metaint: Number(h['icy-metaint']) || 0 }
        buf = buf.slice(end + 4)
        if (!hdr.metaint) return finish({ ...hdr, title: '(ingen metaint)' })
      }
      if (buf.length > hdr.metaint) {
        const len = buf[hdr.metaint] * 16
        if (len === 0) return finish({ ...hdr, title: '(tom metadata)' })
        if (buf.length < hdr.metaint + 1 + len) return
        const meta = buf.slice(hdr.metaint + 1, hdr.metaint + 1 + len).toString('utf8')
        finish({ ...hdr, title: (meta.match(/StreamTitle='(.*?)';/) || [])[1] ?? meta })
      }
    })
    sock.on('error', e => finish({ ...(hdr || {}), title: `FEJL:${e.code || e.message}` }))
  })
}

const urls = process.argv.slice(2)
await Promise.all(urls.map(async url => {
  const r = await probe(url)
  console.log(`${url}\n   status: ${r.status} | icy-name: ${r.name} | nu: ${r.title}`)
}))
process.exit(0)
