export default async function handler(req: any, res: any) {
  const { url } = req.query

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ title: null })
  }
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
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
      return res.json({ title: null })
    }

    const metaintHeader = response.headers.get('icy-metaint')
    if (!metaintHeader) {
      return res.json({ title: null })
    }

    const metaint = parseInt(metaintHeader, 10)
    if (!metaint || metaint <= 0) {
      return res.json({ title: null })
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

    if (buffer.length <= metaint) return res.json({ title: null })

    const metaLen = buffer[metaint] * 16
    if (metaLen === 0 || buffer.length < metaint + 1 + metaLen) {
      return res.json({ title: null })
    }

    const metaStr = new TextDecoder('utf-8', { fatal: false })
      .decode(buffer.slice(metaint + 1, metaint + 1 + metaLen))
      .replace(/\0+$/, '')

    const match = metaStr.match(/StreamTitle='([^']*)'/)
    const title = match?.[1]?.trim() || null

    return res.json({ title })
  } catch {
    return res.json({ title: null })
  }
}
