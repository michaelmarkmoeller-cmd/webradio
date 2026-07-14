import dns from 'node:dns'

function isPrivateIPv4(a: number, b: number): boolean {
  return (
    a === 10 || a === 127 || a === 0 ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 169 && b === 254)
  )
}

function isPrivateAddress(address: string, family: number): boolean {
  if (family === 4) {
    const m = address.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
    if (!m) return true // unparsable — reject defensively
    return isPrivateIPv4(Number(m[1]), Number(m[2]))
  }
  const h = address.toLowerCase()
  if (h === '::1' || h === '::') return true
  if (h.startsWith('fc') || h.startsWith('fd')) return true // fc00::/7 unique local
  if (h.startsWith('fe8') || h.startsWith('fe9') || h.startsWith('fea') || h.startsWith('feb')) return true // fe80::/10 link-local
  const mapped = h.match(/^::ffff:(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
  if (mapped) return isPrivateIPv4(Number(mapped[1]), Number(mapped[2]))
  return false
}

// Resolves the hostname and checks the ACTUAL address(es), not just the hostname
// string — closes bypasses via decimal/octal/hex IP encodings (which getaddrinfo
// normalizes on resolution) and narrows the DNS-rebinding window to the gap between
// this lookup and the fetch() below, rather than leaving it wide open entirely.
async function isPrivateHost(hostname: string): Promise<boolean> {
  const h = hostname.toLowerCase()
  if (h === 'localhost') return true
  try {
    const results = await dns.promises.lookup(h, { all: true, verbatim: true })
    if (results.length === 0) return true
    return results.some((r) => isPrivateAddress(r.address, r.family))
  } catch {
    return true // unresolvable — reject defensively
  }
}

export default async function handler(req: any, res: any) {
  const { url } = req.query

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ title: null })
  }
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return res.status(400).json({ title: null })
  }
  try {
    const { hostname } = new URL(url)
    if (await isPrivateHost(hostname)) return res.status(400).json({ title: null })
  } catch {
    return res.status(400).json({ title: null })
  }

  res.setHeader('Cache-Control', 'no-cache, no-store')

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 9000)

    const response = await fetch(url, {
      headers: {
        'Icy-MetaData': '1',
        'User-Agent': 'Mozilla/5.0 (compatible; WebRadio/1.0)',
        'Accept': '*/*',
      },
      signal: controller.signal,
    })

    clearTimeout(timeout)

    if (!response.ok || !response.body) {
      if (response.body) response.body.cancel().catch(() => {})
      return res.json({ title: null, icySupported: false })
    }

    const metaintHeader = response.headers.get('icy-metaint')
    if (!metaintHeader) {
      response.body.cancel().catch(() => {})
      return res.json({ title: null, icySupported: false })
    }

    const metaint = parseInt(metaintHeader, 10)
    if (!metaint || metaint <= 0 || metaint > 65536) {
      response.body.cancel().catch(() => {})
      return res.json({ title: null, icySupported: false })
    }

    // Read just enough bytes to reach the first metadata block
    const reader = response.body.getReader()
    const chunks: Uint8Array[] = []
    let totalBytes = 0
    const needed = metaint + 1 + 255 * 16

    try {
      while (totalBytes < needed) {
        const { done, value } = await reader.read()
        if (done || !value) break
        chunks.push(value)
        totalBytes += value.length
      }
    } finally {
      reader.cancel().catch(() => {})
    }

    const buffer = new Uint8Array(totalBytes)
    let offset = 0
    for (const chunk of chunks) {
      buffer.set(chunk, offset)
      offset += chunk.length
    }

    if (buffer.length <= metaint) return res.json({ title: null, icySupported: false })

    const metaLen = buffer[metaint] * 16
    if (metaLen === 0 || buffer.length < metaint + 1 + metaLen) {
      // Empty block is normal between track changes — stream supports ICY, just no title yet
      return res.json({ title: null, icySupported: true })
    }

    const metaStr = new TextDecoder('utf-8', { fatal: false })
      .decode(buffer.slice(metaint + 1, metaint + 1 + metaLen))
      .replace(/\0+$/, '')

    // Split on '; (ICY key-value pair delimiter) to correctly handle apostrophes in values.
    // e.g. "Don't Stop Me Now" would break a naive regex like /StreamTitle='([^']*)'/
    let title: string | null = null
    for (const pair of metaStr.split("';")) {
      if (pair.startsWith("StreamTitle='")) {
        title = pair.slice("StreamTitle='".length).trim() || null
        break
      }
    }
    const genre = response.headers.get('icy-genre') || null

    return res.json({ title, genre, icySupported: true })
  } catch {
    return res.json({ title: null, icySupported: false })
  }
}
