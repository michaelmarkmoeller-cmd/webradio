import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { db } from './config'

export function subscribeToStationOrder(
  deviceId: string,
  onData: (order: Record<string, string[]>) => void
) {
  return onSnapshot(doc(db, 'stationOrders', deviceId), (snap) => {
    onData(snap.exists() ? (snap.data() as Record<string, string[]>) : {})
  })
}

export async function saveStationOrder(
  deviceId: string,
  category: string,
  orderedIds: string[]
): Promise<void> {
  await setDoc(doc(db, 'stationOrders', deviceId), { [category]: orderedIds }, { merge: true })
}
