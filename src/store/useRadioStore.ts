import { create } from 'zustand'
import toast from 'react-hot-toast'
import { CATEGORIES } from '../types'
import type { Station, Category } from '../types'
import { getOrCreateAudio, startKeepalive } from '../audio'

interface RadioStore {
  stations: Station[]
  currentStation: Station | null
  isPlaying: boolean
  isBuffering: boolean
  volume: number
  selectedCategory: Category | 'All'
  isLoading: boolean
  sleepTimerEnd: number | null

  setStations: (stations: Station[]) => void
  playStation: (station: Station) => void
  togglePlay: () => void
  setVolume: (volume: number) => void
  setCategory: (category: Category | 'All') => void
  setLoading: (loading: boolean) => void
  setSleepTimer: (minutes: number | null) => void
}

let sleepTimerInterval: ReturnType<typeof setInterval> | null = null

// Returns the singleton Audio element.
// First call (inside a click handler) creates it within the user gesture — required on iOS Safari.
// Event listeners are wired up on first creation only.
function audio() {
  return getOrCreateAudio({
    onPlaying: () => useRadioStore.setState({ isBuffering: false }),
    onWaiting: () => useRadioStore.setState({ isBuffering: true }),
    onError:   () => useRadioStore.setState({ isBuffering: false, isPlaying: false }),
  })
}

// Registers WebRadio with the OS media session (lock screen, media keys, headphone buttons).
// Initialized once on first playback; metadata updated on each station change.
let mediaSessionReady = false
function syncMediaSession(station: Station, playing: boolean) {
  if (!('mediaSession' in navigator)) return
  if (!mediaSessionReady) {
    navigator.mediaSession.setActionHandler('play', () => {
      // Restart keepalive first — iOS may have suspended it while locked, making
      // the audio session inactive. Restarting it here (inside a user gesture)
      // reactivates the session so the stream play() call succeeds.
      startKeepalive()
      if (!useRadioStore.getState().isPlaying) useRadioStore.getState().togglePlay()
    })
    navigator.mediaSession.setActionHandler('pause', () => {
      if (useRadioStore.getState().isPlaying) useRadioStore.getState().togglePlay()
    })
    navigator.mediaSession.setActionHandler('stop', () => {
      audio().pause()
      useRadioStore.setState({ isPlaying: false, isBuffering: false })
    })
    mediaSessionReady = true
  }
  const artwork: MediaImage[] = [
    { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
  ]
  if (station.logoUrl) {
    artwork.unshift({ src: station.logoUrl, sizes: '256x256', type: 'image/png' })
  }
  navigator.mediaSession.metadata = new MediaMetadata({
    title: station.name,
    artist: 'WebRadio',
    artwork,
  })
  navigator.mediaSession.playbackState = playing ? 'playing' : 'paused'
}

export const useRadioStore = create<RadioStore>((set, get) => ({
  stations: [],
  currentStation: null,
  isPlaying: false,
  isBuffering: false,
  volume: 0.8,
  selectedCategory: 'All',
  isLoading: true,
  sleepTimerEnd: null,

  setStations: (stations) => set({
    stations: [...stations].sort((a, b) => {
      const catA = CATEGORIES.indexOf(a.category as Category)
      const catB = CATEGORIES.indexOf(b.category as Category)
      if (catA !== catB) return catA - catB
      return a.name.localeCompare(b.name, 'da')
    }),
    isLoading: false,
  }),

  playStation: (station) => {
    startKeepalive() // called inside user gesture — keeps iOS audio session alive while stream is paused
    const a = audio()
    const { volume } = get()
    // Only change src if station is different — avoids aborting in-progress buffering
    if (a.src !== station.streamUrl) {
      a.pause()
      a.src = station.streamUrl
    }
    a.volume = volume
    a.play().catch((err) => {
      if (err.name === 'NotAllowedError') {
        set({ isPlaying: false, isBuffering: false })
      }
    })
    set({ currentStation: station, isPlaying: true, isBuffering: true })
    syncMediaSession(station, true)
  },

  togglePlay: () => {
    const { isPlaying, currentStation } = get()
    const a = audio()
    if (isPlaying) {
      a.pause()
      set({ isPlaying: false, isBuffering: false })
      if (currentStation) syncMediaSession(currentStation, false)
    } else {
      // Live streams can't resume from a buffered position — reconnect from "now"
      if (currentStation) a.src = currentStation.streamUrl
      a.play().catch(() => {})
      set({ isPlaying: true, isBuffering: true })
      if (currentStation) syncMediaSession(currentStation, true)
    }
  },

  setVolume: (volume) => {
    audio().volume = volume
    set({ volume })
  },

  setCategory: (selectedCategory) => set({ selectedCategory }),
  setLoading: (isLoading) => set({ isLoading }),

  setSleepTimer: (minutes) => {
    if (sleepTimerInterval) {
      clearInterval(sleepTimerInterval)
      sleepTimerInterval = null
    }
    if (minutes === null) {
      set({ sleepTimerEnd: null })
      return
    }
    const end = Date.now() + minutes * 60_000
    set({ sleepTimerEnd: end })
    sleepTimerInterval = setInterval(() => {
      const state = useRadioStore.getState()
      if (!state.sleepTimerEnd || Date.now() < state.sleepTimerEnd) return
      clearInterval(sleepTimerInterval!)
      sleepTimerInterval = null
      if (state.isPlaying) state.togglePlay()
      set({ sleepTimerEnd: null })
      toast('Sov godt', { icon: '🌙' })
    }, 10_000)
  },
}))
