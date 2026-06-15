import { useEffect, useState } from 'react'
import { isIOS } from './utils/platform'
import { Toaster } from 'react-hot-toast'
import { subscribeToStations } from './firebase/stationsService'
import { subscribeFavorites } from './firebase/favoritesService'
import { subscribeToStationOrder } from './firebase/stationOrderService'
import { getDeviceId } from './utils/deviceId'
import { useRadioStore } from './store/useRadioStore'
import { CategoryFilter } from './components/CategoryFilter'
import { StationGrid } from './components/StationGrid'
import { Player } from './components/Player'
import { AddStationModal } from './components/AddStationModal'
import { ImportExportModal } from './components/ImportExportModal'
import { useTheme } from './hooks/useTheme'

export default function App() {
  const { setStations, setLoading, setFavorites, setStationOrder, currentStation } = useRadioStore()
  const [showAdd, setShowAdd] = useState(false)
  const [showImportExport, setShowImportExport] = useState(false)
  const [showGuide, setShowGuide] = useState(false)

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return
      if (e.data === 'close-guide') setShowGuide(false)
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])
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

  useEffect(() => {
    const deviceId = getDeviceId()
    return subscribeFavorites(deviceId, (ids) => setFavorites(ids))
  }, [])

  useEffect(() => {
    const deviceId = getDeviceId()
    return subscribeToStationOrder(deviceId, (order) => setStationOrder(order))
  }, [])

  // Pause on device disconnect (e.g. leaving CarPlay/car). If a reconnect arrives
  // within 10 sec (e.g. AirPods briefly disconnected), auto-resume. Otherwise the
  // stream stays paused and must be restarted manually.
  useEffect(() => {
    const md = navigator.mediaDevices
    if (!md?.addEventListener) return

    let pendingReconnect = false
    let wasPlayingAtDisconnect = false
    let timer: ReturnType<typeof setTimeout> | null = null
    let disconnectAt = 0

    const onDeviceChange = () => {
      if (pendingReconnect) {
        // Events within 150ms of disconnect are noise from the same device-change batch,
        // not a genuine reconnect (guards against two rapid disconnects resuming audio).
        if (Date.now() - disconnectAt < 150) return
        // Reconnect within window (e.g. AirPods) — resume only if we auto-paused
        if (timer) clearTimeout(timer)
        pendingReconnect = false
        const { isPlaying, currentStation, togglePlay } = useRadioStore.getState()
        if (!isPlaying && currentStation && wasPlayingAtDisconnect) togglePlay()
      } else {
        // Disconnect — pause immediately so music stops when leaving CarPlay/car
        disconnectAt = Date.now()
        const { isPlaying, togglePlay } = useRadioStore.getState()
        wasPlayingAtDisconnect = isPlaying
        if (isPlaying) togglePlay()
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
              onClick={() => setShowGuide(true)}
              title="Brugervejledning"
              className="p-2 rounded-lg border border-border text-text-secondary hover:text-text-primary hover:border-accent/50 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332-.477-4.5-1.253" />
              </svg>
            </button>
            <button
              onClick={() => setShowImportExport(true)}
              title="Import / Eksport stationer"
              className="p-2 rounded-lg border border-border text-text-secondary hover:text-text-primary hover:border-accent/50 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
            </button>
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
      {showImportExport && <ImportExportModal onClose={() => setShowImportExport(false)} />}

      {showGuide && (
        <div className="fixed inset-0 z-50 flex flex-col bg-bg-primary">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-bg-secondary shrink-0">
            <span className="font-semibold text-text-primary">Brugervejledning</span>
            <button
              onClick={() => setShowGuide(false)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-card transition-colors text-sm font-medium"
              aria-label="Luk"
            >
              Luk
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <iframe
            src="/guide/"
            className="flex-1 w-full border-0"
            title="Brugervejledning"
          />
        </div>
      )}

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
