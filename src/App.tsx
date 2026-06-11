import { useEffect, useState } from 'react'
import { isIOS } from './utils/platform'
import { Toaster } from 'react-hot-toast'
import { subscribeToStations } from './firebase/stationsService'
import { useRadioStore } from './store/useRadioStore'
import { CategoryFilter } from './components/CategoryFilter'
import { StationGrid } from './components/StationGrid'
import { Player } from './components/Player'
import { AddStationModal } from './components/AddStationModal'
import { useTheme } from './hooks/useTheme'

export default function App() {
  const { setStations, setLoading, currentStation } = useRadioStore()
  const [showAdd, setShowAdd] = useState(false)
  const { isDark, toggle } = useTheme()

  useEffect(() => {
    const unsubscribe = subscribeToStations(
      (stations) => setStations(stations),
      (error) => {
        console.error('Firestore error:', error)
        setLoading(false)
      }
    )
    return unsubscribe
  }, [])

  // Auto-resume when Bluetooth headphones reconnect (e.g. AirPods picked up from table).
  // A Bluetooth disconnect + reconnect fires two devicechange events in sequence.
  // We treat the second event (within 5 min) as a reconnect and resume playback,
  // so the user doesn't need to press play — the command never reaches us via MediaSession
  // because iOS routes it to a native app before consulting the browser.
  useEffect(() => {
    const md = navigator.mediaDevices
    if (!md?.addEventListener) return

    let pendingReconnect = false
    let timer: ReturnType<typeof setTimeout> | null = null

    const onDeviceChange = () => {
      if (pendingReconnect) {
        if (timer) clearTimeout(timer)
        pendingReconnect = false
        const { isPlaying, currentStation, togglePlay } = useRadioStore.getState()
        if (!isPlaying && currentStation) togglePlay()
      } else {
        pendingReconnect = true
        timer = setTimeout(() => { pendingReconnect = false }, 10_000)
      }
    }

    md.addEventListener('devicechange', onDeviceChange)
    return () => {
      md.removeEventListener('devicechange', onDeviceChange)
      if (timer) clearTimeout(timer)
    }
  }, [])

  return (
    <div className="min-h-screen bg-bg-primary font-sans text-text-primary">
      <header className="border-b border-border bg-bg-secondary">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="font-display font-bold leading-tight">
            <span
              className="block text-2xl"
              style={{
                background: 'linear-gradient(to bottom, #ff3b3b, #ff8c00, #ffe600, #3ddc3d, #2196f3, #7b2ff7)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Michaels
            </span>
            <span className="block text-2xl text-text-primary">
              Web<span className="text-accent">Radio</span>
            </span>
          </h1>
          <div className="flex items-center gap-2">
            <button
              onClick={toggle}
              title={isDark ? 'Skift til lys tilstand' : 'Skift til mørk tilstand'}
              className="p-2 rounded-lg border border-border text-text-secondary hover:text-text-primary hover:border-accent/50 transition-colors"
            >
              {isDark ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-bg-primary font-medium text-sm transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Tilføj station
            </button>
          </div>
        </div>
      </header>

      <main className={`max-w-5xl mx-auto px-4 py-6 ${currentStation ? (isIOS ? 'pb-28' : 'pb-[20vh]') : ''}`}>
        <div className="mb-6">
          <CategoryFilter />
        </div>
        <StationGrid />
      </main>

      <Player />

      {showAdd && <AddStationModal onClose={() => setShowAdd(false)} />}

      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: isDark ? '#1A1A24' : '#FFFFFF',
            color: isDark ? '#F0F0F5' : '#0F0F1A',
            border: isDark ? '1px solid #2A2A38' : '1px solid #DCDCEA',
          },
        }}
      />
    </div>
  )
}
