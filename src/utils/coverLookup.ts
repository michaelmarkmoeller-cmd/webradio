import type { NowPlayingCover } from './nowPlaying'

// Albumcover til ICY-stationer: streamen sender kun "Kunstner - Titel" som tekst, så coveret
// slås op i Apple Musics (iTunes) søge-API — CORS `*`, ingen nøgle. Kun et sikkert match
// (kunstner + titel skal ligne, ingen live/karaoke-versioner) giver et cover; ellers bliver
// stationslogoet stående. Resultatet caches pr. kunstner+titel (også "intet match").

const cache = new Map<string, NowPlayingCover | null>()

const BAD_VERSION = /\b(live|karaoke|tribute|made famous|instrumental|cover version|originally performed)\b/i
// Senere/andre versioner: afvises, medmindre radioens egen titel også nævner ordet/året
const OTHER_VERSION = /\b(remix(?:es)?|rework|re-?edit|re-?mix|coronaversion|bootleg|mashup|sped up|slowed|nightcore|dj mix)\b/i

const COMPILATION = /\b(hits|best of|greatest|collection|anthology|essential|compilation|now that|presents|gold|vol\.?\s*\d+)\b/i

// Fjerner støj som "(1979)", "#6 USA" og `Album "Low"` fra radioens titel
function cleanTitle(t: string): string {
  return t
    .replace(/\s+Album\s+".*"\s*$/i, '')
    .replace(/\s+#\d+.*$/, '')
    .replace(/\s*\((19|20)\d{2}\)/g, '')
    .trim()
}

// Sammenligningsform: små bogstaver uden accenter, parenteser/remix-hale og tegnsætning
function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\(.*?\)|\[.*?\]/g, ' ')
    .replace(/\s-\s.*$/, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// Hovedkunstner: "A feat. B", "A & B", "A, B", "A x B" → "A"
function primaryArtist(a: string): string {
  return norm(a.split(/\s+(?:feat\.?|ft\.?|featuring|x|vs\.?|and)\s+|\s*[,&/]\s*/i)[0])
}

interface ItunesTrack {
  artistName?: string
  trackName?: string
  collectionName?: string
  artworkUrl100?: string
}

function score(r: ItunesTrack, artist: string, title: string, radio: string, wantsBad: boolean): number {
  const rArtist = norm(r.artistName ?? '')
  const rTitle = norm(r.trackName ?? '')
  const pa = primaryArtist(artist)
  const nt = norm(title)
  if (!pa || !nt || !rArtist || !rTitle) return -1
  if (!(rArtist.includes(pa) || pa.includes(primaryArtist(r.artistName ?? '')))) return -1
  if (rTitle !== nt) return -1
  const name = `${r.trackName ?? ''} ${r.collectionName ?? ''}`
  if (!wantsBad && BAD_VERSION.test(name)) return -1
  const other = name.match(OTHER_VERSION)
  if (other && !new RegExp('\\b' + other[1], 'i').test(radio)) return -1
  // År i selve titlen ("I Like Chopin 2020") = nyere genudgivelse, som radioens titel ikke nævner
  const year = (r.trackName ?? '').match(/\b(?:19|20)\d{2}\b/)
  if (year && !radio.includes(year[0])) return -1
  // Rang: single (2) > album (1) > opsamling (0) — udgivelsestypen vejer tungest, kunstner-match er kun tiebreaker
  const coll = r.collectionName ?? ''
  const tier = COMPILATION.test(coll) ? 0 : /-\s*(single|ep)$/i.test(coll) ? 2 : 1
  return tier * 10 + (norm(r.artistName ?? '') === norm(artist) ? 1 : 0)
}

export async function lookupAppleCover(track: string, signal: AbortSignal): Promise<NowPlayingCover | null> {
  const i = track.indexOf(' - ')
  if (i <= 0) return null
  const artist = track.slice(0, i).trim()
  const title = cleanTitle(track.slice(i + 3))
  if (!artist || !title) return null
  const key = `${norm(artist)}|${norm(title)}`
  if (cache.has(key)) return cache.get(key) ?? null

  let result: NowPlayingCover | null = null
  try {
    // Versionsangivelser i parentes ("(Extended Remix)") ud af søgeordet — ellers finder Apple intet
    const searchTitle = title.replace(/\(.*?\)|\[.*?\]/g, ' ').replace(/\s-\s.*$/, '').replace(/\s+/g, ' ').trim() || title
    const q = encodeURIComponent(`${artist} ${searchTitle}`)
    const res = await fetch(`https://itunes.apple.com/search?term=${q}&entity=song&limit=15`, { signal })
    if (!res.ok) return null  // ikke cachet — prøv igen ved næste poll
    const data = await res.json() as { results?: ItunesTrack[] }
    const wantsBad = BAD_VERSION.test(track)
    let best: ItunesTrack | null = null
    let bestScore = -1
    for (const r of data.results ?? []) {
      const s = score(r, artist, title, track, wantsBad)
      if (s > bestScore) { best = r; bestScore = s }
    }
    const art = best?.artworkUrl100
    if (art && art.startsWith('https://')) {
      result = { src: art.replace(/\/\d+x\d+bb\./, '/600x600bb.'), sizes: '600x600', source: 'Apple Music' }
    }
  } catch {
    return null  // netværksfejl/afbrudt — ikke cachet
  }
  cache.set(key, result)
  return result
}
