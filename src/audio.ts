type AudioCallbacks = {
  onPlaying: () => void
  onWaiting: () => void
  onError: () => void
}

let _audio: HTMLAudioElement | null = null

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

let _silentUrl: string | null = null

// Næsten-stilhed til lydløs pause på iOS: 2 sek. mono 16-bit WAV med ±1 LSB støj (ca. −90 dBFS —
// langt under hørbar grænse, ingen tone og derfor intet subwoofer-brum). Ikke ren digital stilhed,
// så iOS ser elementet som afspillende. Genereres lokalt én gang — ingen netværk.
export function getSilentLoopUrl(): string {
  if (_silentUrl) return _silentUrl
  const rate = 22050, n = rate * 2
  const buf = new DataView(new ArrayBuffer(44 + n * 2))
  const str = (o: number, s: string) => { for (let i = 0; i < s.length; i++) buf.setUint8(o + i, s.charCodeAt(i)) }
  str(0, 'RIFF'); buf.setUint32(4, 36 + n * 2, true); str(8, 'WAVE')
  str(12, 'fmt '); buf.setUint32(16, 16, true); buf.setUint16(20, 1, true); buf.setUint16(22, 1, true)
  buf.setUint32(24, rate, true); buf.setUint32(28, rate * 2, true); buf.setUint16(32, 2, true); buf.setUint16(34, 16, true)
  str(36, 'data'); buf.setUint32(40, n * 2, true)
  for (let i = 0; i < n; i++) buf.setInt16(44 + i * 2, Math.round(Math.random() * 2 - 1), true)
  _silentUrl = URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }))
  return _silentUrl
}

let _bridge: HTMLAudioElement | null = null

// FORSØG 24-09-2026 (AirPods ud → headset-PLAY med låst skærm): ekstra element med stilhedsløkken,
// der holder siden "afspillende", mens radiostreamen kobler på det normale element. Låses op
// (lydløst play → pause) i det første klik, så iOS senere tillader play() uden for et klik.
export function getBridgeAudio(): HTMLAudioElement {
  if (!_bridge) {
    _bridge = new Audio()
    _bridge.src = getSilentLoopUrl()
    _bridge.loop = true
    _bridge.muted = true
    _bridge.play().then(() => _bridge!.pause()).catch(() => {}).finally(() => { _bridge!.muted = false })
  }
  return _bridge
}
