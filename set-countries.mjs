import { collection, getDocs, doc, updateDoc } from 'firebase/firestore'
import { db } from './firebase-init.mjs'

const countryMap = {
  '1.FM 70s Best':               'ch',
  '80s80s 70er':                 'de',
  'Big 70s Radio':               'de',
  'laut.fm 70er':                'de',
  'Radio 10 60s & 70s':          'nl',
  'Radio SAW 70er':              'de',
  '80s80s In The Mix':           'de',
  '80s80s Maxis':                'de',
  '80s80s Partyhits':            'de',
  '80s80s Radio':                'de',
  '80s80s Summerhits':           'de',
  'Forever 80':                  'de',
  'radio SAW 80er':              'de',
  'radio SAW In The Mix 80er':   'de',
  'RadioMonster 80s':            'fr',
  'Sky Radio 80s Hits':          'nl',
  'Underground 80s':             'us',
  'Vinyl Maxi FM':               'de',
  '90s Eurodance':               'de',
  '90s90s Radio':                'de',
  'Radio 10 90s Hits':           'nl',
  'radio SAW 90er':              'de',
  'radio SAW In The Mix 90er':   'de',
  'RadioMonster 90s':            'fr',
  'DR P3':                       'dk',
  'DR P4 Nordjylland':           'dk',
  'Limfjord Mix':                'dk',
  'Radio ANR':                   'dk',
  'Radio Limfjord':              'dk',
  'Radio Nord':                  'dk',
  'Retro Radio':                 'dk',
  '80s80s Italo Hits':           'de',
  '80s80s Italo Mix':            'de',
  '95.5 Charivari Italo-Hits':   'de',
  'DanceClassics Italo Disco':   'be',
  'R.SA Italo Disco Hits':       'de',
  'Radio Stad Den Haag':         'nl',
  'RdMix Italo Disco 80s':       'it',
  'Synthetic FM':                'it',
  '80s80s Xmas':                 'de',
  'Antenne Bayern Weihnachten':  'de',
  'Christmas Vinyl HD':          'no',
  'Klassik Radio Christmas':     'de',
  'Sky Radio Christmas':         'nl',
  '538 Hitzone':                 'nl',
  '538 Party':                   'nl',
  'PopTron':                     'us',
  'Radio 10 Top 4000':           'nl',
  'Radio SAW':                   'de',
  'radio SAW In The Mix':        'de',
  'RadioMonster Dance':          'fr',
  'RadioMonster Tophits':        'fr',
  'Veronica Top 1000':           'nl',
  'Radio BOB!':                  'de',
  'Radio BOB! Classic Rock':     'de',
  'RadioMonster Rock':           'fr',
  'Rock Antenne':                'de',
  'Rock Antenne Classic Perlen': 'de',
  'Rock Antenne Heavy Metal':    'de',
  'SomaFM Metal Detector':       'us',
}

const snap = await getDocs(collection(db, 'stations'))

let updated = 0, skipped = 0, unknown = 0

for (const docSnap of snap.docs) {
  const name = docSnap.data().name
  const country = countryMap[name]
  if (country) {
    await updateDoc(doc(db, 'stations', docSnap.id), { country })
    console.log(`✅ ${name} → ${country}`)
    updated++
  } else {
    console.log(`❓ Ingen mapping for: "${name}"`)
    unknown++
  }
}

console.log(`\nFærdig: ${updated} opdateret, ${skipped} sprunget over, ${unknown} ukendte`)
