// Flytter eksterne stationslogoer til public/logos/ (Vercel CDN, eget domæne) — 23-09-2026
// Regel: ALLE logoer hostes lokalt — eksterne URL'er kan skifte, blive blokeret eller skifte indhold.
// Kør:  node localize-logos.mjs           → henter eksterne logoer UÆNDRET (samme bytes) til public/logos/ + plan
//       (commit + push public/logos/, vent på deploy)
//       node localize-logos.mjs --apply   → peger Firestore på de lokale filer, når de leveres som billede
// Stationer tilføjet via appen ("Tilføj station") får en ekstern URL — kør scriptet igen for at flytte dem.
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore'
import { db } from './firebase-init.mjs'
import sharp from 'sharp'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { execFileSync } from 'node:child_process'

const APPLY = process.argv.includes('--apply')
const SITE = 'https://webradio-chi.vercel.app'
const DIR = 'public/logos'
const PLAN = 'localize-logos-plan.json'
const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/125.0' }
const EXT = { png: 'png', jpeg: 'jpg', webp: 'webp', svg: 'svg', gif: 'gif' }

const slug = (s) => s.toLowerCase().replace(/æ/g, 'ae').replace(/ø/g, 'oe').replace(/å/g, 'aa')
  .normalize('NFKD').replace(/[^\w]+/g, '-').replace(/^-|-$/g, '')
const md5 = (b) => crypto.createHash('md5').update(b).digest('hex')

async function getBuf(url) {
  try {
    const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(15000) })
    if (r.ok) return Buffer.from(await r.arrayBuffer())
  } catch {}
  // Fx ufuldstændig certifikatkæde hos kilden
  try { return execFileSync('curl', ['-s', '-f', '-L', '-m', '15', '-A', UA['User-Agent'], url], { maxBuffer: 20 * 1024 * 1024 }) } catch { return null }
}

const isLocal = (url) => url?.startsWith(`${SITE}/logos/`)
const snap = await getDocs(collection(db, 'stations'))

if (!APPLY) {
  const plan = []
  for (const d of snap.docs) {
    const s = d.data()
    if (!s.logoUrl || isLocal(s.logoUrl)) continue
    const buf = await getBuf(s.logoUrl)
    if (!buf) { console.log('✗ kunne ikke hentes:', s.name, s.logoUrl); continue }
    let meta
    try { meta = await sharp(buf).metadata() } catch { console.log('✗ ikke et billede:', s.name, s.logoUrl); continue }
    const ext = EXT[meta.format]
    if (!ext) { console.log('✗ ukendt format', meta.format, s.name); continue }
    // Overskriv aldrig en eksisterende fil med andet indhold (gamle URL'er kan ligge i caches)
    let file = `${slug(s.name)}.${ext}`
    for (let n = 2; fs.existsSync(path.join(DIR, file)) && md5(fs.readFileSync(path.join(DIR, file))) !== md5(buf); n++) file = `${slug(s.name)}-${n}.${ext}`
    fs.writeFileSync(path.join(DIR, file), buf) // uændrede bytes — ingen genkomprimering
    plan.push({ id: d.id, name: s.name, from: s.logoUrl, file, newUrl: `${SITE}/logos/${file}`, size: `${meta.width}x${meta.height}`, bytes: buf.length })
    console.log('✓', s.name.padEnd(30), file, `${meta.width}x${meta.height}`)
  }
  fs.writeFileSync(PLAN, JSON.stringify(plan, null, 2))
  console.log(`\n${plan.length} logoer gemt i ${DIR}/ — commit + push, og kør derefter: node localize-logos.mjs --apply`)
} else {
  const plan = JSON.parse(fs.readFileSync(PLAN, 'utf8'))
  let ok = 0
  for (const p of plan) {
    // vercel.json omskriver ukendte stier til index.html med 200 → kræv billed-content-type OG samme bytes
    const r = await fetch(p.newUrl, { headers: UA }).catch(() => null)
    const type = r?.headers.get('content-type') ?? ''
    const buf = r?.ok ? Buffer.from(await r.arrayBuffer()) : null
    if (!type.startsWith('image/') || !buf || md5(buf) !== md5(fs.readFileSync(path.join(DIR, p.file)))) {
      console.log('✗ ikke deployet endnu:', p.name, p.newUrl, type); continue
    }
    const cur = snap.docs.find((d) => d.id === p.id)?.data()
    if (cur?.logoUrl !== p.from) { console.log('– ændret siden planen, springes over:', p.name); continue }
    await updateDoc(doc(db, 'stations', p.id), { logoUrl: p.newUrl })
    console.log('✓', p.name); ok++
  }
  console.log(`\n${ok}/${plan.length} peger nu på lokale logoer`)
  if (ok === plan.length) fs.unlinkSync(PLAN)
}
process.exit(0)
