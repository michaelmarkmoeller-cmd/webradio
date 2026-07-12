export type SonosRoom = 'bad' | 'koekken' | 'stue'

export const SONOS_ROOM_LABELS: Record<SonosRoom, string> = {
  bad: 'Bad',
  koekken: 'Køkken',
  stue: 'Stue',
}

// x-rincon-mp3radio:// (brugt af Homeys HomeyScript) understøtter kun Icecast/Shoutcast MP3/AAC, ikke HLS
export function isHlsStream(streamUrl: string): boolean {
  return /\.m3u8(\?|$)/i.test(streamUrl)
}

export async function playOnSonos(room: SonosRoom, stationName: string, streamUrl: string, logoUrl?: string): Promise<void> {
  const base = import.meta.env.VITE_HOMEY_WEBHOOK_BASE
  const tag = `${room}|${stationName.replace(/\|/g, '')}|${streamUrl}|${logoUrl ?? ''}`
  const url = `${base}/playradio?tag=${encodeURIComponent(tag)}`
  await fetch(url, { mode: 'no-cors' })
}

export async function setVolumeOnSonos(room: SonosRoom, mode: 'set' | 'adjust', value: number): Promise<void> {
  const base = import.meta.env.VITE_HOMEY_WEBHOOK_BASE
  const tag = `${room}|${mode}|${value}`
  const url = `${base}/setvolume?tag=${encodeURIComponent(tag)}`
  await fetch(url, { mode: 'no-cors' })
}
