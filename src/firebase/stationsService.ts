import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  query,
  writeBatch,
  getDocs,
} from 'firebase/firestore'
import { db } from './config'
import { CATEGORIES } from '../types'
import type { Station, StationFormData, Category } from '../types'

const COLLECTION = 'stations'

const SEED_STATIONS: Omit<Station, 'id'>[] = [
  { name: '80s80s Radio',    streamUrl: 'https://streams.80s80s.de/80s80s/mp3-192/stream.mp3',      category: "80's" },
  { name: 'Underground 80s', streamUrl: 'https://ice5.somafm.com/u80s-256-mp3',                     category: "80's" },
  { name: '90s90s Radio',    streamUrl: 'https://streams.90s90s.de/90s90s/mp3-192/stream.mp3',      category: "90's" },
  { name: '90s Eurodance',   streamUrl: 'https://streams.90s90s.de/eurodance/mp3-192/stream.mp3',   category: "90's" },
  { name: 'Radio SAW 70er',  streamUrl: 'https://stream.radiosaw.de/saw-70er/mp3-192/stream.radiosaw.de/', category: "70's" },
  { name: 'PopTron',         streamUrl: 'https://ice5.somafm.com/poptron-128-mp3',                  category: 'Pop'  },
  { name: 'Rock Antenne',    streamUrl: 'https://stream.rockantenne.de/rockantenne/stream/mp3',      category: 'Rock' },
  { name: 'DR P4 Nordjylland', streamUrl: 'https://live-icy.gss.dr.dk/A/A05H.mp3',                 category: 'Dansk'},
  { name: 'DR P3',           streamUrl: 'https://live-icy.gss.dr.dk/A/A03H.mp3',                   category: 'Dansk'},
]

let seeded = false

export function subscribeToStations(
  onData: (stations: Station[]) => void,
  onError: (error: Error) => void
) {
  const q = query(collection(db, COLLECTION))

  return onSnapshot(
    q,
    async (snapshot) => {
      if (snapshot.metadata.fromCache && snapshot.empty) return

      const stations: Station[] = snapshot.docs.map((doc) => {
        const data = doc.data()
        const cat = data.category as string
        return {
          id: doc.id,
          name: data.name,
          streamUrl: data.streamUrl,
          category: (CATEGORIES.includes(cat as Category) ? cat : CATEGORIES[0]) as Category,
          bitrate: data.bitrate ?? undefined,
          logoUrl: data.logoUrl ?? undefined,
          country: data.country ?? undefined,
          createdAt: data.createdAt?.toDate(),
          sortOrder: data.sortOrder ?? undefined,
        }
      })

      if (stations.length === 0 && !seeded) {
        seeded = true
        seedStations().catch(onError)
        return
      }

      onData(stations)
    },
    onError
  )
}

async function seedStations() {
  const col = collection(db, COLLECTION)
  for (const station of SEED_STATIONS) {
    await addDoc(col, { ...station, createdAt: serverTimestamp() })
  }
}

export async function addStation(data: StationFormData): Promise<void> {
  await addDoc(collection(db, COLLECTION), {
    ...data,
    createdAt: serverTimestamp(),
  })
}

export async function deleteStation(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id))
}

export async function importStations(stations: StationFormData[]): Promise<{ imported: number; skipped: number }> {
  const snapshot = await getDocs(collection(db, COLLECTION))
  const existingUrls = new Set(snapshot.docs.map((d) => d.data().streamUrl as string))

  const fresh = stations.filter((s) => !existingUrls.has(s.streamUrl))
  const skipped = stations.length - fresh.length

  if (fresh.length > 0) {
    const BATCH_SIZE = 499
    for (let i = 0; i < fresh.length; i += BATCH_SIZE) {
      const chunk = fresh.slice(i, i + BATCH_SIZE)
      const batch = writeBatch(db)
      for (const station of chunk) {
        batch.set(doc(collection(db, COLLECTION)), { ...station, createdAt: serverTimestamp() })
      }
      await batch.commit()
    }
  }

  return { imported: fresh.length, skipped }
}

