import type { NowPlayingCover } from './nowPlaying'

// Albumcover til ICY-stationer: streamen sender kun "Kunstner - Titel" som tekst, så coveret
// slås op i Apple Musics (iTunes) søge-API — CORS `*`, ingen nøgle. Kun et sikkert match
// (kunstner + titel skal ligne, ingen live/karaoke-versioner) giver et cover; ellers bliver
// stationslogoet stående. Resultatet caches pr. kunstner+titel (også "intet match").

const cache = new Map<string, NowPlayingCover | null>()

const BAD_VERSION = /\b(live|karaoke|tribute|made famous|instrumental|cover version|originally performed)\b/i
// Senere/andre versioner: afvises, medmindre radioens egen titel også nævner ordet/året
const OTHER_VERSION = /\b(remix(?:es)?|rework|re-?edit|re-?mix|coronaversion|bootleg|mashup|sped up|slowed|nightcore|dj mix)\b/i

const SOUNDTRACK = /\b(motion picture|soundtrack|original score|music from|o\.?s\.?t\.?)\b/i

const COMPILATION = /\b(hits|best of|greatest|collection|anthology|essential|compilation|now that|presents|gold|vol\.?\s*\d+)\b/i

// Fjerner støj som "(1979)", "#6 USA" og `Album "Low"` fra radioens titel
function cleanTitle(t: string): string {
  return t
    .replace(/\s+Album\s+".*"\s*$/i, '')
    .replace(/\s+#\d+.*$/, '')
    .replace(/\s*\((19|20)\d{2}\)/g, '')
    // Årstal som hale ("Kalimba de luna * 1984", "Wheel Of Love - 1987") — RdMix m.fl.
    .replace(/\s*[*\-–]\s*(19|20)\d{2}\s*$/, '')
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

// Som norm(), men beholder parenteser (gæstekunstnere står ofte i "(feat. X)")
function normKeep(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// Alle navne i en kunstnerstreng ("Tegan & Sara" → tegan, sara) — bruges når radio og Apple
// har byttet rundt på hoved- og gæstekunstner ("A - Titel Feat. B" vs "B - Titel (feat. A)")
function artistNames(a: string): string[] {
  return a.split(/\s+(?:feat\.?|ft\.?|featuring|vs\.?|x|and)\s+|\s*[,&/]\s*/i).map(normKeep).filter(n => n.length >= 3)
}

// Redigeringsafstand — radioens kunstnerstavning har ofte småfejl ("Gazilion" vs "Gazillion")
function editDistance(a: string, b: string): number {
  const prev = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0]
    prev[0] = i
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j]
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1))
      diag = tmp
    }
  }
  return prev[b.length]
}

// Næsten ens: højst 1 fejl pr. 8 tegn (og kun for navne på mindst 6 tegn, så korte navne ikke forveksles)
function similarName(a: string, b: string): boolean {
  if (a.length < 6 || b.length < 6) return false
  return editDistance(a, b) <= Math.max(1, Math.floor(Math.min(a.length, b.length) / 8))
}

interface ItunesTrack {
  artistName?: string
  trackName?: string
  collectionName?: string
  collectionArtistName?: string
  primaryGenreName?: string
  artworkUrl100?: string
}

function score(r: ItunesTrack, artist: string, names: string[], title: string, radio: string, wantsBad: boolean): number {
  const rArtist = norm(r.artistName ?? '')
  const rTitle = norm(r.trackName ?? '')
  const pa = primaryArtist(artist)
  const nt = norm(title)
  if (!pa || !nt || !rArtist || !rTitle) return -1
  const rText = normKeep(`${r.artistName ?? ''} ${r.trackName ?? ''}`)
  const artistOk = rArtist.includes(pa) || pa.includes(primaryArtist(r.artistName ?? '')) || names.some(n => rText.includes(n))
    || similarName(pa, primaryArtist(r.artistName ?? '')) || similarName(norm(artist), rArtist)
  if (!artistOk) return -1
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
  // "Various Artists" og soundtracks ("Filth (Music From the Original Motion Picture)") er opsamlinger,
  // selvom navnet ikke siger det. Kunstnerens egen opsamling ("The Very Best of …") er bedre end dem
  const foreign = r.collectionArtistName === 'Various Artists' || r.primaryGenreName === 'Soundtrack' || SOUNDTRACK.test(coll)
  const compilation = foreign || COMPILATION.test(coll)
  const tier = compilation ? 0 : /-\s*(single|ep)$/i.test(coll) ? 2 : 1
  return tier * 10 + (compilation && !foreign ? 5 : 0) + (norm(r.artistName ?? '') === norm(artist) ? 1 : 0)
}

// Næsten helt hvidt billede = blankt standardcover (andel af næsten hvide pixels > 95 %). Måles på et lille
// canvas. Apples billedserver har CORS `*`; kan billedet ikke læses (CORS/fejl/timeout/ingen DOM), tæller det
// som "ikke blankt", så et muligt cover aldrig afvises uden grund
function isBlankCover(url: string, signal: AbortSignal): Promise<boolean> {
  if (typeof document === 'undefined') return Promise.resolve(false)
  return new Promise(resolve => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    const timer = setTimeout(() => resolve(false), 4000)
    const finish = (v: boolean) => { clearTimeout(timer); resolve(v) }
    signal.addEventListener('abort', () => finish(false), { once: true })
    img.onerror = () => finish(false)
    img.onload = () => {
      try {
        const n = 32
        const canvas = document.createElement('canvas')
        canvas.width = canvas.height = n
        const ctx = canvas.getContext('2d')
        if (!ctx) return finish(false)
        ctx.fillStyle = '#fff'
        ctx.fillRect(0, 0, n, n)
        ctx.drawImage(img, 0, 0, n, n)
        const d = ctx.getImageData(0, 0, n, n).data
        let white = 0
        for (let i = 0; i < d.length; i += 4) if (d[i] > 225 && d[i + 1] > 225 && d[i + 2] > 225) white++
        finish(white / (n * n) > 0.95)
      } catch { finish(false) }
    }
    img.src = url
  })
}

export async function lookupAppleCover(track: string, signal: AbortSignal): Promise<NowPlayingCover | null> {
  const i = track.indexOf(' - ')
  if (i <= 0) return null
  const artist = track.slice(0, i).trim()
  let title = cleanTitle(track.slice(i + 3))
  // "Titel Feat. B" uden parentes: gæstekunstneren ud af titlen (bruges kun til kunstner-match)
  const featMatch = title.match(/\s+(?:feat\.?|ft\.?|featuring)\s+(.+)$/i)
  const featured = featMatch ? featMatch[1] : ''
  if (featMatch) title = title.slice(0, featMatch.index).trim()
  if (!artist || !title) return null
  const names = [...artistNames(artist), ...artistNames(featured)]
  const key = `${norm(artist)}|${norm(title)}`
  if (cache.has(key)) return cache.get(key) ?? null

  let result: NowPlayingCover | null = null
  try {
    // Versionsangivelser i parentes ("(Extended Remix)") ud af søgeordet — ellers finder Apple intet
    const searchTitle = title.replace(/\(.*?\)|\[.*?\]/g, ' ').replace(/\s-\s.*$/, '').replace(/&/g, 'and').replace(/\s+/g, ' ').trim() || title
    const q = encodeURIComponent(`${artist} ${searchTitle}`)
    const res = await fetch(`https://itunes.apple.com/search?term=${q}&entity=song&limit=50`, { signal })
    if (!res.ok) return null  // ikke cachet — prøv igen ved næste poll
    const data = await res.json() as { results?: ItunesTrack[] }
    const wantsBad = BAD_VERSION.test(track)
    // Gyldige kandidater, bedste først. Et cover kan være et blankt standardbillede (fx Universals hvide
    // "LUV"-flise på en EP) — så tages den næste. Højst 4 tjekkes; er alle blanke, vises stationslogoet
    const ranked = (data.results ?? [])
      .map(r => ({ r, s: score(r, artist, names, title, track, wantsBad) }))
      .filter(x => x.s >= 0 && x.r.artworkUrl100?.startsWith('https://'))
      .sort((a, b) => b.s - a.s)
    const tried = new Set<string>()
    for (const { r } of ranked) {
      const small = r.artworkUrl100!
      if (tried.has(small)) continue
      if (tried.size >= 4) break
      tried.add(small)
      if (await isBlankCover(small, signal)) continue
      result = { src: small.replace(/\/\d+x\d+bb\./, '/600x600bb.'), sizes: '600x600', source: 'Apple Music' }
      break
    }
  } catch {
    return null  // netværksfejl/afbrudt — ikke cachet
  }
  cache.set(key, result)
  return result
}
