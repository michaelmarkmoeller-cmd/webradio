type AudioCallbacks = {
  onPlaying: () => void
  onWaiting: () => void
  onError: () => void
}

let _audio: HTMLAudioElement | null = null
let _keepalive: HTMLAudioElement | null = null
let _silentUrl: string | null = null

function buildKeepaliveUrl(): string {
  const sr = 8000, n = sr  // 1 s @ 8 kHz, mono, 8-bit unsigned PCM
  const buf = new ArrayBuffer(44 + n)
  const v = new DataView(buf), u = new Uint8Array(buf)
  const s = (o: number, t: string) => t.split('').forEach((c, i) => u[o + i] = c.charCodeAt(0))
  s(0, 'RIFF'); v.setUint32(4, 36 + n, true); s(8, 'WAVEfmt ')
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true)
  v.setUint32(24, sr, true); v.setUint32(28, sr, true); v.setUint16(32, 1, true); v.setUint16(34, 8, true)
  s(36, 'data'); v.setUint32(40, n, true)
  // 1 Hz sine: below the 20 Hz human hearing threshold → truly inaudible at any
  // volume. Exactly 1 complete cycle fits in 8000 samples → both endpoints
  // quantise to 128 (silence) → seamless loop, zero clicks. iOS does not
  // classify sub-20 Hz content as silence, so the audio session stays alive.
  for (let i = 0; i < n; i++) u[44 + i] = 128 + Math.round(Math.sin(2 * Math.PI * i / n))
  return URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }))
}

// Must be called once inside a user-gesture handler (e.g. first tap to play).
// Loops a silent WAV to keep the iOS audio session alive while the stream is
// paused, so WebRadio stays "Now Playing" on the lock screen.
export function startKeepalive(): void {
  if (!_keepalive) {
    _silentUrl = _silentUrl ?? buildKeepaliveUrl()
    _keepalive = new Audio()
    _keepalive.src = _silentUrl
    _keepalive.loop = true
    _keepalive.volume = 1.0
  }
  if (_keepalive.paused) _keepalive.play().catch(() => {})
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
    }
  }
  return _audio
}
