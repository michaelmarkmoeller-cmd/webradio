// Henter kunstner-profilfoto og gemmer som:
//   "Downloaded Covers/<letter>/<Kunstnernavn>/folder.jpg"
//
// Primær kilde: Apple Music artistprofil (1000×1000 artistfoto)
// Fallback:     Wikipedia-foto
//
// Brug:
//   node fetch-artist.mjs --letter E "Erasure" ["Echo & The Bunnymen" ...]
//   node fetch-artist.mjs --letter E --plain "Erasure"   (ingen navnetekst — navn allerede på billedet)
//   node fetch-artist.mjs --letter E "153089=Erasure"    (tal = Apple Music artist-id til tvetydige navne)

import { mkdir, writeFile } from 'node:fs/promises'
import sharp from 'sharp'

const SIZE = 1000
const safe = s => s.replace(/[/:*?"<>|]/g, '_').trim()
const esc  = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')
const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '')

const IOS_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15'

const argv = process.argv.slice(2)
const plain = argv.includes('--plain')
const letterIdx = argv.indexOf('--letter')
const letter = letterIdx !== -1 ? argv[letterIdx + 1] : null

if (!letter) { console.error('Angiv bogstav med --letter X (fx --letter E)'); process.exit(1) }

const artists = argv.filter((a, i) =>
  a !== '--plain' && a !== '--letter' && argv[i - 1] !== '--letter'
)

async function fetchAppleArtistPhoto(query, artistId) {
  // Find Apple Music artist-ID hvis ikke angivet
  if (!artistId) {
    for (const country of ['dk', 'us']) {
      try {
        const r = await fetch(`https://itunes.apple.com/search?entity=musicArtist&term=${encodeURIComponent(query)}&limit=10&country=${country}`)
        const j = await r.json()
        const match = (j.results ?? []).find(a => norm(a.artistName) === norm(query))
        if (match) { artistId = String(match.artistId); break }
      } catch { break } // rate limit eller JSON-fejl → spring Apple Music over
    }
  }
  if (!artistId) return null

  // Hent Apple Music artistside og udtræk profilbilledet fra og:image
  const page = await fetch(`https://music.apple.com/us/artist/${encodeURIComponent(query.toLowerCase().replace(/\s+/g, '-'))}/${artistId}`, {
    headers: { 'User-Agent': IOS_UA }
  })
  if (!page.ok) return null
  const html = await page.text()
  const ogImg = html.match(/property="og:image" content="([^"]+)"/)?.[1]
  if (!ogImg) return null

  // Kun ægte artistfotos — Apple Music albumcovers har ikke AMCArtistImages i URL'en
  if (!ogImg.includes('AMCArtistImages')) return null

  // Fjern størrelses-suffixet og bed om 1000×1000 kvadrat
  const base = ogImg.replace(/\/\d+x\d+[a-z]+\.[a-z]+$/, '')
  const url  = `${base}/${SIZE}x${SIZE}bb.jpg`

  const res = await fetch(url)
  if (!res.ok) return null
  const buf = Buffer.from(await res.arrayBuffer())
  if (!buf.length) return null

  // Bekræft faktiske pixeldimensioner
  const meta = await sharp(buf).metadata()
  return { buf, width: meta.width, height: meta.height, artistId }
}

async function fetchWikipediaPhoto(query) {
  const r = await fetch(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query + ' band music')}&srlimit=3&format=json&origin=*`)
  const j = await r.json()
  for (const p of (j.query?.search ?? [])) {
    const r2 = await fetch(`https://en.wikipedia.org/w/api.php?action=query&pageids=${p.pageid}&prop=pageimages&pithumbsize=2000&pilicense=any&format=json&origin=*`)
    const j2 = await r2.json()
    const page = Object.values(j2.query?.pages ?? {})[0]
    if (!page?.thumbnail) continue
    const { source, width, height } = page.thumbnail
    if (width < 700 && height < 700) continue
    const res = await fetch(source)
    if (!res.ok) continue
    const buf = Buffer.from(await res.arrayBuffer())
    if (!buf.length) continue
    return { buf, width, height }
  }
  return null
}

const sleep = ms => new Promise(r => setTimeout(r, ms))

for (const arg of artists) {
  // Syntaks: "153089=Erasure"  → Apple Music ID + mappenavn
  //          "Enrique Iglesias|Enrique Iglesias feat. Pitbull" → søgenavn|mappenavn
  //          "Erasure"                                         → søgenavn = mappenavn
  const pipeIdx = arg.indexOf('|')
  const eqIdx   = arg.indexOf('=')
  const isId    = eqIdx !== -1 && pipeIdx === -1 && /^\d+$/.test(arg.slice(0, eqIdx))

  let artistId, label, query
  if (isId) {
    artistId = arg.slice(0, eqIdx)
    label    = arg.slice(eqIdx + 1)
    query    = label
  } else if (pipeIdx !== -1) {
    artistId = null
    query    = arg.slice(0, pipeIdx)
    label    = arg.slice(pipeIdx + 1)
  } else {
    artistId = null
    query    = arg
    label    = arg
  }

  await sleep(3000)
  console.log(`\n→ ${label}`)

  let buf = null, source = '', note = ''

  // Primær: Apple Music artistprofil — kun ægte artistfotos (AMCArtistImages) → navn påskrives
  // Fallback 1: Wikipedia-foto → navn påskrives
  // Fallback 2: Apple Music albumcover → plain (navn står allerede på coveret)
  let isAlbumCover = false
  try {
    const apple = await fetchAppleArtistPhoto(query, artistId)
    if (apple) {
      buf    = apple.buf
      source = `Apple Music artistfoto (${apple.width}×${apple.height}px)`
      if (apple.width < 1000 || apple.height < 1000) note = ' ⚠️ under 1000px'
    }
  } catch { /* rate limit eller netværksfejl — prøv næste kilde */ }

  if (!buf) {
    try {
      const wiki = await fetchWikipediaPhoto(query)
      if (wiki) {
        buf    = wiki.buf
        source = `Wikipedia (${wiki.width}×${wiki.height}px)`
        if (wiki.width < 1000 || wiki.height < 1000) note = ' ⚠️ under 1000px'
      }
    } catch { /* rate limit eller netværksfejl */ }
  }

  // Fallback 2: albumcover — ingen navnetekst (navn er allerede på coveret)
  if (!buf) {
    try {
      const r = await fetch(`https://itunes.apple.com/search?entity=musicArtist&term=${encodeURIComponent(query)}&limit=5&country=us`)
      const j = await r.json()
      const hit = j.results?.find(a => a.artistName.toLowerCase().includes(query.toLowerCase().split(' ')[0].toLowerCase()))
      if (hit) {
        const slug = hit.artistName.toLowerCase().replace(/[^a-z0-9]+/g, '-')
        const page = await fetch(`https://music.apple.com/us/artist/${slug}/${hit.artistId}`, {
          headers: { 'User-Agent': IOS_UA }
        })
        const html = await page.text()
        const ogImg = html.match(/property="og:image" content="([^"]+)"/)?.[1]
        if (ogImg) {
          const base = ogImg.replace(/\/\d+x\d+[a-z]+\.[a-z]+$/, '')
          const res = await fetch(`${base}/${SIZE}x${SIZE}bb.jpg`)
          if (res.ok) {
            const b = Buffer.from(await res.arrayBuffer())
            if (b.length) {
              const meta = await sharp(b).metadata()
              buf = b
              source = `Apple Music albumcover (${meta.width}×${meta.height}px) — plain`
              isAlbumCover = true
              if (meta.width < 1000 || meta.height < 1000) note = ' ⚠️ under 1000px'
            }
          }
        }
      }
    } catch { /* intet fundet */ }
  }

  if (!buf) {
    console.log(`  ✗ intet artistfoto fundet`)
    continue
  }

  // Navnetekst-overlay
  const name     = esc(label.toUpperCase())
  const fontSize = Math.min(150, Math.floor((SIZE * 0.86) / (name.length * 0.78)))
  const svg = `<svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0.45" stop-color="#000" stop-opacity="0"/>
      <stop offset="1"    stop-color="#000" stop-opacity="0.85"/></linearGradient></defs>
    <rect width="${SIZE}" height="${SIZE}" fill="url(#g)"/>
    <text x="${SIZE / 2}" y="${SIZE - 70}"
      font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="${fontSize}"
      text-anchor="middle" fill="#fff" stroke="#000" stroke-width="${fontSize / 25}"
      paint-order="stroke">${name}</text></svg>`

  const skipText = plain || isAlbumCover
  const out = await sharp(buf)
    .resize(SIZE, SIZE, { fit: 'cover' })
    .composite(skipText ? [] : [{ input: Buffer.from(svg) }])
    .jpeg({ quality: 92 })
    .toBuffer()

  const dir  = `Downloaded Covers/${letter}/${safe(label)}`
  await mkdir(dir, { recursive: true })
  const file = `${dir}/folder.jpg`
  await writeFile(file, out)
  console.log(`  ✓ ${file}${note}`)
  console.log(`    Kilde: ${source}`)
  console.log(`    Tekst: ${skipText ? 'ingen (navn allerede på billedet)' : `"${label}" som overlay`}`)
}
