import { isPrivateHost } from './_lib/privateHost.js'

// Leverer låseskærms-/CarPlay-artwork (albumcover, stationslogo) fra appens eget domæne.
// iOS viste kun det same-origin app-ikon og ignorerede covers/logoer fra fremmede
// domæner, selv med CORS `*` — så MediaSession peger nu altid på denne proxy.
// Kun https, kun offentlige hosts (SSRF-tjek pr. redirect-hop), kun billeder, max 2 MB.

const MAX_BYTES = 2 * 1024 * 1024
const MAX_REDIRECTS = 3

async function fetchImage(url: string, signal: AbortSignal): Promise<Response | null> {
  let current = url
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    let parsed: URL
    try { parsed = new URL(current) } catch { return null }
    if (parsed.protocol !== 'https:' || await isPrivateHost(parsed.hostname)) return null
    const res = await fetch(current, {
      redirect: 'manual',
      headers: { 'Accept': 'image/*', 'User-Agent': 'Mozilla/5.0 (compatible; WebRadio/1.0)' },
      signal,
    })
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get('location')
      res.body?.cancel().catch(() => {})
      if (!location) return null
      current = new URL(location, current).href
      continue
    }
    return res
  }
  return null
}

export default async function handler(req: any, res: any) {
  const { url } = req.query
  if (typeof url !== 'string' || !url.startsWith('https://')) return res.status(400).end()

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000)
  try {
    const upstream = await fetchImage(url, controller.signal)
    if (!upstream || !upstream.ok || !upstream.body) return res.status(502).end()

    const type = upstream.headers.get('content-type') ?? ''
    if (!type.startsWith('image/')) {
      upstream.body.cancel().catch(() => {})
      return res.status(415).end()
    }
    const declared = Number(upstream.headers.get('content-length'))
    if (declared > MAX_BYTES) {
      upstream.body.cancel().catch(() => {})
      return res.status(413).end()
    }

    const reader = upstream.body.getReader()
    const chunks: Uint8Array[] = []
    let total = 0
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      total += value.length
      if (total > MAX_BYTES) {
        reader.cancel().catch(() => {})
        return res.status(413).end()
      }
      chunks.push(value)
    }

    res.setHeader('Content-Type', type)
    // Cover-/logo-URL'er er versionerede/uforanderlige — cache længe i browser og på edge
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=604800, immutable')
    return res.status(200).send(Buffer.concat(chunks))
  } catch {
    return res.status(502).end()
  } finally {
    clearTimeout(timeout)
  }
}
