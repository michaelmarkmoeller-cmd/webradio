import { useRef, useState } from 'react'
import type { Station } from '../types'
import { useRadioStore } from '../store/useRadioStore'
import { DeleteConfirm } from './DeleteConfirm'
import { deleteStation } from '../firebase/stationsService'
import toast from 'react-hot-toast'

interface Props {
  station: Station
}

const CATEGORY_COLORS: Record<string, string> = {
  "70's": '#A78BFA',
  "80's": '#F5A623',
  "90's": '#E8679A',
  'Pop':   '#6EC6F5',
  'Rock':  '#A855F7',
  'Dansk': '#4ADE80',
  'Italo': '#F97316',
}

function nameSize(name: string): string {
  if (name.length <= 12) return 'text-sm'
  if (name.length <= 18) return 'text-xs'
  return 'text-[11px]'
}

const LONG_PRESS_MS = 2000

export function StationCard({ station }: Props) {
  const { currentStation, isPlaying, playStation } = useRadioStore()
  const [showDelete, setShowDelete] = useState(false)
  const [isPressing, setIsPressing] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const didLongPress = useRef(false)

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

  function startPress() {
    didLongPress.current = false
    setIsPressing(true)
    timerRef.current = setTimeout(() => {
      didLongPress.current = true
      setIsPressing(false)
      setShowDelete(true)
    }, LONG_PRESS_MS)
  }

  function cancelPress() {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    setIsPressing(false)
  }

  function handleClick() {
    if (didLongPress.current) {
      didLongPress.current = false
      return
    }
    playStation(station)
  }

  return (
    <>
      <div
        className={`relative rounded-xl border p-4 cursor-pointer select-none transition-all duration-150 ${
          isPressing ? 'scale-[0.97] brightness-75' : 'hover:scale-[1.02]'
        } ${
          isActive
            ? 'border-accent/60 bg-accent/8 shadow-sm shadow-accent/20'
            : 'border-border bg-bg-card hover:border-accent/30 hover:bg-bg-hover'
        }`}
        style={{
          borderLeftWidth: 3,
          borderLeftColor: isActive ? accentColor : 'transparent',
          WebkitTouchCallout: 'none',
        }}
        onMouseDown={startPress}
        onMouseUp={cancelPress}
        onMouseLeave={cancelPress}
        onTouchStart={startPress}
        onTouchEnd={cancelPress}
        onTouchCancel={cancelPress}
        onContextMenu={(e) => e.preventDefault()}
        onClick={handleClick}
      >
        {/* Name + category */}
        <div className="mb-3">
          <h3 className={`font-display font-semibold text-text-primary leading-tight break-words ${nameSize(station.name)}`}>
            {station.name}
          </h3>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: accentColor }} />
            <span className="text-xs text-text-muted">{station.category}</span>
          </div>
        </div>

        {/* Live bars when playing */}
        <div className="h-5 flex items-end">
          {isCurrentlyPlaying && (
            <div className="flex items-end gap-0.5 h-full">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="w-1 rounded-sm animate-pulse"
                  style={{
                    height: `${40 + i * 15}%`,
                    backgroundColor: accentColor,
                    animationDelay: `${i * 0.15}s`,
                    animationDuration: `${0.8 + i * 0.1}s`,
                  }}
                />
              ))}
            </div>
          )}
        </div>
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
