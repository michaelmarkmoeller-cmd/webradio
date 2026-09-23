// 538-kanallogoer med kanalnavn i 538.nl's egen stil (lilla flise, hvid "pille" med 538-logo, navn nedenunder) — 23-09-2026
// Genbruger pillen fra Radio 538-logoet (TuneIn, 600 px) og sætter kanalnavnet stort nok til at kunne læses
// på stationskortet (44 px) — samme princip som make-radio10-logos.mjs.
// Kør: node make-538-logos.mjs [outDir]   (standard: public/logos)
import sharp from 'sharp'
import fs from 'node:fs'
import path from 'node:path'

const OUT = process.argv[2] ?? 'public/logos'
const S = 600
const SRC = 'public/logos/radio-538.png' // lilla baggrund + hvid pille med "538"-logo

const CHANNELS = [
  { file: 'radio-538-navn.png', label: 'DANCE' },
  { file: '538-hitzone-navn.png', label: 'HITZONE' },
  { file: '538-party-navn.png', label: 'PARTY' },
]

const FONT = 'font-family="Segoe UI, Arial, sans-serif" font-weight="900" text-anchor="middle"'
const MAX_W = S * 0.86, MAX_SIZE = S * 0.2, CAP = 0.72
const PILL_W = S * 0.84 // pillens bredde i det nye logo

// Find pillen: alt der ikke er baggrundslilla
async function pill() {
  const img = sharp(SRC).removeAlpha()
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true })
  const W = info.width, H = info.height, bg = [data[0], data[1], data[2]]
  let x0 = W, x1 = 0, y0 = H, y1 = 0
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const p = (y * W + x) * 3
    if (Math.hypot(data[p] - bg[0], data[p + 1] - bg[1], data[p + 2] - bg[2]) > 60) {
      x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y)
    }
  }
  const m = 4 // lidt baggrund med, så pillens antialiaserede kant bevares
  const crop = await sharp(SRC).removeAlpha().extract({ left: x0 - m, top: y0 - m, width: x1 - x0 + 2 * m, height: y1 - y0 + 2 * m })
    .resize({ width: Math.round(PILL_W * (x1 - x0 + 2 * m) / (x1 - x0)), kernel: 'lanczos3' }).png().toBuffer()
  const cm = await sharp(crop).metadata()
  return { buf: crop, w: cm.width, h: cm.height, bg: '#' + bg.map((v) => v.toString(16).padStart(2, '0')).join('') }
}

async function widthAt100(label) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="2000" height="300"><text x="1000" y="200" ${FONT} font-size="100" fill="#000">${label}</text></svg>`
  return (await sharp(Buffer.from(svg)).flatten({ background: '#fff' }).trim().toBuffer({ resolveWithObject: true })).info.width
}

const p = await pill()
fs.mkdirSync(OUT, { recursive: true })
for (const ch of CHANNELS) {
  const size = Math.min(MAX_SIZE, (100 * MAX_W) / (await widthAt100(ch.label)))
  const top = Math.round(S * 0.14)
  // Navnet centreres lodret i fladen under pillen
  const free0 = top + p.h, yMain = free0 + (S - free0) / 2 + (size * CAP) / 2 - S * 0.02
  const text = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}">
    <text x="${S / 2}" y="${yMain}" ${FONT} font-size="${size}" fill="#ffffff">${ch.label}</text></svg>`)
  await sharp({ create: { width: S, height: S, channels: 3, background: p.bg } })
    .composite([{ input: p.buf, left: Math.round((S - p.w) / 2), top }, { input: text }]).png().toFile(path.join(OUT, ch.file))
  console.log('✓', ch.file, Math.round(size) + ' px')
}
