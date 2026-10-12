// Laver ét kunstnercover pr. kunstner i "Downloaded Covers/<Kunstner>.jpg":
// kunstnerfoto (Deezer, 1000×1000) med kunstnerens navn som typografisk logo nederst.
// Brug: node fetch-artist.mjs "Erasure" ["Depeche Mode" ...]   (valgfrit: --label "Vist navn" pr. kunstner med "Søgenavn=Vist navn")
import { mkdir, writeFile } from 'node:fs/promises'
import sharp from 'sharp'

const SIZE = 1000
const flat = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '')
const safe = s => s.replace(/[\/:*?"<>|]/g, '_').trim()
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')

const plain = process.argv.includes('--plain') // uden navnetekst: når navnet allerede står på billedet
for (const arg of process.argv.slice(2).filter(a => a !== '--plain')) {
  const [query, label = query] = arg.split('=')
  // Tal som søgenavn = Deezer-kunstner-id (til tvetydige navne): "186634757=Divine"
  const { data = [] } = /^\d+$/.test(query)
    ? { data: [await (await fetch(`https://api.deezer.com/artist/${query}`)).json()] }
    : await (await fetch(`https://api.deezer.com/search/artist?q=${encodeURIComponent(query)}`)).json()
  // Kandidater: samme navn (flest fans først), derefter navne der starter med søgningen
  const cands = /^\d+$/.test(query) ? data : [...data.filter(a => flat(a.name) === flat(query)).sort((a, b) => b.nb_fan - a.nb_fan),
                 ...data.filter(a => flat(a.name) !== flat(query) && flat(a.name).startsWith(flat(query)))]
  // Springer Deezers grå pladsholder over (næsten ensfarvet: lav spredning i pixelværdier)
  let dz = null, photo = null
  for (const c of cands) {
    const buf = Buffer.from(await (await fetch(c.picture_xl)).arrayBuffer())
    const sd = (await sharp(buf).stats()).channels.reduce((n, ch) => n + ch.stdev, 0) / 3
    if (sd > 25) { dz = c; photo = buf; break }
  }
  if (!dz) { console.log(`${query}: intet kunstnerfoto hos Deezer (kun pladsholdere)`); continue }

  const name = esc(label.toUpperCase())
  const fontSize = Math.min(150, Math.floor((SIZE * 0.86) / (name.length * 0.78)))
  const svg = `<svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0.45" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.85"/></linearGradient></defs>
    <rect width="${SIZE}" height="${SIZE}" fill="url(#g)"/>
    <text x="${SIZE / 2}" y="${SIZE - 70}" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="${fontSize}"
      text-anchor="middle" fill="#fff" stroke="#000" stroke-width="${fontSize / 25}" paint-order="stroke">${name}</text></svg>`

  const out = await sharp(photo).resize(SIZE, SIZE, { fit: 'cover' })
    .composite(plain ? [] : [{ input: Buffer.from(svg) }]).jpeg({ quality: 92 }).toBuffer()
  await mkdir('Downloaded Covers', { recursive: true })
  const file = `Downloaded Covers/${safe(label)}.jpg`
  await writeFile(file, out)
  console.log(`${file}  ${SIZE}×${SIZE}  (Deezer: ${dz.name})`)
}
