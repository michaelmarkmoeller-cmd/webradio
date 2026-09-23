// "Nu spiller" fra netværkernes egne API'er — til stationer hvis stream ikke sender en brugbar
// ICY StreamTitle (streamabc/QuantumCast: 80s80s, 90s90s, BOB!, bigFM, Klassik Radio — kun
// stationsnavn; Bauer DK: ingen titel). Iris/streamabc svarer med CORS `*` og kaldes direkte
// fra browseren; Bauers CORS tillader kun radioplay.dk, så den går via `/api/now-playing`.
// Kilden udledes af stream-URL'ens host + første path-segment (mount), så en station der
// oprettes igen med samme URL automatisk får sangtitel. Kanal-ID'erne står som
// `data-channel` på netværkernes forsider (verificeret 23-09-2026).

export type NowPlayingSource =
  | { kind: 'iris'; base: string; station: string }
  | { kind: 'streamabc'; channel: string }
  | { kind: 'bauer'; station: string }

interface IrisNetwork {
  host: string
  base: string
  mounts: Record<string, string>
}

const IRIS_NETWORKS: IrisNetwork[] = [
  {
    host: 'streams.80s80s.de',
    base: 'https://iris-80s80s.loverad.io',
    mounts: { web: '62', mix: '558', maxis: '596', summerhits: '569', italohits: '283', italodiscomix: '834' },
  },
  {
    host: 'streams.90s90s.de',
    base: 'https://iris-90s90s.loverad.io',
    mounts: { pop: '141', eurodance: '188' },
  },
  {
    host: 'streams.radiobob.de',
    base: 'https://iris-bob.loverad.io',
    mounts: { 'bob-national': '69', 'bob-classicrock': '16' },
  },
  {
    host: 'stream.sunshine-live.de',
    base: 'https://iris-sunshinelive.loverad.io',
    mounts: { live: '3' },
  },
  {
    host: 'stream.bigfm.de',
    base: 'https://asw.api.iris.radiorepo.io/v2/playlist',
    mounts: { dance: '57' },
  },
]

const STREAMABC_MOUNTS: Record<string, Record<string, string>> = {
  'stream.klassikradio.de': { christmas: 'klassikr-christmas' },
}

// Bauer Media DK (Radioplay) — mount → stationCode fra listenapi.planetradio.co.uk/api9.2/stations/DK
const BAUER_HOST = 'live-bauerdk.sharp-stream.com'
const BAUER_MOUNTS: Record<string, string> = {
  'nova_dk_mp3': 'nov',
  'popfm_dk_mp3': 'pop',
  'popfm80.mp3': 'pf8',
  'thevoice_dk_mp3': 'the',
  'radio100_dk_mp3': 'rhu',
  'radiosoft_dk_mp3': 'dso',
  'dk_hq_rp05.aac': 'deh',
  'dk_hq_rp04.aac': 'eih',
}

// Et nummer der sluttede for mere end dette er ikke længere "nu" (fx nyheder/reklamer
// mellem numre) — vis hellere ingen titel end en forældet
const STALE_GRACE_MS = 2 * 60_000

export function getNowPlayingSource(streamUrl: string): NowPlayingSource | null {
  let parsed: URL
  try { parsed = new URL(streamUrl) } catch { return null }
  const host = parsed.hostname.toLowerCase()
  const mount = parsed.pathname.split('/').filter(Boolean)[0]?.toLowerCase()
  if (!mount) return null

  const iris = IRIS_NETWORKS.find(n => n.host === host)
  if (iris) {
    const station = iris.mounts[mount]
    return station ? { kind: 'iris', base: iris.base, station } : null
  }
  if (host === BAUER_HOST) {
    const station = BAUER_MOUNTS[mount]
    return station ? { kind: 'bauer', station } : null
  }
  const channel = STREAMABC_MOUNTS[host]?.[mount]
  return channel ? { kind: 'streamabc', channel } : null
}

export interface NowPlayingCover {
  src: string
  // MediaSession-hint til OS'et om billedets størrelse (fx "600x600")
  sizes: string
}

export interface NowPlaying {
  title: string | null
  cover: NowPlayingCover | null
}

const EMPTY: NowPlaying = { title: null, cover: null }

function isStale(endMs: number): boolean {
  return Number.isFinite(endMs) && endMs + STALE_GRACE_MS < Date.now()
}

function formatTrack(artist: string | null | undefined, song: string | null | undefined): string | null {
  const s = song?.trim()
  if (!s) return null
  const a = artist?.trim()
  return a ? `${a} - ${s}` : s
}

// Kun https-billeder — et http-billede ville give mixed content på HTTPS-appen
function coverOf(url: unknown, sizes: string): NowPlayingCover | null {
  return typeof url === 'string' && url.startsWith('https://') ? { src: url, sizes } : null
}

async function fetchIris(src: Extract<NowPlayingSource, { kind: 'iris' }>, signal: AbortSignal): Promise<NowPlaying> {
  const url = `${src.base}/flow.json?station=${encodeURIComponent(src.station)}&offset=1&count=1&ts=${Date.now()}`
  const res = await fetch(url, { signal })
  if (!res.ok) return EMPTY
  const data = await res.json()
  const entry = data?.result?.entry?.[0]
  const song = entry?.song?.entry?.[0]
  if (!song) return EMPTY

  const airtime = Date.parse(entry.airtime)
  const durationMs = Number(entry.duration) * 1000
  if (durationMs > 0 && isStale(airtime + durationMs)) return EMPTY

  const artists = Array.isArray(song.artist?.entry)
    ? song.artist.entry.map((a: { name?: string }) => a?.name).filter(Boolean).join(', ')
    : null
  // Apple Music-covers i faste størrelser — 600×600 er skarpt på låseskærm/CarPlay
  const cover = coverOf(song.cover_art_url_xl, '600x600') ?? coverOf(song.cover_art_url_l, '225x225')
  return { title: formatTrack(artists, song.title), cover }
}

async function fetchStreamAbc(src: Extract<NowPlayingSource, { kind: 'streamabc' }>, signal: AbortSignal): Promise<NowPlaying> {
  const res = await fetch(`https://api.streamabc.net/metadata/channel/${encodeURIComponent(src.channel)}.json`, { signal })
  if (!res.ok) return EMPTY
  const data = await res.json()
  // `song` kan indeholde en semikolon-separeret dublet ("Titel;Titel") — brug første del
  const song = typeof data?.song === 'string' ? data.song.split(';')[0] : null
  const artist = typeof data?.artist === 'string' ? data.artist.split(';')[0] : null
  const title = formatTrack(artist, song)
  // `cover` falder selv tilbage til kanalens logo, når nummeret ikke har et cover
  return { title, cover: title ? coverOf(data?.cover, '256x256') : null }
}

async function fetchBauer(src: Extract<NowPlayingSource, { kind: 'bauer' }>, signal: AbortSignal): Promise<NowPlaying> {
  const res = await fetch(`/api/now-playing?station=${encodeURIComponent(src.station)}`, { signal })
  if (!res.ok) return EMPTY
  const data = await res.json()
  if (typeof data?.end === 'string' && isStale(Date.parse(data.end))) return EMPTY
  const title = typeof data?.title === 'string' && data.title ? data.title : null
  return { title, cover: title ? coverOf(data?.cover, '320x320') : null }
}

export function fetchNowPlaying(src: NowPlayingSource, signal: AbortSignal): Promise<NowPlaying> {
  switch (src.kind) {
    case 'iris': return fetchIris(src, signal)
    case 'streamabc': return fetchStreamAbc(src, signal)
    case 'bauer': return fetchBauer(src, signal)
  }
}
