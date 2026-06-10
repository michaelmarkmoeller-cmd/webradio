import { create } from 'zustand'
import type { Station, Category } from '../types'
import { getOrCreateAudio } from '../audio'

interface RadioStore {
  stations: Station[]
  currentStation: Station | null
  isPlaying: boolean
  isBuffering: boolean
  volume: number
  selectedCategory: Category | 'All'
  isLoading: boolean

  setStations: (stations: Station[]) => void
  playStation: (station: Station) => void
  togglePlay: () => void
  setVolume: (volume: number) => void
  setCategory: (category: Category | 'All') => void
  setLoading: (loading: boolean) => void
}

// Returns the singleton Audio element.
// First call (inside a click handler) creates it within the user gesture — required on iOS Safari.
// Event listeners are wired up on first creation only.
function audio() {
  return getOrCreateAudio({
    onPlaying: () => useRadioStore.setState({ isBuffering: false }),
    onWaiting: () => useRadioStore.setState({ isBuffering: true }),
    onError:   () => useRadioStore.setState({ isBuffering: false, isPlaying: false }),
    // Fires on system-initiated pauses (AirPods disconnected, phone call, audio route change).
    // Keeps our state and mediaSession.playbackState in sync so iOS knows we're paused and
    // routes the next play command back to us instead of another app.
    onPause: () => {
      const { isPlaying, currentStation } = useRadioStore.getState()
      if (isPlaying) {
        useRadioStore.setState({ isPlaying: false, isBuffering: false })
        if (currentStation && 'mediaSession' in navigator)
          navigator.mediaSession.playbackState = 'paused'
      }
    },
  })
}

// Registers WebRadio with the OS media session (lock screen, media keys, headphone buttons).
// Initialized once on first playback; metadata updated on each station change.
let mediaSessionReady = false
function syncMediaSession(station: Station, playing: boolean) {
  if (!('mediaSession' in navigator)) return
  if (!mediaSessionReady) {
    navigator.mediaSession.setActionHandler('play', () => {
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
  navigator.mediaSession.metadata = new MediaMetadata({
    title: station.name,
    artist: 'WebRadio',
    ...(station.logoUrl ? { artwork: [{ src: station.logoUrl }] } : {}),
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

  setStations: (stations) => set({
    stations: [...stations].sort((a, b) => a.name.localeCompare(b.name, 'da')),
    isLoading: false,
  }),

  playStation: (station) => {
    const a = audio() // created within user gesture on first call
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
}))
