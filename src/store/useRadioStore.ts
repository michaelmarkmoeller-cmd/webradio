import { create } from 'zustand'
import toast from 'react-hot-toast'
import { CATEGORIES } from '../types'
import type { Station, Category } from '../types'
import { getOrCreateAudio, startKeepalive } from '../audio'
import { isIOS } from '../utils/platform'
import { getDeviceId } from '../utils/deviceId'
import { toggleFavoriteInFirestore } from '../firebase/favoritesService'
import { saveStationOrder } from '../firebase/stationOrderService'

function sortWithOrder(stations: Station[], order: Record<string, string[]>): Station[] {
  return [...stations].sort((a, b) => {
    const catA = CATEGORIES.indexOf(a.category as Category)
    const catB = CATEGORIES.indexOf(b.category as Category)
    if (catA !== catB) return catA - catB
    const posA = (order[a.category] ?? []).indexOf(a.id)
    const posB = (order[b.category] ?? []).indexOf(b.id)
    const oA = posA === -1 ? Infinity : posA
    const oB = posB === -1 ? Infinity : posB
    if (oA !== oB) return oA - oB
    return a.name.localeCompare(b.name, 'da')
  })
}

interface RadioStore {
  stations: Station[]
  currentStation: Station | null
  isPlaying: boolean
  isBuffering: boolean
  volume: number
  selectedCategory: Category | 'All' | 'Favorites'
  isLoading: boolean
  sleepTimerEnd: number | null
  sleepTimerMinutes: number | null
  favorites: string[]
  stationOrder: Record<string, string[]>
  listenAccumulatedMs: number
  listenStartedAt: number | null

  setStations: (stations: Station[]) => void
  setStationOrder: (order: Record<string, string[]>) => void
  reorderCategory: (category: Category, orderedIds: string[]) => void
  playStation: (station: Station) => void
  togglePlay: () => void
  setVolume: (volume: number) => void
  setCategory: (category: Category | 'All' | 'Favorites') => void
  setLoading: (loading: boolean) => void
  setSleepTimer: (minutes: number | null) => void
  setFavorites: (ids: string[]) => void
  toggleFavorite: (stationId: string) => void
}

let sleepTimerInterval: ReturnType<typeof setTimeout> | null = null

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
      if (isIOS) startKeepalive() // iOS only — reactivate audio session if suspended
      if (!useRadioStore.getState().isPlaying) useRadioStore.getState().togglePlay()
    })
    navigator.mediaSession.setActionHandler('pause', () => {
      if (useRadioStore.getState().isPlaying) useRadioStore.getState().togglePlay()
    })
    navigator.mediaSession.setActionHandler('stop', () => {
      const { listenAccumulatedMs, listenStartedAt } = useRadioStore.getState()
      const accumulated = listenAccumulatedMs + (listenStartedAt ? Date.now() - listenStartedAt : 0)
      audio().pause()
      useRadioStore.setState({ isPlaying: false, isBuffering: false, listenStartedAt: null, listenAccumulatedMs: accumulated })
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
  sleepTimerMinutes: null,
  favorites: [],
  stationOrder: {},
  listenAccumulatedMs: 0,
  listenStartedAt: null,

  setStations: (stations) => set((state) => {
    const sorted = sortWithOrder(stations, state.stationOrder)
    if (state.currentStation === null && sorted.length > 0) {
      const lastId = localStorage.getItem('webradio_last_station_id')
      if (lastId) {
        const last = sorted.find(s => s.id === lastId)
        if (last) {
          return {
            stations: sorted,
            isLoading: false,
            currentStation: last,
            selectedCategory: last.category as Category,
          }
        }
      }
    }
    return { stations: sorted, isLoading: false }
  }),

  setStationOrder: (order) => set((state) => ({
    stationOrder: order,
    stations: sortWithOrder(state.stations, order),
  })),

  reorderCategory: (category, orderedIds) => {
    const { stationOrder, stations } = get()
    const newOrder = { ...stationOrder, [category]: orderedIds }
    set({ stationOrder: newOrder, stations: sortWithOrder(stations, newOrder) })
    saveStationOrder(getDeviceId(), category, orderedIds).catch(() => {
      // Revert on failure
      set({ stationOrder, stations: sortWithOrder(stations, stationOrder) })
    })
  },

  playStation: (station) => {
    if (isIOS) startKeepalive() // iOS only — keeps audio session alive while stream is paused
    const a = audio()
    const { volume, sleepTimerMinutes, currentStation: prev, listenAccumulatedMs, listenStartedAt } = get()
    // Reset sleep timer on station change so the full duration applies to the new station
    if (sleepTimerMinutes !== null) get().setSleepTimer(sleepTimerMinutes)
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
    const isNewStation = prev?.id !== station.id
    const accumulated = isNewStation ? 0 : listenAccumulatedMs + (listenStartedAt ? Date.now() - listenStartedAt : 0)
    localStorage.setItem('webradio_last_station_id', station.id)
    set({ currentStation: station, isPlaying: true, isBuffering: true, listenAccumulatedMs: accumulated, listenStartedAt: Date.now() })
    syncMediaSession(station, true)
  },

  togglePlay: () => {
    const { isPlaying, currentStation, listenAccumulatedMs, listenStartedAt } = get()
    const a = audio()
    if (isPlaying) {
      const { volume } = get()
      const accumulated = listenAccumulatedMs + (listenStartedAt ? Date.now() - listenStartedAt : 0)
      set({ isPlaying: false, isBuffering: false, listenStartedAt: null, listenAccumulatedMs: accumulated })
      if (currentStation) syncMediaSession(currentStation, false)
      // Fade volume to zero before pause to avoid audio click artifact
      const fromVol = a.volume
      let step = 0
      const id = setInterval(() => {
        step++
        try { a.volume = Math.max(0, fromVol * (1 - step / 8)) } catch { /* iOS: volume read-only */ }
        if (step >= 8) {
          clearInterval(id)
          a.pause()
          try { a.volume = volume } catch {}
        }
      }, 10)
    } else {
      // Live streams can't resume from a buffered position — reconnect from "now"
      if (currentStation) a.src = currentStation.streamUrl
      a.play().catch(() => {})
      set({ isPlaying: true, isBuffering: true, listenStartedAt: Date.now() })
      if (currentStation) syncMediaSession(currentStation, true)
    }
  },

  setVolume: (volume) => {
    audio().volume = volume
    set({ volume })
  },

  setCategory: (selectedCategory) => set({ selectedCategory }),
  setLoading: (isLoading) => set({ isLoading }),
  setFavorites: (ids) => set({ favorites: ids }),
  toggleFavorite: (stationId) => {
    const { favorites } = get()
    const isFav = favorites.includes(stationId)
    set({ favorites: isFav ? favorites.filter(id => id !== stationId) : [...favorites, stationId] })
    toggleFavoriteInFirestore(getDeviceId(), stationId, !isFav).catch((err) => {
      // Revert optimistic update on failure
      set({ favorites })
      toast.error('Kunne ikke gemme favorit — tjek Firestore-regler')
      console.error('Firestore favorites error:', err)
    })
  },

  setSleepTimer: (minutes) => {
    if (sleepTimerInterval) {
      clearTimeout(sleepTimerInterval)
      sleepTimerInterval = null
    }
    if (minutes === null) {
      set({ sleepTimerEnd: null, sleepTimerMinutes: null })
      return
    }
    const end = Date.now() + minutes * 60_000
    set({ sleepTimerEnd: end, sleepTimerMinutes: minutes })
    sleepTimerInterval = setTimeout(() => {
      sleepTimerInterval = null
      const state = useRadioStore.getState()
      if (state.isPlaying) state.togglePlay()
      set({ sleepTimerEnd: null, sleepTimerMinutes: null })
      toast('Sov godt', { icon: '🌙' })
    }, end - Date.now())
  },
}))
