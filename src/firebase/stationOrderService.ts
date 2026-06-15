import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { db } from './config'

export function subscribeToStationOrder(
  deviceId: string,
  onData: (order: Record<string, string[]>) => void
) {
  return onSnapshot(doc(db, 'stationOrders', deviceId), (snap) => {
    if (!snap.exists()) { onData({}); return }
    const raw = snap.data()!
    const order: Record<string, string[]> = {}
    for (const [k, v] of Object.entries(raw)) {
      if (Array.isArray(v)) order[k] = v as string[]
    }
    onData(order)
  })
}

export async function saveStationOrder(
  deviceId: string,
  category: string,
  orderedIds: string[]
): Promise<void> {
  await setDoc(doc(db, 'stationOrders', deviceId), { [category]: orderedIds }, { merge: true })
}
