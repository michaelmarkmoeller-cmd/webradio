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
  })
}

export const useRadioStore = create<RadioStore>((set) => ({
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
    const { volume } = useRadioStore.getState()
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
  },

  togglePlay: () => set((state) => {
    const a = audio()
    if (state.isPlaying) {
      a.pause()
      return { isPlaying: false, isBuffering: false }
    } else {
      a.play().catch(() => {})
      return { isPlaying: true, isBuffering: true }
    }
  }),

  setVolume: (volume) => {
    audio().volume = volume
    set({ volume })
  },

  setCategory: (selectedCategory) => set({ selectedCategory }),
  setLoading: (isLoading) => set({ isLoading }),
}))
