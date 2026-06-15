import { doc, onSnapshot, setDoc, arrayUnion, arrayRemove } from 'firebase/firestore'
import { db } from './config'

export function subscribeFavorites(deviceId: string, onData: (stationIds: string[]) => void) {
  return onSnapshot(doc(db, 'favorites', deviceId), (snap) => {
    const raw = snap.exists() ? snap.data().stationIds : undefined
    onData(Array.isArray(raw) ? raw.filter((id): id is string => typeof id === 'string') : [])
  })
}

export async function toggleFavoriteInFirestore(deviceId: string, stationId: string, add: boolean) {
  const ref = doc(db, 'favorites', deviceId)
  await setDoc(ref, { stationIds: add ? arrayUnion(stationId) : arrayRemove(stationId) }, { merge: true })
}
