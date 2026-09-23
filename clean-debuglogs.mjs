// Midlertidigt: sletter debugLogs skrevet af Playwright (iOS 18_0-testbrowser) — rører ikke Michaels iPhone-log
import { db } from './firebase-init.mjs'
import { collection, getDocs, deleteDoc } from 'firebase/firestore'
const snap = await getDocs(collection(db, 'debugLogs'))
let n = 0
for (const d of snap.docs) {
  if ((d.data().ua ?? '').includes('iPhone OS 18_0')) { await deleteDoc(d.ref); n++ } else console.log('beholdt', d.id, d.data().ua)
}
console.log('slettet', n, 'af', snap.size)
process.exit(0)
