// Kør med: node add-new-stations.mjs
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from './firebase-init.mjs'

const NEW_STATIONS = [
  // 80's
  { name: 'radio SAW 80er',          streamUrl: 'https://stream.radiosaw.de/saw-80er/mp3-192/stream.radiosaw.de/',         category: "80's" },
  { name: 'radio SAW In The Mix 80er',streamUrl: 'https://stream.radiosaw.de/saw-in-the-mix-80er/mp3-192/stream.radiosaw.de/', category: "80's" },
  { name: '80s80s In The Mix',        streamUrl: 'https://streams.80s80s.de/mix/mp3-192/stream.mp3',                       category: "80's" },
  { name: '80s80s Partyhits',         streamUrl: 'https://streams.80s80s.de/partyhits/mp3-192/stream.mp3',                 category: "80's" },
  { name: '80s80s Maxis',             streamUrl: 'https://streams.80s80s.de/maxis/mp3-192/stream.mp3',                     category: "80's" },
  { name: '80s80s Summerhits',        streamUrl: 'https://streams.80s80s.de/summerhits/mp3-192/stream.mp3',                category: "80's" },
  { name: 'Forever 80',               streamUrl: 'https://stream.laut.fm/forever80',                                       category: "80's" },
  { name: 'Vinyl Maxi FM',            streamUrl: 'https://stream.laut.fm/vinyl-maxi-fm',                                   category: "80's" },
  { name: 'Sky Radio 80s Hits',       streamUrl: 'https://playerservices.streamtheworld.com/api/livestream-redirect/SRGSTR04.mp3', category: "80's" },

  // 90's
  { name: 'radio SAW 90er',           streamUrl: 'https://stream.radiosaw.de/saw-90er/mp3-192/stream.radiosaw.de/',        category: "90's" },
  { name: 'radio SAW In The Mix 90er',streamUrl: 'https://stream.radiosaw.de/saw-in-the-mix-90er/mp3-192/stream.radiosaw.de/', category: "90's" },
  { name: 'Radio 10 90s Hits',        streamUrl: 'https://playerservices.streamtheworld.com/api/livestream-redirect/TLPSTR22.mp3', category: "90's" },

  // Pop
  { name: 'Radio SAW',                streamUrl: 'https://stream.radiosaw.de/saw/mp3-192/stream.radiosaw.de/',             category: 'Pop'  },
  { name: 'radio SAW In The Mix',     streamUrl: 'https://stream.radiosaw.de/saw-in-the-mix/mp3-192/stream.radiosaw.de/', category: 'Pop'  },
  { name: 'Radio SAW 70er',           streamUrl: 'https://stream.radiosaw.de/saw-70er/mp3-192/stream.radiosaw.de/',        category: 'Pop'  },
  { name: '538 Party',                streamUrl: 'https://playerservices.streamtheworld.com/api/livestream-redirect/TLPSTR16.mp3', category: 'Pop' },
  { name: '538 Hitzone',              streamUrl: 'https://playerservices.streamtheworld.com/api/livestream-redirect/TLPSTR11.mp3', category: 'Pop' },
  { name: 'Veronica Top 1000',        streamUrl: 'https://playerservices.streamtheworld.com/api/livestream-redirect/SRGSTR10.mp3', category: 'Pop' },
  { name: 'Radio 10 Top 4000',        streamUrl: 'https://playerservices.streamtheworld.com/api/livestream-redirect/TLPSTR24.mp3', category: 'Pop' },

  // Dansk
  { name: 'Retro Radio',              streamUrl: 'https://streammp3.retro-radio.dk/retro-mp3',                             category: 'Dansk'},
  { name: 'Radio ANR',                streamUrl: 'https://stream.anr.dk/anr',                                              category: 'Dansk'},

  // Italo
  { name: '80s80s Italo Hits',        streamUrl: 'https://streams.80s80s.de/italohits/mp3-192/stream.mp3',                category: 'Italo'},
]

async function run() {
  console.log(`Tilføjer ${NEW_STATIONS.length} stationer til Firestore...\n`)
  for (const s of NEW_STATIONS) {
    await addDoc(collection(db, 'stations'), { ...s, createdAt: serverTimestamp() })
    console.log(`OK  ${s.category.padEnd(6)} ${s.name}`)
  }
  console.log(`\nFærdig! ${NEW_STATIONS.length} stationer tilføjet.`)
  process.exit(0)
}

run().catch(err => { console.error('Fejl:', err.message); process.exit(1) })
