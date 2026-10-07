// Erstatter Radio Italo Disco Net (kilden nede: HTTP 502 / ECONNREFUSED, 07-10-2026) med Radio Italo4you
// Genbruger dokumentet, så plads i rækkefølge + favoritter bevares
// Kør med: node replace-italo-disco-net-oct2026.mjs  (efter at public/logos/radio-italo4you.png er deployet)
import { collection, getDocs, updateDoc } from 'firebase/firestore'
import { db } from './firebase-init.mjs'

const replacement = {
  name:      'Radio Italo4you',
  streamUrl: 'https://ssl-1.radiohost.pl:8018/stream',
  bitrate:   256,
  country:   'pl',
  logoUrl:   'https://webradio-chi.vercel.app/logos/radio-italo4you.png',
}

const res = await fetch(replacement.logoUrl)
if (!res.ok || !(res.headers.get('content-type') || '').startsWith('image/')) {
  console.error(`Logo er ikke deployet endnu (${res.status} ${res.headers.get('content-type')})`); process.exit(1)
}
const docs = (await getDocs(collection(db, 'stations'))).docs.filter(d => d.data().name === 'Radio Italo Disco Net')
if (docs.length !== 1) { console.error(`Forventede 1 dokument, fandt ${docs.length}`); process.exit(1) }
await updateDoc(docs[0].ref, replacement)
console.log(`✓  Radio Italo Disco Net → ${replacement.name} (${docs[0].id})`)
process.exit(0)
