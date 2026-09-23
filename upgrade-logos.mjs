// Finder skarpere stationslogoer (låseskærm/CarPlay + stationskort) — 23-09-2026
// Kør:  node upgrade-logos.mjs            → prøvekørsel: plan + før/efter-preview, ingen ændringer
//       node upgrade-logos.mjs --apply    → kopierer genererede PNG'er til public/logos/ og opdaterer
//                                           logoUrl i Firestore efter den godkendte plan (logo-plan.json)
// Logostandard: kvadratisk (1:1), ikke-transparent baggrund, helst ≥ 512 px.
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore'
import { db } from './firebase-init.mjs'
import sharp from 'sharp'
import fs from 'node:fs'
import path from 'node:path'

const APPLY = process.argv.includes('--apply')
const OUT_DIR = process.env.LOGO_PREVIEW_DIR ?? 'logo-preview'
const PLAN_FILE = path.join(OUT_DIR, 'logo-plan.json')
const TARGET = 512          // genererede logoer
const GOOD_ENOUGH = 400     // under dette forsøges opgradering
const SITE = 'https://webradio-chi.vercel.app'
const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/125.0' }

// Forslag afvist ved visuel gennemgang 23-09-2026 (forkert station/kanal, eller ikke bedre)
// Anden runde (kandidater fra hjemmeside/manifest, laut.fm-API, TuneIn): intet brugbart fundet
const REJECT = new Set([
  'Radio Stad Den Haag', 'Radio ANR', 'Retro Radio',
  // Fravalgt af Michael 23-09-2026 (TuneIn-versionerne blev ikke valgt)
  'Forever 80', 'laut.fm Eurobeat',
  'radio SAW In The Mix', 'radio SAW In The Mix 80er', 'radio SAW In The Mix 90er',
])

// Håndplukkede kilder, hvor automatikken ikke fandt (den rigtige) store udgave.
//   src: URL eller lokal fil · crop: andel der skæres af hver kant (fx afrundede, transparente hjørner)
//   bg: fast baggrund · bgFrom: tag baggrundsfarven fra dette billede · fill: logoets andel af kvadratet
const SAW = 'https://backend.radiosaw.de/sites/default/files/2023-11/'
const MANUAL = {
  'Radio SAW': { src: `${SAW}radio-saw-simulcast_0.png`, crop: 0.05, fill: 1, note: 'radio SAW original 1400×1400' },
  'Radio SAW 70er': { src: `${SAW}70er.png`, crop: 0.05, fill: 1, note: 'radio SAW original 1400×1400' },
  'radio SAW 80er': { src: `${SAW}80er.png`, crop: 0.05, fill: 1, note: 'radio SAW original 1400×1400' },
  'radio SAW 90er': { src: `${SAW}90er.png`, crop: 0.05, fill: 1, note: 'radio SAW original 1400×1400' },
  'RadioMonster Tophits': { src: 'https://www.radiomonster.fm/wp-content/uploads/2020/12/radiomonster_tophits_2000px.png', fill: 1, note: 'RadioMonster original 2000×2000' },
  // Samme opbygning som de gamle 100×100-SVG'er (Tophits-robot + farvet bjælke), men ud fra 2000 px-originalen
  'RadioMonster 80s': { radiomonster: { label: '80S', color: '#C8720A', size: 13 }, note: 'Tophits-original 2000 px + kanalbjælke' },
  'RadioMonster 90s': { radiomonster: { label: '90S', color: '#b02060', size: 13 }, note: 'Tophits-original 2000 px + kanalbjælke' },
  'RadioMonster Dance': { radiomonster: { label: 'DANCE', color: '#1a7fad', size: 10 }, note: 'Tophits-original 2000 px + kanalbjælke' },
  'RadioMonster Rock': { radiomonster: { label: 'ROCK', color: '#7b2fc7', size: 10 }, note: 'Tophits-original 2000 px + kanalbjælke' },
  "80's Hits": { src: 'https://assets.planetradio.co.uk/img/ConfigWebHeaderLogoSVGImageUrl/198.svg', bgFrom: 'https://assets.planetradio.co.uk/img/ConfigWebListenBarLogoImageUrl/198.jpg', fill: 0.7, note: 'Bauers SVG-logo på kanalens farve' },
  "Danske 80'er Hits": { src: 'https://assets.planetradio.co.uk/img/ConfigWebHeaderLogoSVGImageUrl/188.svg', bgFrom: 'https://assets.planetradio.co.uk/img/ConfigWebListenBarLogoImageUrl/188.jpg', fill: 0.7, note: 'Bauers SVG-logo på kanalens farve' },
  'Radio BOB!': { src: 'https://cdn-radiotime-logos.tunein.com/s96189g.png', bg: { r: 255, g: 255, b: 255 }, fill: 0.86, note: 'eget bredt TuneIn-logo (584×294) på lys baggrund ("BOB!" er sort)' },
  'Veronica Top 1000': { url: 'https://cdn-profiles.tunein.com/s6717/images/logog.jpg', note: 'Radio Veronica-hovedlogo (TuneIn)' },
  // Anden runde 23-09-2026
  '538 Hitzone': { src: 'https://www.538.nl/icons/icon-512x512.png', fill: 1, note: '538.nl eget ikon (hostes lokalt — 538.nl blokerer ofte hotlinks)' },
  '538 Party': { src: 'https://www.538.nl/icons/icon-512x512.png', fill: 1, note: '538.nl eget ikon (hostes lokalt — 538.nl blokerer ofte hotlinks)' },
  '80s80s Italo Hits': { url: 'https://cdn-profiles.tunein.com/s307738/images/logog.png', note: 'TuneIn "80s80s ITALO DISCO" (samme logo som før)' },
  'Big 70s Radio': { url: 'https://assets.laut.fm/0883f770dab240771e733732875df77d', note: 'laut.fm API-logo for radio70' },
  'Rock Antenne': { url: 'https://www.rockantenne.de/logos/station-rock-antenne/android-chrome-512x512.png', note: 'rockantenne.de eget 512 px-ikon' },
}

async function loadAny(src) {
  if (/^https?:/.test(src)) return load(src)
  const buf = fs.readFileSync(src)
  const m = await sharp(buf, { density: 300 }).metadata()
  return { url: src, buf, width: m.width, height: m.height, format: m.format, alpha: !!m.hasAlpha }
}

const RM_TOPHITS = 'https://www.radiomonster.fm/wp-content/uploads/2020/12/radiomonster_tophits_2000px.png'
async function radiomonsterPng({ label, color, size }) {
  const img = await load(RM_TOPHITS)
  if (!img) return null
  // Koordinater i 0–100-systemet fra de oprindelige SVG'er: bjælke x 8–92, y 77–92
  const overlay = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${TARGET}" height="${TARGET}" viewBox="0 0 100 100">
    <rect x="0" y="76" width="100" height="24" fill="#ffffff"/>
    <rect x="8" y="77" width="84" height="15" fill="${color}" rx="2"/>
    <text x="50" y="89" font-family="Arial Black, Impact, sans-serif" font-size="${size}" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="1">${label}</text>
  </svg>`)
  const base = await sharp(img.buf).resize(TARGET, TARGET, { kernel: 'lanczos3' }).flatten({ background: '#ffffff' }).png().toBuffer()
  return { png: await sharp(base).composite([{ input: overlay }]).png().toBuffer(), source: img }
}

async function manualPng(opts) {
  if (opts.radiomonster) return radiomonsterPng(opts.radiomonster)
  const img = await loadAny(opts.src)
  if (!img) return null
  let buf = img.buf
  if (opts.crop) {
    const m = await sharp(buf).metadata()
    const cx = Math.round(m.width * opts.crop), cy = Math.round(m.height * opts.crop)
    buf = await sharp(buf).extract({ left: cx, top: cy, width: m.width - 2 * cx, height: m.height - 2 * cy }).png().toBuffer()
  }
  const bg = opts.bg ?? (opts.bgFrom ? await edgeColor((await load(opts.bgFrom)).buf) : await edgeColor(buf))
  return { png: await squarePng({ ...img, buf }, { bg, fill: opts.fill }), source: img }
}

async function load(url) {
  try {
    const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(10000) })
    if (!r.ok) return null
    const buf = Buffer.from(await r.arrayBuffer())
    const m = await sharp(buf, { density: 300 }).metadata()
    if (!m.width || !m.height) return null
    return { url, buf, width: m.width, height: m.height, format: m.format, alpha: !!m.hasAlpha }
  } catch { return null }
}

const minSide = (img) => Math.min(img.width, img.height)
const isSquare = (img) => Math.abs(img.width - img.height) / Math.max(img.width, img.height) <= 0.04
const slug = (s) => s.toLowerCase().normalize('NFKD').replace(/[^\w]+/g, '-').replace(/^-|-$/g, '')

// Varianter hos samme kilde (samme logo, større fil)
function sameSourceVariants(url) {
  const out = []
  let m
  if ((m = url.match(/cdn-radiotime-logos\.tunein\.com\/(s\d+)[a-z]\.png/)))
    out.push(`https://cdn-radiotime-logos.tunein.com/${m[1]}g.png`, `https://cdn-radiotime-logos.tunein.com/${m[1]}d.png`)
  if ((m = url.match(/cdn-profiles\.tunein\.com\/(s\d+)\/images\/logo[a-z]\.(png|jpg)/)))
    out.push(`https://cdn-profiles.tunein.com/${m[1]}/images/logog.${m[2]}`, `https://cdn-profiles.tunein.com/${m[1]}/images/logod.${m[2]}`)
  if (url.includes('assets.laut.fm')) out.push(url.replace(/\?.*$/, '') + '?t=_600x600')
  if ((m = url.match(/^(https:\/\/images\.(80s80s|90s90s|radiobob|sunshine-live)\.de\/[^?]+)/))) out.push(`${m[1]}?width=600&height=600`)
  return out
}

// TuneIn-søgning på stationsnavn — kan ramme en forkert station, derfor markeret til visuelt tjek
async function tuneInCandidates(name) {
  try {
    const r = await fetch(`https://opml.radiotime.com/Search.ashx?query=${encodeURIComponent(name)}&render=json`, { signal: AbortSignal.timeout(10000) })
    const items = (await r.json()).body ?? []
    const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '')
    const hit = items.find((i) => i.type === 'audio' && /^s\d+$/.test(i.guide_id ?? '') && norm(i.text ?? '').includes(norm(name).slice(0, 8)))
    if (!hit) return []
    return [
      { url: `https://cdn-profiles.tunein.com/${hit.guide_id}/images/logog.png`, note: `TuneIn-søgning: "${hit.text}"` },
      { url: `https://cdn-profiles.tunein.com/${hit.guide_id}/images/logog.jpg`, note: `TuneIn-søgning: "${hit.text}"` },
      { url: `https://cdn-radiotime-logos.tunein.com/${hit.guide_id}g.png`, note: `TuneIn-søgning: "${hit.text}"` },
    ]
  } catch { return [] }
}

// Baggrundsfarve = dominerende kantfarve (så et bredt logo kan lægges på et kvadrat uden synlig kant)
async function edgeColor(buf) {
  const { data, info } = await sharp(buf, { density: 300 }).flatten({ background: '#ffffff' }).resize(64, 64, { fit: 'fill' }).raw().toBuffer({ resolveWithObject: true })
  const counts = new Map()
  const px = (x, y) => { const i = (y * info.width + x) * info.channels; return [data[i], data[i + 1], data[i + 2]] }
  for (let i = 0; i < 64; i++) for (const [x, y] of [[i, 0], [i, 63], [0, i], [63, i]]) {
    const key = px(x, y).map((v) => Math.round(v / 16) * 16).join(',')
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  const [r, g, b] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0].split(',').map(Number)
  return { r: Math.min(255, r), g: Math.min(255, g), b: Math.min(255, b) }
}

// Kvadratisk 512×512 PNG med ikke-transparent baggrund og lidt luft om logoet
async function squarePng(img, opts = {}) {
  const bg = opts.bg ?? await edgeColor(img.buf)
  const inner = Math.round(TARGET * (opts.fill ?? (isSquare(img) ? 1 : 0.86)))
  const logo = await sharp(img.buf, { density: 600 })
    .resize(inner, inner, { fit: 'contain', background: { ...bg, alpha: 1 }, kernel: 'lanczos3' })
    .flatten({ background: bg }).png().toBuffer()
  return sharp({ create: { width: TARGET, height: TARGET, channels: 3, background: bg } })
    .composite([{ input: logo, gravity: 'center' }]).png().toBuffer()
}

async function plan() {
  const snap = await getDocs(collection(db, 'stations'))
  const stations = snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => a.name.localeCompare(b.name))
  fs.mkdirSync(path.join(OUT_DIR, 'generated'), { recursive: true })
  const results = []

  for (const s of stations) {
    const current = s.logoUrl ? await load(s.logoUrl) : null
    const oldSize = current ? `${current.width}x${current.height}${current.format === 'svg' ? ' svg' : ''}` : 'kan ikke hentes'
    const base = { id: s.id, name: s.name, category: s.category, oldUrl: s.logoUrl ?? null, oldSize }

    const alreadyGood = current && minSide(current) >= GOOD_ENOUGH && isSquare(current) && current.format !== 'svg'
    const manual = MANUAL[s.name]
    if (manual && !alreadyGood) {
      let action = null
      if (manual.url) {
        const img = await load(manual.url)
        if (img) action = { kind: 'url', newUrl: manual.url, size: `${img.width}x${img.height}`, note: manual.note }
      } else {
        const out = await manualPng(manual)
        if (out) {
          const file = `${slug(s.name)}.png`
          fs.writeFileSync(path.join(OUT_DIR, 'generated', file), out.png)
          action = { kind: 'generated', file, newUrl: `${SITE}/logos/${file}`, size: `${TARGET}x${TARGET}`, source: manual.src, sourceSize: `${out.source.width}x${out.source.height}`, note: manual.note }
        }
      }
      results.push({ ...base, action })
      console.log(`${action ? '✓' : '–'} ${s.name.padEnd(28)} ${oldSize.padEnd(14)} → ${action ? `${action.size} (manuel)` : 'manuel kilde fejlede'}`)
      continue
    }
    if (REJECT.has(s.name)) {
      results.push({ ...base, action: null, rejected: true })
      console.log(`– ${s.name.padEnd(28)} ${oldSize.padEnd(14)} → afvist ved gennemgang`)
      continue
    }
    if (alreadyGood) continue

    const cands = []
    for (const url of sameSourceVariants(s.logoUrl ?? '')) cands.push({ url, note: 'samme kilde, større variant' })
    if (!cands.length || !current || minSide(current) < 200) cands.push(...await tuneInCandidates(s.name))

    const loaded = []
    for (const c of cands) { const img = await load(c.url); if (img) loaded.push({ ...img, note: c.note }) }
    if (current && current.format === 'svg') loaded.push({ ...current, width: TARGET, height: TARGET, note: 'SVG → PNG (vektor, skaleres skarpt)' })

    // Bedste: kvadratisk og stor nok → brug URL'en direkte. Ellers største brugbare → generér kvadrat.
    const better = loaded.filter((i) => minSide(i) > (current ? minSide(current) : 0) || i.format === 'svg')
    const square = better.filter((i) => isSquare(i) && i.format !== 'svg').sort((a, b) => minSide(b) - minSide(a))[0]
    const any = better.sort((a, b) => Math.max(b.width, b.height) - Math.max(a.width, a.height))[0]

    let action = null
    if (square && minSide(square) >= GOOD_ENOUGH) {
      action = { kind: 'url', newUrl: square.url, size: `${square.width}x${square.height}`, note: square.note }
    } else if (any && (any.format === 'svg' || Math.max(any.width, any.height) >= GOOD_ENOUGH)) {
      const file = `${slug(s.name)}.png`
      fs.writeFileSync(path.join(OUT_DIR, 'generated', file), await squarePng(any))
      action = { kind: 'generated', file, newUrl: `${SITE}/logos/${file}`, size: `${TARGET}x${TARGET}`, source: any.url, sourceSize: `${any.width}x${any.height}`, note: any.note }
    }
    results.push({
      id: s.id, name: s.name, category: s.category,
      oldUrl: s.logoUrl ?? null, oldSize: current ? `${current.width}x${current.height}` : 'kan ikke hentes',
      action,
    })
    console.log(`${action ? '✓' : '–'} ${s.name.padEnd(28)} ${results.at(-1).oldSize.padEnd(14)} → ${action ? `${action.size} (${action.kind}${action.note?.startsWith('TuneIn') ? ', TJEK' : ''})` : 'intet bedre fundet'}`)
  }

  fs.writeFileSync(PLAN_FILE, JSON.stringify(results, null, 2))
  writePreview(results)
  const n = results.filter((r) => r.action).length
  console.log(`\n${results.length} logoer under ${GOOD_ENOUGH}px/ikke-kvadratiske — ${n} kan opgraderes. Plan: ${PLAN_FILE}`)
}

function writePreview(results) {
  const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;')
  const rows = results.map((r) => {
    const after = r.action ? (r.action.kind === 'generated' ? `generated/${r.action.file}` : r.action.newUrl) : null
    const warn = r.action?.note?.startsWith('TuneIn') ? '<span class="warn">Tjek: fundet via søgning</span>' : ''
    return `<tr class="${r.action ? '' : 'none'}"><td><b>${esc(r.name)}</b><br><small>${esc(r.category)}</small></td>
      <td><div class="lock">${r.oldUrl ? `<img src="${esc(r.oldUrl)}">` : ''}</div><small>${esc(r.oldSize)}</small></td>
      <td>${after ? `<div class="lock"><img src="${esc(after)}"></div><small>${esc(r.action.size)} · ${esc(r.action.note)}</small>${warn}` : '<small>Intet bedre fundet</small>'}</td></tr>`
  }).join('\n')
  fs.writeFileSync(path.join(OUT_DIR, 'preview.html'), `<!doctype html><meta charset="utf-8"><title>Logo-opgradering</title>
<style>body{font:14px system-ui;background:#0F0F14;color:#eee;padding:16px}table{border-collapse:collapse}td{padding:10px;border-bottom:1px solid #333;vertical-align:top}
.lock{width:220px;height:220px;border-radius:18px;overflow:hidden;background:#222}.lock img{width:100%;height:100%;object-fit:cover;image-rendering:auto}
small{color:#999;display:block;margin-top:4px;max-width:220px}.warn{color:#F5A623;font-weight:600}tr.none{opacity:.5}</style>
<h1>Logo-opgradering — før / efter</h1><p>Billederne vises i 220×220 (ca. låseskærmsstørrelse) — grove "før"-logoer ses tydeligt.</p>
<table><tr><th>Station</th><th>Før</th><th>Efter</th></tr>${rows}</table>`)
}

async function apply() {
  const results = JSON.parse(fs.readFileSync(PLAN_FILE, 'utf8'))
  let pending = 0
  for (const r of results.filter((x) => x.action)) {
    if (r.action.kind === 'generated') {
      fs.copyFileSync(path.join(OUT_DIR, 'generated', r.action.file), path.join('public', 'logos', r.action.file))
      // Peg først Firestore på filen, når den er deployet — ellers ses et tomt logo under build.
      // Tjek content-type, ikke kun status: vercel.json omskriver ukendte stier til index.html (200)
      const live = await fetch(r.action.newUrl, { method: 'HEAD' })
        .then((x) => x.ok && (x.headers.get('content-type') ?? '').startsWith('image/')).catch(() => false)
      if (!live) { pending++; console.log(`… ${r.name}: kopieret til public/logos — venter på deploy`); continue }
    }
    await updateDoc(doc(db, 'stations', r.id), { logoUrl: r.action.newUrl })
    console.log(`✓ ${r.name}: ${r.action.newUrl}`)
  }
  if (pending) console.log(`\n${pending} genererede logoer venter på deploy — commit/push public/logos og kør --apply igen`)
}

await (APPLY ? apply() : plan())
process.exit(0)
