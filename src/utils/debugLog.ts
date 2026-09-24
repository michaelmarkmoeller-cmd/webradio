import { doc, setDoc, arrayUnion } from 'firebase/firestore'
import { db } from '../firebase/config'
import { getDeviceId } from './deviceId'
import { isIOS } from './platform'

// MIDLERTIDIG diagnose-log (23-09-2026): hvad iOS sender ved AirPods ud/ind. Kun iOS.
// Skrives til debugLogs/{deviceId} i Firestore — fjernes igen, når fejlen er fundet.
const buf: string[] = []
let timer: ReturnType<typeof setTimeout> | null = null

export function dlog(msg: string) {
  if (!isIOS) return
  buf.push(`${new Date().toISOString().slice(5, 23)} [${document.visibilityState[0]}] ${msg}`)
  if (!timer) timer = setTimeout(flush, 1500)
}

function flush() {
  timer = null
  const lines = buf.splice(0)
  if (lines.length === 0) return
  setDoc(doc(db, 'debugLogs', getDeviceId()), { lines: arrayUnion(...lines), ua: navigator.userAgent }, { merge: true })
    .catch(() => { buf.unshift(...lines) })
}
