// Kør med: node add-italo-mix.mjs
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from './firebase-init.mjs'

await addDoc(collection(db, 'stations'), {
  name:      '80s80s Italo Mix',
  streamUrl: 'https://streams.80s80s.de/italomix/mp3-192/stream.mp3',
  category:  'Italo',
  bitrate:   192,
  logoUrl:   'https://webradio-chi.vercel.app/logos/80s80s-italo-mix.png',
  createdAt: serverTimestamp(),
})

console.log('✓ 80s80s Italo Mix tilføjet (192 kbps)')
process.exit(0)
