// Christmas Vinyl HD — tre julelogo-koncepter tegnet som vektor (512×512) — 23-09-2026
// Kør: node make-christmas-vinyl.mjs public/logos a   → christmas-vinyl-hd-logo.svg/.png (variant A valgt af Michael 23-09-2026)
//      node make-christmas-vinyl.mjs <dir>            → alle tre koncepter til sammenligning
import sharp from 'sharp'
import fs from 'node:fs'
import path from 'node:path'

const OUT = process.argv[2] ?? 'public/logos'
const ONLY = process.argv[3]
const S = 512

// Deterministisk "tilfældighed" (sne), så logoerne er ens hver gang
let seed = 11
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)

const SCRIPT = `font-family="Segoe Script, Brush Script MT, cursive"`
const SANS = `font-family="Segoe UI, Arial, sans-serif"`

function snow(n, { y0 = 0, y1 = S, rMin = 1.2, rMax = 3.6, op = 0.8 } = {}) {
  let out = ''
  for (let i = 0; i < n; i++) out += `<circle cx="${(rnd() * S).toFixed(1)}" cy="${(y0 + rnd() * (y1 - y0)).toFixed(1)}" r="${(rMin + rnd() * (rMax - rMin)).toFixed(1)}" fill="#fff" opacity="${(op * (0.35 + rnd() * 0.65)).toFixed(2)}"/>`
  return out
}

// Seksarmet snefnug
function flake(cx, cy, r, op = 0.5, w = 2) {
  let arms = ''
  for (let k = 0; k < 6; k++) {
    const a = (k * Math.PI) / 3, x = cx + r * Math.cos(a), y = cy + r * Math.sin(a)
    const bx = cx + r * 0.55 * Math.cos(a), by = cy + r * 0.55 * Math.sin(a)
    const side = (d) => `${(bx + r * 0.28 * Math.cos(a + d)).toFixed(1)},${(by + r * 0.28 * Math.sin(a + d)).toFixed(1)}`
    arms += `<path d="M${cx},${cy} L${x.toFixed(1)},${y.toFixed(1)} M${bx.toFixed(1)},${by.toFixed(1)} L${side(0.7)} M${bx.toFixed(1)},${by.toFixed(1)} L${side(-0.7)}"/>`
  }
  return `<g stroke="#fff" stroke-width="${w}" stroke-linecap="round" opacity="${op}" fill="none">${arms}</g>`
}

// Vinylplade set forfra: rillede, glansstriber, etiket og hul
function vinyl(cx, cy, r, { label = '#c8102e', labelR = 0.34, id = 'v', hole = true } = {}) {
  let grooves = ''
  for (let k = 0.42; k < 0.97; k += 0.035) grooves += `<circle cx="${cx}" cy="${cy}" r="${(r * k).toFixed(1)}" fill="none" stroke="#2c2c2c" stroke-width="${(r * 0.006).toFixed(2)}"/>`
  const wedge = (a0, a1) => {
    const p = (a) => `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`
    return `M${cx},${cy} L${p(a0)} A${r},${r} 0 0 1 ${p(a1)} Z`
  }
  return `<defs><radialGradient id="${id}g" cx="0.5" cy="0.5" r="0.5"><stop offset="0.3" stop-color="#1b1b1b"/><stop offset="1" stop-color="#050505"/></radialGradient>
    <radialGradient id="${id}l" cx="0.4" cy="0.35" r="0.7"><stop offset="0" stop-color="#fff" stop-opacity="0.25"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#${id}g)"/>${grooves}
    <path d="${wedge(-2.5, -2.05)}" fill="#fff" opacity="0.10"/><path d="${wedge(0.65, 1.1)}" fill="#fff" opacity="0.07"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#3a3a3a" stroke-width="${(r * 0.012).toFixed(1)}"/>
    <circle cx="${cx}" cy="${cy}" r="${(r * labelR).toFixed(1)}" fill="${label}"/>
    <circle cx="${cx}" cy="${cy}" r="${(r * labelR).toFixed(1)}" fill="url(#${id}l)"/>
    ${hole ? `<circle cx="${cx}" cy="${cy}" r="${(r * 0.035).toFixed(1)}" fill="#111"/>` : ''}`
}

// Kristtjørnblade + bær
function holly(cx, cy, s, rot = 0) {
  const leaf = (a, col) => `<path transform="rotate(${a} ${cx} ${cy})" d="M${cx},${cy} q${s * 0.25},${-s * 0.35} ${s * 0.12},${-s * 0.55} q${s * 0.15},${-s * 0.1} ${s * 0.05},${-s * 0.3} q${s * 0.12},${-s * 0.12} ${-s * 0.17},${-s * 0.3} q${-s * 0.3},${s * 0.18} ${-s * 0.17},${s * 0.3} q${-s * 0.12},${s * 0.2} ${-s * 0.05},${s * 0.3} q${-s * 0.15},${s * 0.25} ${s * 0.12},${s * 0.55} z" fill="${col}"/>`
  return `<g transform="rotate(${rot} ${cx} ${cy})">${leaf(-38, '#1f7a3a')}${leaf(38, '#2e9a4c')}
    <circle cx="${cx - s * 0.08}" cy="${cy - s * 0.02}" r="${s * 0.1}" fill="#d0102c"/><circle cx="${cx + s * 0.1}" cy="${cy + s * 0.02}" r="${s * 0.1}" fill="#e3203c"/><circle cx="${cx}" cy="${cy + s * 0.14}" r="${s * 0.1}" fill="#b80c26"/>
    <circle cx="${cx - s * 0.11}" cy="${cy - s * 0.05}" r="${s * 0.03}" fill="#fff" opacity="0.6"/></g>`
}

// Tekst langs en bue (librsvg understøtter ikke textPath): hvert bogstav måles og drejes på plads
async function arcText(text, cx, cy, R, size, attrs, spacing = 0) {
  const w = []
  for (const ch of text) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200"><text x="20" y="150" ${SANS} font-weight="900" font-size="${size}">${ch}</text></svg>`
    w.push((await sharp(Buffer.from(svg)).flatten({ background: '#fff' }).trim().toBuffer({ resolveWithObject: true })).info.width + spacing)
  }
  const total = w.reduce((a, b) => a + b, 0) - spacing
  let a = -Math.PI / 2 - total / R / 2, out = ''
  ;[...text].forEach((ch, i) => {
    const mid = a + w[i] / 2 / R
    const x = cx + R * Math.cos(mid), y = cy + R * Math.sin(mid)
    out += `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" transform="rotate(${((mid + Math.PI / 2) * 180 / Math.PI).toFixed(2)} ${x.toFixed(1)} ${y.toFixed(1)})" text-anchor="middle" ${SANS} font-weight="900" font-size="${size}" ${attrs}>${ch}</text>`
    a += w[i] / R
  })
  return out
}

const GOLD = `<linearGradient id="gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe9a3"/><stop offset="0.5" stop-color="#e2b33c"/><stop offset="1" stop-color="#a8761a"/></linearGradient>`

const VARIANTS = {
  // A: Vinylpladen som julekugle, der hænger i et guldbånd — dyb rød, sne og snefnug
  a: () => {
    seed = 11
    const cx = 256, cy = 222, r = 142
    return `<defs>${GOLD}<radialGradient id="bg" cx="0.5" cy="0.4" r="0.75"><stop offset="0" stop-color="#c8182f"/><stop offset="1" stop-color="#4f0512"/></radialGradient>
      <filter id="sh"><feDropShadow dx="0" dy="8" stdDeviation="10" flood-color="#000" flood-opacity="0.45"/></filter></defs>
      <rect width="${S}" height="${S}" fill="url(#bg)"/>${snow(70, { op: 0.55 })}
      ${flake(70, 90, 26, 0.35)}${flake(450, 150, 20, 0.3)}${flake(60, 330, 16, 0.25)}${flake(455, 360, 24, 0.3)}
      <path d="M${cx},0 L${cx},${cy - r - 22}" stroke="#e2b33c" stroke-width="5"/>
      <g filter="url(#sh)">${vinyl(cx, cy, r, { label: '#c8102e', id: 'a', hole: false })}
        <rect x="${cx - 24}" y="${cy - r - 26}" width="48" height="32" rx="6" fill="url(#gold)"/>
        <path d="M${cx - 10},${cy - r - 26} a10,10 0 1 1 20,0" fill="none" stroke="url(#gold)" stroke-width="5"/></g>
      <text x="${cx}" y="${cy + 14}" ${SANS} font-weight="900" font-size="40" fill="#fff" text-anchor="middle">HD</text>
      <text x="${cx}" y="440" ${SCRIPT} font-size="72" fill="#fff" text-anchor="middle">Christmas</text>
      <text x="${cx}" y="492" ${SANS} font-weight="900" font-size="40" letter-spacing="10" fill="url(#gold)" text-anchor="middle">VINYL HD</text>`
  },
  // B: Juletræ af stablede vinylplader med guldstjerne i en snefyldt nat
  b: () => {
    seed = 23
    const disc = (cy, rx, label) => {
      const ry = rx * 0.26
      let g = ''
      for (let k = 0.45; k < 0.97; k += 0.07) g += `<ellipse cx="256" cy="${cy}" rx="${(rx * k).toFixed(1)}" ry="${(ry * k).toFixed(1)}" fill="none" stroke="#2a2a2a" stroke-width="1.2"/>`
      return `<ellipse cx="256" cy="${cy + 9}" rx="${rx}" ry="${ry}" fill="#000" opacity="0.5"/>
        <ellipse cx="256" cy="${cy + 5}" rx="${rx}" ry="${ry}" fill="#0a0a0a"/>
        <ellipse cx="256" cy="${cy}" rx="${rx}" ry="${ry}" fill="#161616"/>${g}
        <ellipse cx="${256 - rx * 0.35}" cy="${cy - ry * 0.35}" rx="${rx * 0.35}" ry="${ry * 0.18}" fill="#fff" opacity="0.08"/>
        <ellipse cx="256" cy="${cy}" rx="${rx * 0.3}" ry="${ry * 0.3}" fill="${label}"/><ellipse cx="256" cy="${cy}" rx="4" ry="1.5" fill="#000"/>`
    }
    // Lyskæde: guldprikker i en bue over hver plade
    const lights = (cy, rx) => {
      let l = ''
      for (let k = -4; k <= 4; k++) { const t = k / 4.6; l += `<circle cx="${256 + rx * t}" cy="${cy + rx * 0.26 * Math.sqrt(1 - t * t) + 4}" r="4.2" fill="${k % 2 ? '#ffd76a' : '#ff5a6e'}"/>` }
      return l
    }
    const star = (cx, cy, R) => {
      let d = ''
      for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + (k * Math.PI) / 5, rr = k % 2 ? R * 0.45 : R; d += `${k ? 'L' : 'M'}${(cx + rr * Math.cos(a)).toFixed(1)},${(cy + rr * Math.sin(a)).toFixed(1)}` }
      return `<path d="${d}Z" fill="url(#gold)"/>`
    }
    return `<defs>${GOLD}<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#071a33"/><stop offset="1" stop-color="#16456e"/></linearGradient>
      <radialGradient id="glow" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#ffe9a3" stop-opacity="0.7"/><stop offset="1" stop-color="#ffe9a3" stop-opacity="0"/></radialGradient></defs>
      <rect width="${S}" height="${S}" fill="url(#bg)"/>${snow(90, { y1: 400, op: 0.7 })}
      <path d="M0,392 Q128,370 256,386 T512,380 V512 H0 Z" fill="#f4f8ff"/>
      ${disc(335, 160, '#1f7a3a')}${lights(335, 160)}${disc(262, 118, '#c8102e')}${lights(262, 118)}${disc(196, 78, '#1f7a3a')}${lights(196, 78)}
      <circle cx="256" cy="128" r="46" fill="url(#glow)"/>${star(256, 132, 34)}
      <text x="256" y="449" ${SCRIPT} font-size="60" fill="#b30f2a" text-anchor="middle">Christmas</text>
      <text x="256" y="496" ${SANS} font-weight="900" font-size="38" letter-spacing="9" fill="#0b2a4a" text-anchor="middle">VINYL HD</text>`
  },
  // C: Vinylpladen som julekrans med kristtjørn og rød sløjfe, tekst i buen over
  c: async () => {
    seed = 37
    const cx = 256, cy = 268, r = 150
    let wreath = ''
    const N = 16
    for (let k = 0; k < N; k++) {
      const a = (k / N) * 2 * Math.PI - Math.PI / 2
      if (Math.abs(a - Math.PI / 2) < 0.45) continue // plads til sløjfen forneden
      wreath += holly(cx + r * Math.cos(a), cy + r * Math.sin(a), 56, (a * 180) / Math.PI + 90)
    }
    return `<defs>${GOLD}<radialGradient id="bg" cx="0.5" cy="0.45" r="0.75"><stop offset="0" stop-color="#1c6b43"/><stop offset="1" stop-color="#062a18"/></radialGradient>
      <path id="arc" d="M${cx - 205},${cy} A205,205 0 0 1 ${cx + 205},${cy}"/>
      <filter id="sh"><feDropShadow dx="0" dy="6" stdDeviation="8" flood-color="#000" flood-opacity="0.45"/></filter></defs>
      <rect width="${S}" height="${S}" fill="url(#bg)"/>${snow(60, { op: 0.6 })}
      <g filter="url(#sh)">${vinyl(cx, cy, r - 8, { label: '#c8102e', labelR: 0.4, id: 'c', hole: false })}${wreath}
        <g transform="translate(${cx} ${cy + r - 4})">
          <path d="M0,0 C-30,-40 -80,-30 -70,5 C-60,35 -20,20 0,0 Z" fill="#d0102c"/><path d="M0,0 C30,-40 80,-30 70,5 C60,35 20,20 0,0 Z" fill="#b80c26"/>
          <path d="M-6,4 L-40,70 L-22,62 L-14,80 L-2,10 Z" fill="#a30a22"/><path d="M6,4 L40,70 L22,62 L14,80 L2,10 Z" fill="#c8102e"/>
          <circle r="14" fill="#e3203c"/></g></g>
      ${await arcText('CHRISTMAS', cx, cy, 208, 46, 'fill="#fff"', 6)}
      <text x="${cx}" y="${cy - 8}" ${SANS} font-weight="800" font-size="24" letter-spacing="4" fill="#fff" text-anchor="middle">VINYL</text>
      <text x="${cx}" y="${cy + 36}" ${SANS} font-weight="900" font-size="46" fill="url(#gold)" text-anchor="middle">HD</text>`
  },
}

fs.mkdirSync(OUT, { recursive: true })
for (const [key, draw] of Object.entries(VARIANTS)) {
  if (ONLY && key !== ONLY) continue
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">${await draw()}</svg>`
  const base = ONLY ? 'christmas-vinyl-hd-logo' : `christmas-vinyl-hd-${key}`
  fs.writeFileSync(path.join(OUT, base + '.svg'), svg)
  await sharp(Buffer.from(svg)).png().toFile(path.join(OUT, base + '.png'))
  console.log('✓', base + '.png')
}
