type AudioCallbacks = {
  onPlaying: () => void
  onWaiting: () => void
  onError: () => void
  onPause?: () => void
}

let _audio: HTMLAudioElement | null = null
let _silentUrl: string | null = null

// Builds a 1-second silent WAV Blob URL used to hold the iOS audio session open while
// the user has "paused". Without this, iOS releases the audio session and routes the next
// AirPods play command to a native app (Spotify, Music) instead of back to us.
export function getSilentUrl(): string {
  if (_silentUrl) return _silentUrl
  const sr = 8000, n = sr  // 1 s @ 8 kHz, mono, 8-bit unsigned PCM
  const buf = new ArrayBuffer(44 + n)
  const v = new DataView(buf), u = new Uint8Array(buf)
  const str = (o: number, t: string) => t.split('').forEach((c, i) => u[o + i] = c.charCodeAt(0))
  str(0, 'RIFF'); v.setUint32(4, 36 + n, true); str(8, 'WAVEfmt ')
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true)
  v.setUint32(24, sr, true); v.setUint32(28, sr, true); v.setUint16(32, 1, true); v.setUint16(34, 8, true)
  str(36, 'data'); v.setUint32(40, n, true); u.fill(128, 44)
  _silentUrl = URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }))
  return _silentUrl
}

// Lazy: creates the Audio element the first time it's called.
// On iOS Safari, Audio must be created within a user gesture to be playable.
export function getOrCreateAudio(callbacks?: AudioCallbacks): HTMLAudioElement {
  if (!_audio) {
    _audio = new Audio()
    if (callbacks) {
      _audio.addEventListener('playing', callbacks.onPlaying)
      _audio.addEventListener('waiting', callbacks.onWaiting)
      _audio.addEventListener('error', callbacks.onError)
      if (callbacks.onPause) _audio.addEventListener('pause', callbacks.onPause)
    }
  }
  return _audio
}
