import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  query,
  orderBy,
} from 'firebase/firestore'
import { db } from './config'
import type { Station, StationFormData } from '../types'

const COLLECTION = 'stations'

const SEED_STATIONS: Omit<Station, 'id'>[] = [
  { name: '80s80s Radio', streamUrl: 'https://streams.80s80s.de/80s80s/mp3-192/stream.mp3', category: "80's" },
  { name: 'Radio 80s', streamUrl: 'https://str0.creacast.com/radio80s128', category: "80's" },
  { name: '90s90s Radio', streamUrl: 'https://streams.90s90s.de/90s90s/mp3-192/stream.mp3', category: "90's" },
  { name: 'Radio Nostalgia', streamUrl: 'https://streaming.radio.co/s3f6d17f78/listen', category: "90's" },
  { name: 'Radio Pop FM', streamUrl: 'https://stream.popfm.pl/pop/mp3', category: 'Pop' },
  { name: 'Absolute Radio', streamUrl: 'https://icecast.thisisdax.com/AbsoluteRadioMP3', category: 'Rock' },
  { name: 'Radio Danmark', streamUrl: 'https://live-icy.gss.dr.dk/A/A05H.mp3', category: 'Dansk' },
  { name: 'DR P3', streamUrl: 'https://live-icy.gss.dr.dk/A/A03H.mp3', category: 'Dansk' },
  { name: 'Italo Radio', streamUrl: 'https://streaming.radio.co/s8f2a77f5a/listen', category: 'Italo' },
]

export function subscribeToStations(
  onData: (stations: Station[]) => void,
  onError: (error: Error) => void
) {
  const q = query(collection(db, COLLECTION), orderBy('createdAt', 'asc'))

  return onSnapshot(
    q,
    async (snapshot) => {
      const stations: Station[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        name: doc.data().name,
        streamUrl: doc.data().streamUrl,
        category: doc.data().category,
        createdAt: doc.data().createdAt?.toDate(),
      }))

      if (stations.length === 0) {
        await seedStations()
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
