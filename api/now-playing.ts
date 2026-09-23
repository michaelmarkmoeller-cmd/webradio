// Proxy til Bauer Medias (Radioplay DK) nu-spiller-API. API'ets CORS tillader kun
// radioplay.dk, så browseren kan ikke kalde det direkte. Kun en fast host og en
// valideret stationskode bruges i den udgående URL — ingen brugerstyret URL (ingen SSRF).

const STATION_CODE = /^[a-z0-9]{2,5}$/

// Bauer returnerer tidspunkter som dansk lokaltid uden tidszone ("2026-09-23 08:23:40")
function copenhagenToIso(local: unknown): string | null {
  if (typeof local !== 'string') return null
  const m = local.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/)
  if (!m) return null
  const asUtc = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6])
  // Find København-offset på det tidspunkt (håndterer sommer-/vintertid)
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Copenhagen', hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(new Date(asUtc))
  const get = (t: string) => Number(parts.find(p => p.type === t)?.value)
  const shown = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'))
  return new Date(asUtc - (shown - asUtc)).toISOString()
}

export default async function handler(req: any, res: any) {
  const { station } = req.query
  if (typeof station !== 'string' || !STATION_CODE.test(station)) {
    return res.status(400).json({ title: null, end: null })
  }

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 6000)
    const response = await fetch(`https://listenapi.planetradio.co.uk/api9.2/nowplaying/${station}`, {
      headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0 (compatible; WebRadio/1.0)' },
      signal: controller.signal,
    })
    clearTimeout(timeout)
    if (!response.ok) return res.json({ title: null, end: null })

    const data = await response.json()
    const artist = typeof data?.ArtistName === 'string' ? data.ArtistName.trim() : ''
    const song = typeof data?.TrackTitle === 'string' ? data.TrackTitle.trim() : ''
    const title = song ? (artist ? `${artist} - ${song}` : song) : null

    // Kort delt cache — alle lyttere på samme station deler ét opslag hos Bauer
    res.setHeader('Cache-Control', 's-maxage=15, stale-while-revalidate=15')
    return res.json({ title, end: copenhagenToIso(data?.EventFinish) })
  } catch {
    return res.json({ title: null, end: null })
  }
}
