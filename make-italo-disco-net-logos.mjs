// Radio Italo Disco Net — tre logo-koncepter med stationens eget trikolore-hjerte (512×512) — 23-09-2026
// Hjertet skæres fri af den hvide baggrund (flood-fill fra kanten), resten tegnes som vektor.
// Kør: node make-italo-disco-net-logos.mjs public/logos b   → radio-italo-disco-net-logo.png (koncept B valgt af Michael 23-09-2026)
//      node make-italo-disco-net-logos.mjs <dir>            → alle tre koncepter til sammenligning
import sharp from 'sharp'
import fs from 'node:fs'
import path from 'node:path'

const OUT = process.argv[2] ?? 'public/logos'
const ONLY = process.argv[3]
const S = 512
const SRC = 'public/logos/radio-italo-disco-net.png'
const HEAVY = `font-family="Segoe UI Black, Segoe UI, Arial Black, sans-serif" font-weight="900"`
const SANS = `font-family="Segoe UI, Arial, sans-serif"`
const SCRIPT = `font-family="Segoe Script, Brush Script MT, cursive"`

// Hjertet med alfa: baggrund = næsten-hvide pixels forbundet med billedkanten
async function heart() {
  const { data, info } = await sharp(SRC).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const W = info.width, H = info.height
  const bgLike = (p) => data[p * 3] > 238 && data[p * 3 + 1] > 238 && data[p * 3 + 2] > 238
  const bg = new Uint8Array(W * H), stack = []
  for (let x = 0; x < W; x++) stack.push(x, (H - 1) * W + x)
  for (let y = 0; y < H; y++) stack.push(y * W, y * W + W - 1)
  while (stack.length) {
    const p = stack.pop()
    if (bg[p] || !bgLike(p)) continue
    bg[p] = 1
    const x = p % W, y = (p / W) | 0
    if (x > 0) stack.push(p - 1); if (x < W - 1) stack.push(p + 1); if (y > 0) stack.push(p - W); if (y < H - 1) stack.push(p + W)
  }
  // Blød kant: sløret maske
  const mask = Buffer.alloc(W * H)
  for (let p = 0; p < W * H; p++) mask[p] = bg[p] ? 0 : 255
  // Blød kant, trukket 1-2 px ind, så den lyse rand fra den hvide baggrund ikke kommer med
  const blurred = await sharp(mask, { raw: { width: W, height: H, channels: 1 } }).blur(1.6).extractChannel(0).raw().toBuffer()
  const soft = Buffer.alloc(W * H)
  for (let p = 0; p < W * H; p++) soft[p] = Math.max(0, Math.min(255, Math.round(((blurred[p] - 150) * 255) / 105)))
  const rgba = Buffer.alloc(W * H * 4)
  let x0 = W, x1 = 0, y0 = H, y1 = 0
  for (let p = 0; p < W * H; p++) {
    rgba[p * 4] = data[p * 3]; rgba[p * 4 + 1] = data[p * 3 + 1]; rgba[p * 4 + 2] = data[p * 3 + 2]; rgba[p * 4 + 3] = soft[p]
    if (!bg[p]) { const x = p % W, y = (p / W) | 0; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y) }
  }
  return sharp(rgba, { raw: { width: W, height: H, channels: 4 } })
    .extract({ left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 }).png().toBuffer()
}

async function fit(text, width, attrs = HEAVY) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="3000" height="300"><text x="20" y="200" ${attrs} font-size="100">${text}</text></svg>`
  const w = (await sharp(Buffer.from(svg)).flatten({ background: '#fff' }).trim().toBuffer({ resolveWithObject: true })).info.width
  return (100 * width) / w
}

let seed = 5
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)

// Hvert koncept: { bg: svg under hjertet, heart: {w, x, y}, fg: svg over hjertet }
const VARIANTS = {
  // A: Disco-nat — mørk lilla dansegulv med lysprikker fra en diskokugle, glødende hjerte, neon "ITALO DISCO"
  a: async () => {
    seed = 5
    const t = await fit('ITALO DISCO', 440)
    let dots = ''
    for (let i = 0; i < 90; i++) {
      const c = ['#ff4fd8', '#4fe3ff', '#ffffff', '#ffd54f'][i % 4]
      dots += `<circle cx="${(rnd() * S).toFixed(0)}" cy="${(rnd() * S).toFixed(0)}" r="${(1.5 + rnd() * 4).toFixed(1)}" fill="${c}" opacity="${(0.25 + rnd() * 0.6).toFixed(2)}"/>`
    }
    return {
      bg: `<defs><radialGradient id="bg" cx="0.5" cy="0.38" r="0.75"><stop offset="0" stop-color="#4a1470"/><stop offset="1" stop-color="#0b0414"/></radialGradient>
        <radialGradient id="halo" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#ff4fd8" stop-opacity="0.55"/><stop offset="1" stop-color="#ff4fd8" stop-opacity="0"/></radialGradient></defs>
        <rect width="${S}" height="${S}" fill="url(#bg)"/>${dots}<circle cx="256" cy="200" r="190" fill="url(#halo)"/>`,
      heart: { w: 300, cx: 256, cy: 200 },
      fg: `<defs><filter id="neon" x="-20%" y="-60%" width="140%" height="220%"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
        <text x="256" y="428" ${HEAVY} font-size="${t.toFixed(1)}" fill="#fff" stroke="#ff4fd8" stroke-width="2" text-anchor="middle" filter="url(#neon)">ITALO DISCO</text>
        <text x="256" y="478" ${SANS} font-weight="700" font-size="28" letter-spacing="10" fill="#4fe3ff" text-anchor="middle">RADIO · NET</text>`,
    }
  },
  // B: Amore — hjertet stort i midten med "Italo" i håndskrift hen over og "DISCO" i krom-versaler, solstråler i trikolore
  b: async () => {
    const d = await fit('DISCO', 360)
    let rays = ''
    for (let k = 0; k < 36; k++) {
      const a0 = (k / 36) * 2 * Math.PI, a1 = a0 + Math.PI / 36, R = 520
      rays += `<path d="M256,230 L${256 + R * Math.cos(a0)},${230 + R * Math.sin(a0)} L${256 + R * Math.cos(a1)},${230 + R * Math.sin(a1)} Z" fill="${['#009246', '#ffffff', '#ce2b37'][k % 3]}" opacity="0.16"/>`
    }
    return {
      bg: `<defs><radialGradient id="bg" cx="0.5" cy="0.45" r="0.75"><stop offset="0" stop-color="#1b2a55"/><stop offset="1" stop-color="#070b1c"/></radialGradient></defs>
        <rect width="${S}" height="${S}" fill="url(#bg)"/>${rays}`,
      heart: { w: 320, cx: 256, cy: 222 },
      fg: `<defs><linearGradient id="chrome" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="0.5" stop-color="#d9e2f2"/><stop offset="0.52" stop-color="#6d7fa6"/><stop offset="1" stop-color="#f4f7ff"/></linearGradient>
        <filter id="sh"><feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="#000" flood-opacity="0.6"/></filter></defs>
        <text x="256" y="54" ${SANS} font-weight="700" font-size="28" letter-spacing="12" fill="#fff" text-anchor="middle" opacity="0.9">RADIO</text>
        <g filter="url(#sh)"><text x="262" y="262" ${SCRIPT} font-size="118" fill="#fff" stroke="#0b1433" stroke-width="10" stroke-linejoin="round" text-anchor="middle">Italo</text>
        <text x="262" y="262" ${SCRIPT} font-size="118" fill="#fff" text-anchor="middle">Italo</text>
        <text x="256" y="460" ${HEAVY} font-size="${d.toFixed(1)}" fill="none" stroke="#0b1433" stroke-width="10" stroke-linejoin="round" text-anchor="middle">DISCO</text>
        <text x="256" y="460" ${HEAVY} font-size="${d.toFixed(1)}" fill="url(#chrome)" text-anchor="middle">DISCO</text></g>`,
    }
  },
  // C: Classico — lys, ren flise: hjertet øverst, kraftig sort "ITALO DISCO" og en trikolore-streg med "RADIO · .NET"
  c: async () => {
    const t = await fit('ITALO DISCO', 440)
    return {
      bg: `<rect width="${S}" height="${S}" fill="#fbf8f2"/>`,
      heart: { w: 280, cx: 256, cy: 180 },
      fg: `<text x="256" y="${372 + t * 0.2}" ${HEAVY} font-size="${t.toFixed(1)}" fill="#141414" text-anchor="middle">ITALO DISCO</text>
        <rect x="96" y="${404 + t * 0.2}" width="107" height="10" fill="#009246"/><rect x="203" y="${404 + t * 0.2}" width="106" height="10" fill="#e9e9e9"/><rect x="309" y="${404 + t * 0.2}" width="107" height="10" fill="#ce2b37"/>
        <text x="256" y="${452 + t * 0.2}" ${SANS} font-weight="700" font-size="28" letter-spacing="10" fill="#555" text-anchor="middle">RADIO · NET</text>`,
    }
  },
}

const heartPng = await heart()
const hm = await sharp(heartPng).metadata()
fs.mkdirSync(OUT, { recursive: true })
for (const [key, draw] of Object.entries(VARIANTS)) {
  if (ONLY && key !== ONLY) continue
  const v = await draw()
  const h = Math.round((v.heart.w * hm.height) / hm.width)
  const hb = await sharp(heartPng).resize(v.heart.w, h, { kernel: 'lanczos3' }).png().toBuffer()
  // Blød slagskygge ud fra hjertets egen alfa
  const { data: hd } = await sharp(hb).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const sh = Buffer.alloc(v.heart.w * h * 4)
  for (let p = 0; p < v.heart.w * h; p++) sh[p * 4 + 3] = Math.round(hd[p * 4 + 3] * 0.45)
  const M = 30 // luft omkring skyggen, så sløringen ikke skæres af ved bufferens kant
  const shPng = await sharp(await sharp(sh, { raw: { width: v.heart.w, height: h, channels: 4 } })
    .extend({ top: M, bottom: M, left: M, right: M, background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer()).blur(8).png().toBuffer()
  const left = Math.round(v.heart.cx - v.heart.w / 2), top = Math.round(v.heart.cy - h / 2)
  const file = ONLY ? 'radio-italo-disco-net-logo.png' : `radio-italo-disco-net-${key}.png`
  await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}">${v.bg}</svg>`))
    .composite([{ input: shPng, left: left + 4 - M, top: top + 10 - M }, { input: hb, left, top },
      { input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}">${v.fg}</svg>`) }])
    .flatten({ background: '#000' }).png().toFile(path.join(OUT, file))
  console.log('✓', file)
}
