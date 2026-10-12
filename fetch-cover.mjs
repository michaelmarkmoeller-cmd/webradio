// Henter albumcover fra Apple Music (iTunes Search API) til "Downloaded Covers/".
// Brug: node fetch-cover.mjs "Kunstner - Titel" [størrelse=1000]
import { mkdir, writeFile } from 'node:fs/promises'

const query = process.argv[2]
const size = process.argv[3] || '1000'
if (!query) { console.error('Brug: node fetch-cover.mjs "Kunstner - Titel" [størrelse]'); process.exit(1) }

const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\(.*?\)/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()
const [artist, ...rest] = query.split(' - ')
const title = rest.join(' - ')
const wantTitle = norm(title), wantArtist = norm(artist)

let best = null
for (const country of ['dk', 'us']) {
  const r = await fetch(`https://itunes.apple.com/search?entity=song&limit=50&country=${country}&term=${encodeURIComponent(query)}`)
  const { results = [] } = await r.json()
  const hits = results.filter(x => norm(x.trackName) === wantTitle && norm(x.artistName).includes(wantArtist))
  // Foretræk single/EP/album frem for opsamlinger
  const score = x => (/- (single|ep)$/i.test(x.collectionName) ? 3 : 0) + (/hits|best of|greatest|collection|various/i.test(x.collectionName + x.collectionArtistName) ? 0 : 2)
  hits.sort((a, b) => score(b) - score(a))
  if (hits[0]) { best = hits[0]; break }
}
if (!best) { console.error('Intet sikkert match hos Apple Music for: ' + query); process.exit(2) }

const url = best.artworkUrl100.replace('100x100bb', `${size}x${size}bb`)
const img = await fetch(url)
if (!img.ok) { console.error('Download fejlede: ' + img.status); process.exit(3) }
const safe = `${best.artistName} - ${best.trackName}`.replace(/[\/:*?"<>|]/g, '_')
await mkdir('Downloaded Covers', { recursive: true })
const file = `Downloaded Covers/${safe}.jpg`
await writeFile(file, Buffer.from(await img.arrayBuffer()))
console.log(`Gemt: ${file}\nAlbum: ${best.collectionName}\nKilde: ${url}`)
