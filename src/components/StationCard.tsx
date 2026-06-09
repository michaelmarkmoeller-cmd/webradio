import { useState } from 'react'
import type { Station } from '../types'
import { useRadioStore } from '../store/useRadioStore'
import { DeleteConfirm } from './DeleteConfirm'
import { deleteStation } from '../firebase/stationsService'
import toast from 'react-hot-toast'

interface Props {
  station: Station
}

const CATEGORY_COLORS: Record<string, string> = {
  "80's": '#F5A623',
  "90's": '#E8679A',
  'Pop':   '#6EC6F5',
  'Rock':  '#A855F7',
  'Dansk': '#4ADE80',
  'Italo': '#F97316',
}

export function StationCard({ station }: Props) {
  const { currentStation, isPlaying, playStation } = useRadioStore()
  const [showDelete, setShowDelete] = useState(false)

  const isActive = currentStation?.id === station.id
  const isCurrentlyPlaying = isActive && isPlaying
  const accentColor = CATEGORY_COLORS[station.category] ?? '#F5A623'

  async function handleDelete() {
    try {
      await deleteStation(station.id)
      toast.success(`"${station.name}" slettet`)
    } catch {
      toast.error('Kunne ikke slette stationen')
    }
    setShowDelete(false)
  }

  return (
    <>
      <div
        className={`group relative flex items-center gap-2.5 rounded-lg border px-3 py-2.5 cursor-pointer transition-all duration-150 hover:scale-[1.02] ${
          isActive
            ? 'border-accent/60 bg-accent/8 shadow-sm shadow-accent/20'
            : 'border-border bg-bg-card hover:border-accent/30 hover:bg-bg-hover'
        }`}
        style={isActive ? { borderLeftColor: accentColor, borderLeftWidth: 3 } : { borderLeftWidth: 3, borderLeftColor: 'transparent' }}
        onClick={() => playStation(station)}
      >
        {/* Play/pause button */}
        <div
          className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
            isActive ? 'bg-accent' : 'bg-bg-secondary group-hover:bg-accent/20'
          }`}
        >
          {isCurrentlyPlaying ? (
            <svg className="w-3.5 h-3.5 text-bg-primary" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
            </svg>
          ) : (
            <svg
              className={`w-3.5 h-3.5 ml-0.5 ${isActive ? 'text-bg-primary' : 'text-text-secondary group-hover:text-accent'}`}
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </div>

        {/* Name + category */}
        <div className="flex-1 min-w-0">
          <div className="font-display font-semibold text-sm text-text-primary truncate leading-tight">
            {station.name}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{ backgroundColor: accentColor }}
            />
            <span className="text-xs text-text-muted truncate">{station.category}</span>
          </div>
        </div>

        {/* Live bars */}
        {isCurrentlyPlaying && (
          <div className="flex items-end gap-px h-4 shrink-0">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="w-0.5 rounded-sm animate-pulse"
                style={{
                  height: `${35 + i * 20}%`,
                  backgroundColor: accentColor,
                  animationDelay: `${i * 0.18}s`,
                  animationDuration: `${0.75 + i * 0.12}s`,
                }}
              />
            ))}
          </div>
        )}

        {/* Delete button */}
        <button
          onClick={(e) => { e.stopPropagation(); setShowDelete(true) }}
          className="opacity-0 group-hover:opacity-100 shrink-0 p-1 rounded text-text-muted hover:text-red-400 hover:bg-red-400/10 transition-all"
          aria-label="Slet station"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      {showDelete && (
        <DeleteConfirm
          stationName={station.name}
          onConfirm={handleDelete}
          onCancel={() => setShowDelete(false)}
        />
      )}
    </>
  )
}
