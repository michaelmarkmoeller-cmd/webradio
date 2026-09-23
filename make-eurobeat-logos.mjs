// laut.fm Eurobeat — tre logo-koncepter tegnet som vektor (512×512) — 23-09-2026
// Kør: node make-eurobeat-logos.mjs public/logos b   → laut-fm-eurobeat-logo.svg/.png (koncept B valgt af Michael 23-09-2026)
//      node make-eurobeat-logos.mjs <dir>            → alle tre koncepter til sammenligning
import sharp from 'sharp'
import fs from 'node:fs'
import path from 'node:path'

const OUT = process.argv[2] ?? 'public/logos'
const ONLY = process.argv[3]
const S = 512
const HEAVY = `font-family="Segoe UI Black, Segoe UI, Arial Black, sans-serif" font-weight="900"`
const SANS = `font-family="Segoe UI, Arial, sans-serif"`

// Tekstbredde ved 100 px (trimmet) → skriftstørrelse der fylder en ønsket bredde
async function fit(text, width, attrs = HEAVY, extra = '') {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="3000" height="300"><text x="20" y="200" ${attrs} ${extra} font-size="100">${text}</text></svg>`
  const w = (await sharp(Buffer.from(svg)).flatten({ background: '#fff' }).trim().toBuffer({ resolveWithObject: true })).info.width
  return (100 * width) / w
}

// Tekst med kontur under fyld (paint-order understøttes ikke overalt)
const outlined = (x, y, size, text, { fill, stroke, sw, extra = '' }) =>
  `<text x="${x}" y="${y}" ${HEAVY} font-size="${size.toFixed(1)}" text-anchor="middle" ${extra} fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round">${text}</text>
   <text x="${x}" y="${y}" ${HEAVY} font-size="${size.toFixed(1)}" text-anchor="middle" ${extra} fill="${fill}">${text}</text>`

const star5 = (cx, cy, R, fill) => {
  let d = ''
  for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + (k * Math.PI) / 5, r = k % 2 ? R * 0.4 : R; d += `${k ? 'L' : 'M'}${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}` }
  return `<path d="${d}Z" fill="${fill}"/>`
}
const sparkle = (cx, cy, r, fill = '#fff') =>
  `<path d="M${cx},${cy - r} Q${cx + r * 0.15},${cy - r * 0.15} ${cx + r},${cy} Q${cx + r * 0.15},${cy + r * 0.15} ${cx},${cy + r} Q${cx - r * 0.15},${cy + r * 0.15} ${cx - r},${cy} Q${cx - r * 0.15},${cy - r * 0.15} ${cx},${cy - r} Z" fill="${fill}"/>`

const VARIANTS = {
  // A: Night Racer — Initial D-stemning: natlig motorvej mod en neon-horisont, fartstriber og kursiv krom-tekst
  a: async () => {
    const size = await fit('EUROBEAT', 440, HEAVY, 'font-style="italic"')
    let road = '', streaks = ''
    for (let k = 0; k < 7; k++) { // midterstriber der løber mod forsvindingspunktet
      const t0 = k / 7, t1 = t0 + 0.07
      const y = (t) => 262 + (S - 262) * t * t, w = (t) => 3 + 16 * t * t
      road += `<path d="M${256 - w(t0) / 2},${y(t0)} L${256 + w(t0) / 2},${y(t0)} L${256 + w(t1) / 2},${y(t1)} L${256 - w(t1) / 2},${y(t1)} Z" fill="#ffd21f"/>`
    }
    const lines = [[40, 196, 170, '#00e5ff'], [300, 214, 190, '#ff2bd6'], [20, 330, 140, '#ff2bd6'], [330, 348, 170, '#00e5ff'], [90, 368, 90, '#ffffff']]
    for (const [x, y, l, c] of lines) streaks += `<rect x="${x}" y="${y}" width="${l}" height="4" rx="2" fill="${c}" opacity="0.85"/>`
    return `<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#05040f"/><stop offset="0.5" stop-color="#1a0833"/><stop offset="0.52" stop-color="#ff2bd6" stop-opacity="0.9"/><stop offset="0.56" stop-color="#12081f"/><stop offset="1" stop-color="#07060d"/></linearGradient>
      <linearGradient id="chrome" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="0.48" stop-color="#bff6ff"/><stop offset="0.52" stop-color="#3fb6d9"/><stop offset="1" stop-color="#e9fdff"/></linearGradient>
      <filter id="glow" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
      <rect width="${S}" height="${S}" fill="url(#sky)"/>
      <path d="M232,262 L280,262 L512,512 L0,512 Z" fill="#15131c"/><path d="M232,262 L0,512 M280,262 L512,512" stroke="#ff2bd6" stroke-width="3" opacity="0.8"/>
      ${road}${streaks}
      <text x="256" y="120" ${SANS} font-weight="700" font-size="34" letter-spacing="6" fill="#00e5ff" text-anchor="middle" filter="url(#glow)">laut.fm</text>
      <g filter="url(#glow)">${outlined(256, 305, size, 'EUROBEAT', { fill: 'url(#chrome)', stroke: '#ff2bd6', sw: 10, extra: 'font-style="italic"' })}</g>`
  },
  // B: Super Eurobeat — CD-cover-energi: solstråler i gul/orange/rød, stablet EURO/BEAT med tyk kontur og glimt
  b: async () => {
    const big = await fit('BEAT', 420, HEAVY, 'font-style="italic"')
    const euro = await fit('EURO', 330, HEAVY, 'font-style="italic"')
    let rays = ''
    for (let k = 0; k < 24; k++) {
      const a0 = (k / 24) * 2 * Math.PI, a1 = a0 + Math.PI / 24, R = 520
      rays += `<path d="M256,270 L${256 + R * Math.cos(a0)},${270 + R * Math.sin(a0)} L${256 + R * Math.cos(a1)},${270 + R * Math.sin(a1)} Z" fill="#fff" opacity="0.13"/>`
    }
    return `<defs><radialGradient id="bg" cx="0.5" cy="0.53" r="0.7"><stop offset="0" stop-color="#fff35c"/><stop offset="0.45" stop-color="#ffb000"/><stop offset="1" stop-color="#e3151f"/></radialGradient>
      <linearGradient id="fillB" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#ffe14d"/></linearGradient></defs>
      <rect width="${S}" height="${S}" fill="url(#bg)"/>${rays}
      <rect x="176" y="48" width="160" height="48" rx="24" fill="#111"/><text x="256" y="82" ${SANS} font-weight="700" font-size="28" fill="#fff" text-anchor="middle">laut.fm</text>
      <g transform="translate(9 9)" opacity="0.9">${outlined(256, 250, euro, 'EURO', { fill: '#8a0010', stroke: '#8a0010', sw: 16, extra: 'font-style="italic"' })}${outlined(256, 420, big, 'BEAT', { fill: '#8a0010', stroke: '#8a0010', sw: 18, extra: 'font-style="italic"' })}</g>
      ${outlined(256, 250, euro, 'EURO', { fill: 'url(#fillB)', stroke: '#111', sw: 16, extra: 'font-style="italic"' })}
      ${outlined(256, 420, big, 'BEAT', { fill: 'url(#fillB)', stroke: '#111', sw: 18, extra: 'font-style="italic"' })}
      ${sparkle(72, 150, 26)}${sparkle(452, 180, 20)}${sparkle(440, 452, 28)}${sparkle(62, 440, 16)}${star5(100, 300, 12, '#fff')}${star5(420, 300, 10, '#fff')}`
  },
  // C: EURO-beat — EU-flagets 12 guldstjerner i ring om en equalizer: "EURO" + "BEAT" på dyb europablå
  c: async () => {
    const beat = await fit('BEAT', 270)
    let stars = '', bars = ''
    for (let k = 0; k < 12; k++) { const a = (k / 12) * 2 * Math.PI - Math.PI / 2; stars += star5(256 + 205 * Math.cos(a), 256 + 205 * Math.sin(a), 20, '#ffcc00') }
    const hs = [24, 42, 62, 80, 62, 42, 24, 42, 62]
    hs.forEach((h, i) => { const x = 256 + (i - (hs.length - 1) / 2) * 30 - 10; bars += `<rect x="${x}" y="${378 - h}" width="20" height="${h}" rx="4" fill="${i % 2 ? '#ffcc00' : '#ffffff'}"/>` })
    return `<defs><radialGradient id="bg" cx="0.5" cy="0.45" r="0.7"><stop offset="0" stop-color="#1f4fd6"/><stop offset="1" stop-color="#001a66"/></radialGradient></defs>
      <rect width="${S}" height="${S}" fill="url(#bg)"/>${stars}
      <text x="256" y="168" ${HEAVY} font-size="48" letter-spacing="16" fill="#ffcc00" text-anchor="middle">EURO</text>
      <text x="256" y="${186 + beat * 0.74}" ${HEAVY} font-size="${beat.toFixed(1)}" fill="#ffffff" text-anchor="middle">BEAT</text>
      ${bars}
      <text x="256" y="424" ${SANS} font-weight="600" font-size="26" letter-spacing="3" fill="#ffffff" opacity="0.85" text-anchor="middle">laut.fm</text>`
  },
}

fs.mkdirSync(OUT, { recursive: true })
for (const [key, draw] of Object.entries(VARIANTS)) {
  if (ONLY && key !== ONLY) continue
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">${await draw()}</svg>`
  const base = ONLY ? 'laut-fm-eurobeat-logo' : `laut-fm-eurobeat-${key}`
  fs.writeFileSync(path.join(OUT, base + '.svg'), svg)
  await sharp(Buffer.from(svg)).png().toFile(path.join(OUT, base + '.png'))
  console.log('✓', base + '.png')
}
