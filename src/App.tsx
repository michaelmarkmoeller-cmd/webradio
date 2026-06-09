import { useEffect, useState } from 'react'
import { Toaster } from 'react-hot-toast'
import { subscribeToStations } from './firebase/stationsService'
import { useRadioStore } from './store/useRadioStore'
import { CategoryFilter } from './components/CategoryFilter'
import { StationGrid } from './components/StationGrid'
import { Player } from './components/Player'
import { AddStationModal } from './components/AddStationModal'

export default function App() {
  const { setStations, setLoading, currentStation } = useRadioStore()
  const [showAdd, setShowAdd] = useState(false)

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

  return (
    <div className="min-h-screen bg-bg-primary font-sans text-text-primary">
      <header className="border-b border-border bg-bg-secondary">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="font-display font-bold text-2xl text-text-primary">
            Web<span className="text-accent">Radio</span>
          </h1>
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
      </header>

      <main className={`max-w-5xl mx-auto px-4 py-6 ${currentStation ? 'pb-24' : ''}`}>
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
            background: '#1A1A24',
            color: '#F0F0F5',
            border: '1px solid #2A2A38',
          },
        }}
      />
    </div>
  )
}
