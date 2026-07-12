export async function playOnSonos(stationName: string, streamUrl: string): Promise<void> {
  const base = import.meta.env.VITE_HOMEY_WEBHOOK_BASE
  const tag = `${stationName.replace(/\|/g, '')}|${streamUrl}`
  const url = `${base}/playradio?tag=${encodeURIComponent(tag)}`
  await fetch(url, { mode: 'no-cors' })
}
