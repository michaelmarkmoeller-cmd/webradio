// 80s80s Summerhits-logo i samme stil som de øvrige 80s80s-kanaler — 23-09-2026
// Baggrund: det eksisterende Summerhits-billede (gult solbrillefoto). Skilt: 80s80s' eget skilt
// klippet ud af 80s80s Radio-logoet (ensfarvet baggrund → alfa), "RADIO" fjernet, farvelagt pr. variant.
// Kør: node make-80s80s-summerhits.mjs public/logos a   → 80s80s-summerhits-skilt.png (variant A valgt af Michael 23-09-2026)
//      node make-80s80s-summerhits.mjs <dir>            → alle varianter til sammenligning
import sharp from 'sharp'
import fs from 'node:fs'
import path from 'node:path'

const OUT = process.argv[2] ?? 'public/logos'
const ONLY = process.argv[3]
const S = 512
const BG = 'public/logos/80s80s-summerhits.jpg'
const BADGE_SRC = 'public/logos/80s80s-radio.png' // sort skilt, hvid tekst, ensfarvet turkis baggrund

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
const VARIANTS = {
  a: { badge: '#1d1d1b', text: '#ffffff', label: '#ffffff', note: 'klassisk sort skilt (som Radio/In The Mix/Maxis)' },
  b: { badge: '#ffffff', text: '#f39200', label: '#f39200', note: 'hvidt skilt med solorange tekst (som Italo-kanalerne)' },
  c: { badge: '#1d1d1b', text: '#ffd400', label: '#ffd400', note: 'sort skilt med solgul tekst' },
}

// Skiltet som maske: alfa = afstand fra baggrundsfarven, lys = hvid tekst (0 = skilt, 1 = tekst)
async function badgeMask() {
  const { data, info } = await sharp(BADGE_SRC).resize(S, S).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const bg = [0, 1, 2].map((k) => data[k + 3 * (5 * S + 5)]) // hjørnepixel = baggrund
  const W = info.width, H = info.height
  const alpha = new Float32Array(W * H), light = new Float32Array(W * H)
  for (let p = 0; p < W * H; p++) {
    const r = data[p * 3], g = data[p * 3 + 1], b = data[p * 3 + 2]
    const L = (0.299 * r + 0.587 * g + 0.114 * b) / 255
    // Baggrunden er mellemlys turkis: sort (skilt) og hvid (tekst) ligger begge langt fra den
    const dist = Math.hypot(r - bg[0], g - bg[1], b - bg[2]) / 160
    alpha[p] = Math.min(1, dist)
    // Antialiaserede kanter mod baggrunden: fjern baggrundens bidrag fra lysheden
    const Lbg = (0.299 * bg[0] + 0.587 * bg[1] + 0.114 * bg[2]) / 255
    // Skiltet er ikke helt sort (≈ #1a1919) → normalisér, så skilt = 0 og tekst = 1
    const Lc = alpha[p] > 0.02 ? (L - (1 - alpha[p]) * Lbg) / alpha[p] : 0
    light[p] = Math.min(1, Math.max(0, (Lc - 0.1) / 0.88))
  }
  // Grå kantpixels mellem sort skilt og hvid tekst ligger tæt på baggrundsfarven og ville blive halvgennemsigtige →
  // pixels uden baggrund i nærheden (5×5) er inde i skiltet og skal være helt dækkende
  const a0 = alpha.slice()
  for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 2; x++) {
    let min = 1
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) min = Math.min(min, a0[(y + dy) * W + x + dx])
    if (min > 0.5) {
      const p = y * W + x, r = data[p * 3], g = data[p * 3 + 1], b = data[p * 3 + 2]
      alpha[p] = 1; light[p] = Math.min(1, Math.max(0, ((0.299 * r + 0.587 * g + 0.114 * b) / 255 - 0.1) / 0.88))
    }
  }
  // Fjern "RADIO": lyse pixels i skiltets nederste venstre felt bliver til skilt
  let minX = W, maxX = 0, minY = H, maxY = 0
  for (let y = Math.round(H * 0.62); y < Math.round(H * 0.8); y++) for (let x = Math.round(W * 0.2); x < Math.round(W * 0.62); x++) {
    const p = y * W + x
    if (alpha[p] > 0.9 && light[p] > 0.3) { light[p] = 0; minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y) }
  }
  // Tekstens antialiasering ved kanterne: nulstil et lille felt rundt om bogstaverne
  for (let y = minY - 3; y <= maxY + 3; y++) for (let x = minX - 3; x <= maxX + 3; x++) if (alpha[y * W + x] > 0.9) light[y * W + x] = 0
  // Skiltets højre kant på navnets højde (skiltet har skrå hjørner) → navnet skal slutte før den
  let right = minX
  for (let x = minX; x < W; x++) if (alpha[(maxY - Math.round((maxY - minY) / 2)) * W + x] > 0.5) right = x
  return { W, H, alpha, light, label: { x: minX, baseline: maxY, capH: maxY - minY, maxW: right - minX - (minX - leftEdge(alpha, W, maxY)) } }
}

function leftEdge(alpha, W, y) { for (let x = 0; x < W; x++) if (alpha[y * W + x] > 0.5) return x; return 0 }

function paint(mask, v) {
  const [br, bgc, bb] = hex(v.badge), [tr, tg, tb] = hex(v.text)
  const out = Buffer.alloc(mask.W * mask.H * 4)
  for (let p = 0; p < mask.W * mask.H; p++) {
    const t = mask.light[p]
    out[p * 4] = Math.round(br + (tr - br) * t)
    out[p * 4 + 1] = Math.round(bgc + (tg - bgc) * t)
    out[p * 4 + 2] = Math.round(bb + (tb - bb) * t)
    out[p * 4 + 3] = Math.round(255 * mask.alpha[p])
  }
  return sharp(out, { raw: { width: mask.W, height: mask.H, channels: 4 } }).png().toBuffer()
}

// Kanalnavn i samme lette, smalle stil som 80s80s' egne ("RADIO", "IN THE MIX", "ITALO DISCO")
async function labelSvg(mask, v) {
  const { x, baseline, capH, maxW } = mask.label
  // Samme versalhøjde som "RADIO" — men mindre, hvis navnet ellers går ud over skiltets kant
  const probe = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="200"><text x="10" y="150" font-family="Segoe UI, Arial, sans-serif" font-weight="400" font-size="100">SUMMERHITS</text></svg>`
  const w100 = (await sharp(Buffer.from(probe)).flatten({ background: '#fff' }).trim().toBuffer({ resolveWithObject: true })).info.width
  const size = Math.min(capH / 0.7, (100 * maxW) / w100)
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}">
    <text x="${x}" y="${baseline}" font-family="Segoe UI, Arial, sans-serif" font-weight="400" font-size="${size.toFixed(1)}" fill="${v.label}">SUMMERHITS</text></svg>`)
}

const mask = await badgeMask()
const bg = await sharp(BG).resize(S, S).png().toBuffer()
fs.mkdirSync(OUT, { recursive: true })
for (const [key, v] of Object.entries(VARIANTS)) {
  if (ONLY && key !== ONLY) continue
  const file = ONLY ? '80s80s-summerhits-skilt.png' : `80s80s-summerhits-${key}.png`
  await sharp(bg).composite([{ input: await paint(mask, v) }, { input: await labelSvg(mask, v) }]).png().toFile(path.join(OUT, file))
  console.log('✓', file, '—', v.note)
}
