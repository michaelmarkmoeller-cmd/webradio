export type SonosRoom = 'bad' | 'koekken' | 'stue'

export async function playOnSonos(room: SonosRoom, stationName: string, streamUrl: string, logoUrl?: string): Promise<void> {
  const base = import.meta.env.VITE_HOMEY_WEBHOOK_BASE
  const tag = `${room}|${stationName.replace(/\|/g, '')}|${streamUrl}|${logoUrl ?? ''}`
  const url = `${base}/playradio?tag=${encodeURIComponent(tag)}`
  await fetch(url, { mode: 'no-cors' })
}
