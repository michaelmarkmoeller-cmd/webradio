// Midlertidigt: viser debugLogs (diagnose af AirPods ud/ind)
import { db } from './firebase-init.mjs'
import { collection, getDocs } from 'firebase/firestore'
const snap = await getDocs(collection(db, 'debugLogs'))
for (const d of snap.docs) { console.log('==', d.id); for (const l of [...d.data().lines].sort()) console.log(l) }
process.exit(0)
