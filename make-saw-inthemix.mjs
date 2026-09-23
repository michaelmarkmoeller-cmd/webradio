// Genskaber radio SAW "In The Mix"-logoerne (findes kun i 200 px) som 512×512 — 23-09-2026
// Flise + "radio SAW"-pille: radio SAW's egen 1400 px-original, farvelagt med kanalens farve.
// Diskokugle: tegnet som vektor (facetter i kugleprojektion). Tekst: hvid, fed, smal.
// Kør: node make-saw-inthemix.mjs [outDir]   (standard: public/logos)
import sharp from 'sharp'
import fs from 'node:fs'
import path from 'node:path'

const OUT = process.argv[2] ?? 'public/logos'
const S = 512
const BASE = 'https://backend.radiosaw.de/sites/default/files/2023-11/80er.png' // blå flise (hue ≈ 204°)

const CHANNELS = [
  // color: kanalens flisefarve (målt på radio SAW's 200 px-logo) · ball: facetfarver [lys, mørk] · lines: tekstlinjer
  { file: 'radio-saw-in-the-mix.png', color: '#fbb401', ball: ['#fff36b', '#a04e00'], lines: ['In The Mix'] },
  { file: 'radio-saw-in-the-mix-80er.png', color: '#01a7de', ball: ['#ffffff', '#1f2226'], lines: ['In The Mix', '80er'] },
  { file: 'radio-saw-in-the-mix-90er.png', color: '#eb7423', ball: ['#f8d8fa', '#3a1045'], lines: ['In The Mix', '90er'] },
]

// Deterministisk "tilfældighed", så logoerne er ens hver gang de genereres
let seed = 7
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)

function mix(a, b, t) {
  const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
  const [x, y] = [p(a), p(b)]
  return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join('')
}

// Diskokugle: ortografisk projektion, let set nedefra. Facetter = bredde-/længdegrads-felter.
function discoBall([light, dark]) {
  const cx = S * 0.53, cy = S * 0.97, R = S * 0.5, tilt = -0.2 // set lidt nedefra → ingen synlig pol
  const polys = []
  const LAT = 20, LON = 40
  const project = (lat, lon) => {
    // Kuglekoordinater → 3D → rotér om x-aksen (tilt) → 2D
    const x = Math.cos(lat) * Math.sin(lon), y = Math.sin(lat), z = Math.cos(lat) * Math.cos(lon)
    const y2 = y * Math.cos(tilt) - z * Math.sin(tilt), z2 = y * Math.sin(tilt) + z * Math.cos(tilt)
    return { x: cx + R * x, y: cy - R * y2, z: z2 }
  }
  for (let i = 0; i < LAT; i++) {
    const a0 = -Math.PI / 2 + (i / LAT) * Math.PI, a1 = -Math.PI / 2 + ((i + 1) / LAT) * Math.PI
    for (let j = 0; j < LON; j++) {
      const b0 = (j / LON) * 2 * Math.PI, b1 = ((j + 1) / LON) * 2 * Math.PI
      const g = 0.018 // fuge mellem facetterne
      const pts = [project(a0 + g, b0 + g), project(a0 + g, b1 - g), project(a1 - g, b1 - g), project(a1 - g, b0 + g)]
      if (pts.some((p) => p.z < 0)) continue // bagsiden
      const zc = pts.reduce((s, p) => s + p.z, 0) / 4
      const lx = (pts[0].x - cx) / R, ly = (cy - pts[0].y) / R
      // Lys fra øverst til venstre + tilfældige spejlinger
      let t = 0.62 - 0.35 * zc + 0.3 * lx - 0.15 * ly + (rnd() - 0.5) * 0.9
      if (rnd() < 0.1) t = 0 // lyse glimt
      if (rnd() < 0.1) t = 1 // mørke facetter
      t = Math.min(1, Math.max(0, t))
      polys.push(`<polygon points="${pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')}" fill="${mix(light, dark, t)}"/>`)
    }
  }
  // Mørk kugle bag facetterne = fuger; blødt lys-skær øverst til venstre ovenpå
  return `<defs><radialGradient id="shine" cx="0.3" cy="0.25" r="0.6"><stop offset="0" stop-color="#fff" stop-opacity="0.35"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>
    <circle cx="${cx}" cy="${cy}" r="${R + 1}" fill="${mix(light, dark, 0.92)}"/>${polys.join('')}
    <circle cx="${cx}" cy="${cy}" r="${R}" fill="url(#shine)"/>`
}

// Fed, let sammentrykket hvid tekst med blød mørk skygge (som originalen)
function textSvg(lines) {
  const font = `font-family="Segoe UI Black, Arial Black, sans-serif" font-weight="900" font-size="${S * 0.16}" text-anchor="middle"`
  const ys = lines.length === 1 ? [S * 0.8] : [S * 0.7, S * 0.9]
  const squeeze = (dx, dy) => `transform="translate(${S / 2 + dx} ${dy}) scale(0.84 1)"`
  return `<defs><filter id="blur"><feGaussianBlur stdDeviation="3"/></filter></defs>` + lines.map((l, i) => `
    <text x="0" y="${ys[i]}" ${font} fill="#000" opacity="0.55" filter="url(#blur)" ${squeeze(3, 5)}>${l}</text>
    <text x="0" y="${ys[i]}" ${font} fill="#ffffff" ${squeeze(0, 0)}>${l}</text>`).join('')
}

// Farvelæg den blå flise med kanalens farve ud fra lysstyrke: baggrundstonen → kanalfarven,
// lysere (pillen, glans) → mod hvid i samme forhold, mørkere (skygge) → proportionalt mørkere
async function recolor(tileBuf, hex) {
  const target = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
  const { data, info } = await sharp(tileBuf).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const lum = (i) => 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
  const ref = lum((Math.round(info.height * 0.5) * info.width + Math.round(info.width * 0.04)) * 3) // ren baggrundstone
  const out = Buffer.alloc(data.length)
  for (let i = 0; i < data.length; i += 3) {
    const L = lum(i)
    for (let k = 0; k < 3; k++) {
      out[i + k] = L >= ref
        ? Math.round(target[k] + (255 - target[k]) * ((L - ref) / (255 - ref)))
        : Math.round(target[k] * (L / ref))
    }
  }
  return sharp(out, { raw: { width: info.width, height: info.height, channels: 3 } }).png().toBuffer()
}

const base = Buffer.from(await (await fetch(BASE)).arrayBuffer())
const bm = await sharp(base).metadata()
const c = Math.round(bm.width * 0.05) // afrundede, transparente hjørner skæres væk (som de øvrige SAW-logoer)
const tile = await sharp(base).extract({ left: c, top: c, width: bm.width - 2 * c, height: bm.height - 2 * c })
  .resize(S, S, { kernel: 'lanczos3' }).png().toBuffer()

fs.mkdirSync(OUT, { recursive: true })
for (const ch of CHANNELS) {
  seed = 7
  const coloured = await recolor(tile, ch.color)
  const overlay = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}">${discoBall(ch.ball)}${textSvg(ch.lines)}</svg>`)
  await sharp(coloured).composite([{ input: overlay }]).flatten({ background: '#ffffff' }).png().toFile(path.join(OUT, ch.file))
  console.log('✓', ch.file)
}
