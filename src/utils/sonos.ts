export async function playOnSonos(streamUrl: string): Promise<void> {
  const base = import.meta.env.VITE_HOMEY_WEBHOOK_BASE
  const url = `${base}/playradio?tag=${encodeURIComponent(streamUrl)}`
  await fetch(url, { mode: 'no-cors' })
}
