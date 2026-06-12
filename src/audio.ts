type AudioCallbacks = {
  onPlaying: () => void
  onWaiting: () => void
  onError: () => void
}

let _audio: HTMLAudioElement | null = null
let _keepalive: HTMLAudioElement | null = null
let _silentUrl: string | null = null

function buildKeepaliveUrl(): string {
  const sr = 44100, n = sr  // 1 s @ 44.1 kHz, mono, 16-bit signed PCM
  const byteSize = n * 2
  const buf = new ArrayBuffer(44 + byteSize)
  const v = new DataView(buf), u = new Uint8Array(buf)
  const wr = (o: number, t: string) => t.split('').forEach((c, i) => u[o + i] = c.charCodeAt(0))
  wr(0, 'RIFF'); v.setUint32(4, 36 + byteSize, true); wr(8, 'WAVEfmt ')
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true)
  v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true)
  v.setUint16(32, 2, true); v.setUint16(34, 16, true)
  wr(36, 'data'); v.setUint32(40, byteSize, true)
  // 18 Hz × 18 complete cycles in 44100 samples → both loop endpoints = 0, seamless loop.
  // 16-bit at native iOS sample rate (no resampling) → no quantisation step artifacts.
  // Amplitude 100/32767 ≈ −50 dB — inaudible at 18 Hz, not classified as silence by iOS.
  for (let i = 0; i < n; i++) {
    v.setInt16(44 + i * 2, Math.round(100 * Math.sin(2 * Math.PI * 18 * i / n)), true)
  }
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
