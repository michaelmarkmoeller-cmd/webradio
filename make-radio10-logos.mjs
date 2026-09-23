// Radio 10-kanallogoer med kanalnavn — 23-09-2026
// Genbruger Radio 10's egne kanalbilleder ("10" + plade/cd/knap øverst på grøn gradient) og sætter
// "RADIO 10" + kanalnavn i den tomme grønne flade nedenunder — stort nok til at kunne læses på stationskortet (44 px).
// Kør: node make-radio10-logos.mjs [outDir]   (standard: public/logos)
import sharp from 'sharp'
import fs from 'node:fs'
import path from 'node:path'

const OUT = process.argv[2] ?? 'public/logos'
const S = 600

const CHANNELS = [
  { src: 'public/logos/radio-10-60s-70s.jpg', file: 'radio-10-60s-70s-navn.png', label: '60s & 70s' },
  { src: 'public/logos/radio-10-90s-hits.jpg', file: 'radio-10-90s-hits-navn.png', label: '90s Hits' },
  { src: 'public/logos/radio-10-top-4000.jpg', file: 'radio-10-pop-navn.png', label: 'Pop' },
]

const SKEW = -8 // samme hældning som det kursive "1" i logoet
const FONT = 'font-family="Segoe UI, Arial, sans-serif" text-anchor="middle"'
const MAX_W = S * 0.9 // kanalnavnet må fylde højst 90 % af bredden
const MAX_SIZE = S * 0.26
const esc = (s) => s.replace(/&/g, '&amp;')

// Bredde af tekst ved 100 px (trimmet), så størrelser kan beregnes ud fra ønsket bredde
async function widthAt100(label, weight, spacing = 0) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="2400" height="300"><text x="1200" y="200" ${FONT} font-weight="${weight}" font-size="100" letter-spacing="${spacing}" fill="#000">${esc(label)}</text></svg>`
  const { info } = await sharp(Buffer.from(svg)).flatten({ background: '#fff' }).trim().toBuffer({ resolveWithObject: true })
  return info.width
}

const TOP = 'RADIO 10', TOP_SPACING = 0.12 // bogstavafstand som andel af skriftstørrelsen
const CAP = 0.72 // versalhøjde ≈ 72 % af skriftstørrelsen (Segoe UI)

async function layout(label) {
  // Kanalnavnet fylder op til 90 % af bredden; "RADIO 10" fylder altid 90 % (= samme bredde som de lange navne,
  // og samme størrelse på alle tre logoer — også når navnet er kort som "Pop")
  const main = Math.min(MAX_SIZE, (100 * MAX_W) / (await widthAt100(label, 900)))
  const top = (100 * MAX_W) / (await widthAt100(TOP, 800, 100 * TOP_SPACING))
  return { main, top }
}

function textSvg(label, { main, top }) {
  const shadow = `<filter id="sh" x="-20%" y="-50%" width="140%" height="200%"><feDropShadow dx="0" dy="${S * 0.007}" stdDeviation="${S * 0.009}" flood-color="#0b5a2a" flood-opacity="0.5"/></filter>`
  // skewX forskyder x med y·tan(8°) → kompensér, så teksten står midt i billedet
  const dx = (y) => y * Math.tan((-SKEW * Math.PI) / 180)
  const gap = S * 0.03
  const yTop = S * 0.5 + top * CAP            // "RADIO 10" starter lige under ikonet
  const yLine = yTop + gap * 0.8
  const yMain = yLine + gap + main * CAP     // kanalnavnet under stregen
  const sp = top * TOP_SPACING
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}"><defs>${shadow}</defs>
  <g filter="url(#sh)" transform="translate(${S / 2} 0) skewX(${SKEW})">
    <text x="${dx(yTop) + sp / 2}" y="${yTop}" ${FONT} font-weight="800" font-size="${top}" letter-spacing="${sp}" fill="#ffffff">${TOP}</text>
    <rect x="${dx(yLine) - S * 0.08}" y="${yLine}" width="${S * 0.16}" height="${S * 0.009}" rx="${S * 0.0045}" fill="#ffffff" opacity="0.75"/>
    <text x="${dx(yMain)}" y="${yMain}" ${FONT} font-weight="900" font-size="${main}" fill="#ffffff">${esc(label)}</text>
  </g></svg>`
}
fs.mkdirSync(OUT, { recursive: true })
for (const ch of CHANNELS) {
  const base = await sharp(ch.src).resize(S, S, { kernel: 'lanczos3' }).png().toBuffer()
  const sizes = await layout(ch.label)
  await sharp(base).composite([{ input: Buffer.from(textSvg(ch.label, sizes)) }]).png().toFile(path.join(OUT, ch.file))
  console.log('✓', ch.file, 'RADIO 10:', Math.round(sizes.top) + ' px', 'navn:', Math.round(sizes.main) + ' px')
}
