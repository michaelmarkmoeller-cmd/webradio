/**
 * Node.js-side Firestore helper for test data management.
 * Uses the Firestore REST API so we don't depend on browser-side Firebase.
 * Test stations are created/deleted server-side; browser tests only verify the UI.
 */
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

// Load Firebase config from .env
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const envPath = resolve(__dirname, '../.env')
const env = Object.fromEntries(
  readFileSync(envPath, 'utf8')
    .split('\n')
    .filter((l) => l.includes('='))
    .map((l) => {
      const [k, ...v] = l.split('=')
      return [k.trim(), v.join('=').trim()]
    })
)

const API_KEY = env.VITE_FIREBASE_API_KEY
const PROJECT_ID = env.VITE_FIREBASE_PROJECT_ID
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`

function firestoreField(value: string | number | boolean) {
  if (typeof value === 'string') return { stringValue: value }
  if (typeof value === 'number') return { integerValue: String(value) }
  return { booleanValue: value }
}

export async function createTestStation(
  name: string,
  streamUrl: string,
  category = "80's"
): Promise<string> {
  const res = await fetch(`${BASE}/stations?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fields: {
        name: firestoreField(name),
        streamUrl: firestoreField(streamUrl),
        category: firestoreField(category),
      },
    }),
  })
  if (!res.ok) throw new Error(`Firestore create failed: ${res.status} ${await res.text()}`)
  const data = await res.json() as { name: string }
  const parts = data.name.split('/')
  return parts[parts.length - 1] // document ID
}

export async function deleteTestStation(id: string): Promise<void> {
  const res = await fetch(`${BASE}/stations/${id}?key=${API_KEY}`, { method: 'DELETE' })
  if (!res.ok && res.status !== 404)
    throw new Error(`Firestore delete failed: ${res.status} ${await res.text()}`)
}

/**
 * Poll Firestore (max ~30s) until a station with the given name appears.
 * Returns the document ID, or null on timeout.
 */
export async function waitForStationByName(name: string, timeoutMs = 30000): Promise<string | null> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 2000))
    const res = await fetch(`${BASE}/stations?pageSize=300&key=${API_KEY}`)
    if (!res.ok) continue
    type Doc = { name: string; fields: { name?: { stringValue?: string } } }
    const data = await res.json() as { documents?: Doc[] }
    for (const doc of data.documents ?? []) {
      if (doc.fields?.name?.stringValue === name) {
        const parts = doc.name.split('/')
        return parts[parts.length - 1]
      }
    }
  }
  return null
}

/** Delete all stations whose name equals `name` (best-effort, non-throwing). */
export async function cleanupTestStationByName(name: string): Promise<void> {
  try {
    const res = await fetch(`${BASE}/stations?pageSize=300&key=${API_KEY}`)
    if (!res.ok) return
    type FirestoreDoc = { name: string; fields: { name?: { stringValue?: string } } }
    const data = await res.json() as { documents?: FirestoreDoc[] }
    for (const doc of data.documents ?? []) {
      if (doc.fields?.name?.stringValue === name) {
        const parts = doc.name.split('/')
        await deleteTestStation(parts[parts.length - 1]).catch(() => {})
      }
    }
  } catch {
    // Non-fatal
  }
}
