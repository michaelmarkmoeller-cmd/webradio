// Kør med: node add-dance-stations-jun2026.mjs
// Tilføjer 10 Dance-stationer (ny kategori)
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from './firebase-init.mjs'

const stations = [
  {
    name:      'Sunshine Live',
    streamUrl: 'https://stream.sunshine-live.de/live/mp3-192',
    category:  'Dance',
    bitrate:   192,
    country:   'de',
    logoUrl:   'https://cdn-profiles.tunein.com/s24981/images/logod.jpg',
  },
  {
    name:      'RauteMusik Club',
    streamUrl: 'https://club-high.rautemusik.fm/',
    category:  'Dance',
    bitrate:   192,
    country:   'de',
    logoUrl:   'https://cdn-profiles.tunein.com/s50892/images/logod.jpg',
  },
  {
    name:      'RauteMusik House',
    streamUrl: 'https://house-high.rautemusik.fm/',
    category:  'Dance',
    bitrate:   192,
    country:   'de',
    logoUrl:   'https://cdn-profiles.tunein.com/s51082/images/logod.jpg',
  },
  {
    name:      'KISS FM Dance',
    streamUrl: 'https://stream.kissfm.de/kissfm-dance/mp3-192/internetradio',
    category:  'Dance',
    bitrate:   192,
    country:   'de',
    logoUrl:   'https://cdn-profiles.tunein.com/s310430/images/logod.png',
  },
  {
    name:      'Radio FG',
    streamUrl: 'https://radiofg.impek.com/fg',
    category:  'Dance',
    bitrate:   128,
    country:   'fr',
    logoUrl:   'https://cdn-profiles.tunein.com/s17695/images/logod.jpg',
  },
  {
    name:      'SLAM! FM',
    streamUrl: 'https://stream.slam.nl/slam_mp3',
    category:  'Dance',
    bitrate:   128,
    country:   'nl',
    logoUrl:   'https://cdn-profiles.tunein.com/s67814/images/logod.png',
  },
  {
    name:      'Radio 538',
    streamUrl: 'https://playerservices.streamtheworld.com/api/livestream-redirect/RADIO538.mp3',
    category:  'Dance',
    bitrate:   128,
    country:   'nl',
    logoUrl:   'https://cdn-profiles.tunein.com/s6712/images/logod.png',
  },
  {
    name:      'ENERGY Dance',
    streamUrl: 'https://edge01.streamonkey.net/energy-dance/stream/mp3',
    category:  'Dance',
    bitrate:   128,
    country:   'de',
    logoUrl:   'https://cdn-profiles.tunein.com/s96819/images/logod.jpg',
  },
  {
    name:      'bigFM Dance',
    streamUrl: 'https://stream.bigfm.de/dance/mp3-128/radio-browser',
    category:  'Dance',
    bitrate:   128,
    country:   'de',
    logoUrl:   'https://image.atsw.de/atsw/production/2024-07/bigfm_danceradio_600x600_px.jpg',
  },
  {
    name:      'Radio Record',
    streamUrl: 'https://air.radiorecord.ru:805/rr_320',
    category:  'Dance',
    bitrate:   320,
    country:   'ru',
    logoUrl:   'https://cdn-profiles.tunein.com/s57444/images/logod.jpg',
  },
]

for (const s of stations) {
  await addDoc(collection(db, 'stations'), { ...s, createdAt: serverTimestamp() })
  console.log(`✓  ${s.name} (${s.bitrate} kbps, ${s.country})`)
}

console.log(`\nFærdig — ${stations.length} Dance-stationer tilføjet.`)
process.exit(0)
