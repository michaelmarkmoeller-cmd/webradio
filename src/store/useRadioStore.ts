import { create } from 'zustand'
import type { Station, Category } from '../types'

interface RadioStore {
  stations: Station[]
  currentStation: Station | null
  isPlaying: boolean
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

export const useRadioStore = create<RadioStore>((set) => ({
  stations: [],
  currentStation: null,
  isPlaying: false,
  volume: 0.8,
  selectedCategory: 'All',
  isLoading: true,

  setStations: (stations) => set({
    stations: [...stations].sort((a, b) => a.name.localeCompare(b.name, 'da')),
    isLoading: false,
  }),

  playStation: (station) =>
    set({ currentStation: station, isPlaying: true }),

  togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),

  setVolume: (volume) => set({ volume }),

  setCategory: (selectedCategory) => set({ selectedCategory }),

  setLoading: (isLoading) => set({ isLoading }),
}))
