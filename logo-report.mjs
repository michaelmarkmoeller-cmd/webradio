// Overblik over alle stationslogoer: pixelstørrelse + reel opløsning — 23-09-2026
// Kør: node logo-report.mjs [outDir]   → logo-report.json + logo-overview.html (standard: logo-preview/)
// Reel opløsning måles som i upgrade-logos.mjs: mindste størrelse hvor ≥ 85 % af kantskarpheden overlever.
import { collection, getDocs } from 'firebase/firestore'
import { db } from './firebase-init.mjs'
import sharp from 'sharp'
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const OUT = process.argv[2] ?? 'logo-preview'
const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/125.0' }

async function getBuf(url) {
  try {
    const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(15000) })
    if (r.ok) return Buffer.from(await r.arrayBuffer())
  } catch {}
  try { return execFileSync('curl', ['-s', '-f', '-L', '-m', '15', '-A', UA['User-Agent'], url], { maxBuffer: 20 * 1024 * 1024 }) } catch { return null }
}

async function sharpness(buf) {
  const g = await sharp(buf, { density: 300 }).flatten({ background: '#808080' }).resize(512, 512, { fit: 'fill', kernel: 'lanczos3' })
    .toColourspace('b-w').raw().toBuffer({ resolveWithObject: true })
  const { width: w, height: h, channels: ch } = g.info, d = g.data
  const px = (x, y) => d[(y * w + x) * ch]
  let s1 = 0, s2 = 0, l1 = 0, l2 = 0, n = 0
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const v = px(x, y), lap = px(x - 1, y) + px(x + 1, y) + px(x, y - 1) + px(x, y + 1) - 4 * v
    s1 += v; s2 += v * v; l1 += lap; l2 += lap * lap; n++
  }
  const varI = s2 / n - (s1 / n) ** 2
  return varI > 0 ? (l2 / n - (l1 / n) ** 2) / varI : 0
}
async function effectiveRes(buf) {
  const flat = await sharp(buf, { density: 300 }).flatten({ background: '#808080' }).png().toBuffer()
  const full = Math.max(await sharpness(flat), 1e-9)
  const m = await sharp(flat).metadata()
  for (const s of [96, 128, 160, 200, 256, 320, 400]) {
    if (s >= Math.min(m.width, m.height)) return Math.min(m.width, m.height)
    const small = await sharp(flat).resize(s, s, { fit: 'fill', kernel: 'lanczos3' }).png().toBuffer()
    if ((await sharpness(small)) / full >= 0.85) return s
  }
  return Math.min(512, Math.min(m.width, m.height))
}

function source(url) {
  const h = new URL(url).hostname
  if (h === 'webradio-chi.vercel.app') return 'Lokal (public/logos)'
  if (h.includes('tunein')) return 'TuneIn'
  if (h.includes('laut.fm')) return 'laut.fm'
  return h.replace(/^www\./, '')
}

const snap = await getDocs(collection(db, 'stations'))
const stations = snap.docs.map((d) => d.data()).sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name))
const rows = []
let i = 0
await Promise.all(Array.from({ length: 8 }, async () => {
  while (i < stations.length) {
    const s = stations[i++]
    const row = { name: s.name, category: s.category, logoUrl: s.logoUrl ?? '', source: s.logoUrl ? source(s.logoUrl) : '—' }
    const buf = s.logoUrl ? await getBuf(s.logoUrl) : null
    if (buf) {
      try {
        const m = await sharp(buf, { density: 72 }).metadata()
        Object.assign(row, { width: m.width, height: m.height, format: m.format, eff: await effectiveRes(buf) })
      } catch { row.error = 'ikke et billede' }
    } else row.error = s.logoUrl ? 'kunne ikke hentes' : 'intet logo'
    rows.push(row)
  }
}))
rows.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name))

fs.mkdirSync(OUT, { recursive: true })
fs.writeFileSync(path.join(OUT, 'logo-report.json'), JSON.stringify(rows, null, 2))

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
const grade = (r) => r.error ? 'bad' : Math.min(r.width, r.height) >= 512 && r.eff >= 400 ? 'good' : r.eff >= 256 ? 'ok' : 'bad'
// eff = mindste side (eller 512) betyder: ingen tegn på forstørrelse — billedet har detalje i hele sin opløsning
const effTxt = (r) => r.eff >= 512 || r.eff === Math.min(r.width, r.height) ? 'fuld' : `≈ ${r.eff}`
const cards = rows.map((r) => `
<div class="card ${grade(r)}" data-cat="${esc(r.category)}">
  <div class="img">${r.logoUrl ? `<img loading="lazy" src="${esc(r.logoUrl)}" alt="">` : ''}</div>
  <div class="name">${esc(r.name)}</div>
  <div class="meta">${esc(r.category)} · ${esc(r.source)}</div>
  <div class="res">${r.error ? esc(r.error) : `${r.width}×${r.height} ${esc(r.format)} · reel ${effTxt(r)}`}</div>
</div>`).join('')
const cats = [...new Set(rows.map((r) => r.category))]
const count = (g) => rows.filter((r) => grade(r) === g).length
const html = `<!doctype html><html lang="da"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>WebRadio logoer</title>
<style>
:root{--bg:#0F0F14;--card:#1a1a22;--fg:#eee;--mut:#999;--acc:#F5A623;--good:#4ADE80;--ok:#F5A623;--bad:#E8262A}
body{background:var(--bg);color:var(--fg);font-family:system-ui,sans-serif;margin:0;padding:24px 16px}
h1{margin:0 0 4px;font-size:22px}p{color:var(--mut);margin:0 0 16px;font-size:14px}
.bar{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:18px}
.bar button{background:var(--card);color:var(--fg);border:1px solid #333;border-radius:999px;padding:6px 12px;cursor:pointer;font-size:13px}
.bar button.on{border-color:var(--acc);color:var(--acc)}
.bgsel{margin-left:auto}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:14px}
.card{background:var(--card);border-radius:12px;padding:10px;border-top:3px solid var(--good)}
.card.ok{border-top-color:var(--ok)}.card.bad{border-top-color:var(--bad)}
.img{aspect-ratio:1;border-radius:8px;overflow:hidden;background:repeating-conic-gradient(#2a2a33 0 25%,#22222a 0 50%) 0 0/16px 16px;display:flex;align-items:center;justify-content:center}
.img img{width:100%;height:100%;object-fit:contain}
.name{font-weight:600;font-size:14px;margin-top:8px}.meta{color:var(--mut);font-size:12px;margin-top:2px}
.res{font-size:12px;margin-top:4px;font-variant-numeric:tabular-nums}
.legend span{display:inline-block;width:10px;height:10px;border-radius:2px;margin:0 4px 0 12px;vertical-align:middle}
</style>
<h1>WebRadio – stationslogoer</h1>
<p>${rows.length} stationer · målt ${new Date().toLocaleDateString('da-DK')} ·
<span class="legend"><span style="background:var(--good)"></span>≥ 512 px og skarpt (${count('good')})<span style="background:var(--ok)"></span>brugbart (${count('ok')})<span style="background:var(--bad)"></span>lavt / fejl (${count('bad')})</span><br>
"reel" = den opløsning billedet reelt har detaljer i — "fuld" = ingen tegn på forstørrelse (et forstørret lille billede har stor filstørrelse men lav reel opløsning).</p>
<div class="bar"><button class="on" data-f="">Alle</button>${cats.map((c) => `<button data-f="${esc(c)}">${esc(c)}</button>`).join('')}</div>
<div class="grid">${cards}</div>
<script>
document.querySelectorAll('.bar button').forEach(b=>b.onclick=()=>{document.querySelectorAll('.bar button').forEach(x=>x.classList.toggle('on',x===b));document.querySelectorAll('.card').forEach(c=>c.style.display=!b.dataset.f||c.dataset.cat===b.dataset.f?'':'none')})
</script></html>`
fs.writeFileSync(path.join(OUT, 'logo-overview.html'), html)

console.log('| # | Station | Kategori | Størrelse | Reel | Format | Kilde |')
console.log('|---|---|---|---|---|---|---|')
rows.forEach((r, n) => console.log(`| ${n + 1} | ${r.name} | ${r.category} | ${r.error ?? `${r.width}×${r.height}`} | ${r.error ? '—' : effTxt(r)} | ${r.format ?? '—'} | ${r.source} |`))
console.log(`\ngood=${count('good')} ok=${count('ok')} bad=${count('bad')}`)
process.exit(0)
