import { create } from 'zustand'
import toast from 'react-hot-toast'
import { CATEGORIES } from '../types'
import type { Station, Category } from '../types'
import { getOrCreateAudio } from '../audio'
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
let fadeIntervalId: ReturnType<typeof setInterval> | null = null
let externalPauseListenerAdded = false
let _shouldResume = false

// Returns the singleton Audio element.
// First call (inside a click handler) creates it within the user gesture — required on iOS Safari.
// Event listeners are wired up on first creation only.
function audio() {
  const a = getOrCreateAudio({
    onPlaying: () => useRadioStore.setState({ isBuffering: false }),
    onWaiting: () => useRadioStore.setState({ isBuffering: true }),
    onError:   () => useRadioStore.setState({ isBuffering: false, isPlaying: false }),
  })
  if (!externalPauseListenerAdded) {
    externalPauseListenerAdded = true
    // Sync UI when audio is paused externally (AirPods ear detection, phone call, etc.).
    // Guard: togglePlay() sets isPlaying:false before a.pause(), and playStation() sets it
    // before its internal a.pause() — so isPlaying:true here always means external pause.
    a.addEventListener('pause', () => {
      const { isPlaying, listenAccumulatedMs, listenStartedAt } = useRadioStore.getState()
      if (!isPlaying) return
      // Snapshot accumulated time at the instant of pause so visibilitychange
      // does not double-count time spent with audio paused in background.
      const snapshotMs = listenAccumulatedMs + (listenStartedAt ? Date.now() - listenStartedAt : 0)
      setTimeout(() => {
        if (!a.paused) return                              // Audio resumed — transient pause
        if (document.visibilityState !== 'visible') {
          // Background pause: record elapsed time without flickering isPlaying in UI
          useRadioStore.setState({ listenAccumulatedMs: snapshotMs, listenStartedAt: null })
          return
        }
        const { isPlaying: stillPlaying, currentStation } = useRadioStore.getState()
        if (!stillPlaying) return
        useRadioStore.setState({ isPlaying: false, isBuffering: false, listenStartedAt: null, listenAccumulatedMs: snapshotMs })
        if (currentStation) syncMediaSession(currentStation, false)
      }, 300)
    })

    // Reconcile store vs actual audio state when tab becomes visible again.
    // Handles both directions:
    //   isPlaying:true  + a.paused:true  → iOS killed audio in background → arm click-resume
    //   isPlaying:false + a.paused:false → false-positive pause event → show playing
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState !== 'visible') return
      _shouldResume = false  // Clear any stale flag on every foreground; only re-arm if needed
      const { isPlaying, listenAccumulatedMs, currentStation } = useRadioStore.getState()
      if (isPlaying && a.paused) {
        // listenAccumulatedMs is already correct — background pause handler snapshotted it
        useRadioStore.setState({ isPlaying: false, isBuffering: false, listenStartedAt: null })
        if (currentStation) syncMediaSession(currentStation, false)
        // visibilitychange and touchstart are NOT valid iOS user-gestures for audio.play().
        // 'click' IS. Arm a flag so the next click anywhere in the app resumes playback.
        // The listener runs in bubble phase — after element handlers (togglePlay, playStation)
        // — so it only acts if those haven't already resumed audio themselves.
        _shouldResume = true
      } else if (!isPlaying && !a.paused) {
        useRadioStore.setState({ isPlaying: true, isBuffering: false, listenStartedAt: Date.now(), listenAccumulatedMs })
        if (currentStation) syncMediaSession(currentStation, true)
      }
    })

    // Permanent click listener for iOS post-kill resume. Bubble phase is intentional:
    // element handlers (togglePlay, playStation) fire first; we check state afterwards
    // and only resume if they haven't already done so. The click context is a valid
    // iOS user-gesture, so a.play() succeeds here where visibilitychange cannot.
    document.addEventListener('click', () => {
      if (!_shouldResume) return
      _shouldResume = false
      const { isPlaying, currentStation: station } = useRadioStore.getState()
      if (isPlaying || !station || !a.paused) return  // element handler already resumed
      a.src = station.streamUrl
      a.play()
        .then(() => {
          useRadioStore.setState({ isPlaying: true, isBuffering: true, listenStartedAt: Date.now() })
          syncMediaSession(station, true)
        })
        .catch(() => {})
    })
    // Sync UI when iOS auto-resumes audio after ear detection (fires 'play' on the element).
    // Guard: togglePlay() and playStation() both set isPlaying:true before the 'play' event
    // fires (it's a queued macrotask), so isPlaying:false here always means external resume.
    a.addEventListener('play', () => {
      const { isPlaying, listenAccumulatedMs, currentStation } = useRadioStore.getState()
      if (isPlaying) return
      useRadioStore.setState({ isPlaying: true, isBuffering: true, listenStartedAt: Date.now(), listenAccumulatedMs })
      if (currentStation) syncMediaSession(currentStation, true)
    })
  }
  return a
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
      const { listenAccumulatedMs, listenStartedAt } = useRadioStore.getState()
      const accumulated = listenAccumulatedMs + (listenStartedAt ? Date.now() - listenStartedAt : 0)
      useRadioStore.setState({ isPlaying: false, isBuffering: false, listenStartedAt: null, listenAccumulatedMs: accumulated })
      audio().pause()
    })
    mediaSessionReady = true
  }
  const artwork: MediaImage[] = [
    { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
  ]
  if (station.logoUrl) {
    const ext = station.logoUrl.split('.').pop()?.toLowerCase() ?? ''
    const mimeType = ext === 'svg' ? 'image/svg+xml' : ext === 'webp' ? 'image/webp' : 'image/png'
    artwork.unshift({ src: station.logoUrl, sizes: '256x256', type: mimeType })
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
    const { stationOrder } = get()
    const prevCategoryOrder = stationOrder[category]
    const newOrder = { ...stationOrder, [category]: orderedIds }
    set({ stationOrder: newOrder, stations: sortWithOrder(get().stations, newOrder) })
    saveStationOrder(getDeviceId(), category, orderedIds).catch(() => {
      const { stationOrder: curOrder, stations: curStations } = get()
      const revertedOrder = { ...curOrder }
      if (prevCategoryOrder !== undefined) {
        revertedOrder[category] = prevCategoryOrder
      } else {
        delete revertedOrder[category]
      }
      set({ stationOrder: revertedOrder, stations: sortWithOrder(curStations, revertedOrder) })
      toast.error('Kunne ikke gemme rækkefølge')
    })
  },

  playStation: (station) => {
    const a = audio()
    if (fadeIntervalId) {
      clearInterval(fadeIntervalId)
      fadeIntervalId = null
      try { a.volume = get().volume } catch {}
    }
    const { volume, sleepTimerMinutes, currentStation: prev, listenAccumulatedMs, listenStartedAt, isPlaying: wasPlaying } = get()
    // Reset sleep timer only when switching to a different station
    if (sleepTimerMinutes !== null && prev?.id !== station.id) get().setSleepTimer(sleepTimerMinutes)
    // Reconnect when switching stations, or resuming this same station from paused —
    // live streams can't resume from a buffered position, so a paused stream must always
    // reconnect from "now" (matches togglePlay's resume path below). Skip the reconnect
    // only when already playing this station, to avoid aborting in-progress buffering.
    // Set isPlaying:false before a.pause() so the external-pause listener doesn't misfire.
    if (a.src !== station.streamUrl || !wasPlaying) {
      set({ isPlaying: false })
      a.pause()
      a.src = station.streamUrl
    }
    a.volume = volume
    a.play().catch(() => {
      set({ isPlaying: false, isBuffering: false })
    })
    const isNewStation = prev?.id !== station.id
    const accumulated = isNewStation ? 0 : listenAccumulatedMs + (listenStartedAt ? Date.now() - listenStartedAt : 0)
    try { localStorage.setItem('webradio_last_station_id', station.id) } catch {}
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
      fadeIntervalId = setInterval(() => {
        step++
        try { a.volume = Math.max(0, fromVol * (1 - step / 8)) } catch { /* iOS: volume read-only */ }
        if (step >= 8) {
          clearInterval(fadeIntervalId!)
          fadeIntervalId = null
          a.pause()
          try { a.volume = volume } catch {}
        }
      }, 10)
    } else {
      // Cancel any in-progress fade before resuming
      if (fadeIntervalId) {
        clearInterval(fadeIntervalId)
        fadeIntervalId = null
        try { a.volume = get().volume } catch {}
      }
      // Live streams can't resume from a buffered position — reconnect from "now"
      if (currentStation) a.src = currentStation.streamUrl
      a.play().catch(() => {
        set({ isPlaying: false, isBuffering: false, listenStartedAt: null })
        if (currentStation) syncMediaSession(currentStation, false)
      })
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
