import { useRef, useState } from 'react'
import type { Station } from '../types'
import { useRadioStore } from '../store/useRadioStore'
import { DeleteConfirm } from './DeleteConfirm'
import { deleteStation } from '../firebase/stationsService'
import toast from 'react-hot-toast'
import { CATEGORY_COLORS } from '../utils/categoryColors'

interface Props {
  station: Station
  sortable?: boolean
  onRequestReorder?: () => void
}


function bitrateColor(bitrate: number): string {
  if (bitrate >= 320) return '#4ADE80'
  if (bitrate >= 192) return '#F5A623'
  return '#F87171'
}

function nameSize(name: string): string {
  if (name.length <= 12) return 'text-sm'
  if (name.length <= 15) return 'text-xs'
  if (name.length <= 22) return 'text-[11px]'
  return 'text-[10px]'
}

const LONG_PRESS_MS = 2000
// A stationary hold triggers delete (above); moving the pointer past this many
// pixels during a hold instead opens the reorder list — see BUGS.md BUG-01.
const REORDER_MOVE_THRESHOLD_PX = 8
// Movement is only interpreted as a reorder-drag once the pointer has stayed
// down this long without moving — before that, movement is treated as the
// user scrolling the list and the press is cancelled outright (BUG-17).
const REORDER_ARM_DELAY_MS = 300

export function StationCard({ station, sortable = false, onRequestReorder }: Props) {
  const { currentStation, isPlaying, playStation, favorites, toggleFavorite } = useRadioStore()
  const [showDelete, setShowDelete] = useState(false)
  const [isPressing, setIsPressing] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const armTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reorderArmed = useRef(false)
  const didLongPress = useRef(false)
  const wasDragged = useRef(false)
  const pressStart = useRef<{ x: number; y: number } | null>(null)

  const [hovered, setHovered] = useState(false)

  const isFavorite = favorites.includes(station.id)
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
    if (armTimerRef.current) {
      clearTimeout(armTimerRef.current)
      armTimerRef.current = null
    }
    reorderArmed.current = false
    setIsPressing(false)
  }

  function handlePointerDown(e: React.PointerEvent) {
    if (sortable) {
      pressStart.current = { x: e.clientX, y: e.clientY }
      armTimerRef.current = setTimeout(() => {
        reorderArmed.current = true
      }, REORDER_ARM_DELAY_MS)
    }
    startPress()
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!sortable || !pressStart.current) return
    const dx = e.clientX - pressStart.current.x
    const dy = e.clientY - pressStart.current.y
    if (Math.hypot(dx, dy) > REORDER_MOVE_THRESHOLD_PX) {
      if (!reorderArmed.current) {
        // Moved before the arm delay elapsed — this is a scroll, not a
        // reorder-drag. Cancel the press entirely and let the browser scroll.
        endPress()
        return
      }
      pressStart.current = null
      wasDragged.current = true
      cancelPress()
      onRequestReorder?.()
    }
  }

  function endPress() {
    pressStart.current = null
    cancelPress()
  }

  function handleClick() {
    if (wasDragged.current) { wasDragged.current = false; return }
    if (didLongPress.current) { didLongPress.current = false; return }
    playStation(station)
  }

  return (
    <>
      <div
        className={`relative overflow-hidden rounded-xl border px-4 pt-2 pb-2 select-none transition-all duration-150 ${
          sortable ? 'cursor-grab' : 'cursor-pointer'
        } ${
          isPressing ? 'scale-[0.97] brightness-75' : hovered ? 'scale-[1.02]' : ''
        } ${
          isActive
            ? 'border-accent/60 bg-accent/8'
            : 'border-border bg-bg-card'
        }`}
        style={{
          borderLeftWidth: 3,
          borderLeftColor: isActive || hovered ? accentColor : 'transparent',
          boxShadow: isActive
            ? `0 0 12px ${accentColor}33`
            : hovered ? `0 0 14px ${accentColor}28` : 'none',
          WebkitTouchCallout: 'none',
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => { setHovered(false); endPress() }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endPress}
        onPointerCancel={endPress}
        onContextMenu={(e) => e.preventDefault()}
        onClick={handleClick}
      >
        {/* Favorite heart */}
        <button
          className="absolute top-2 right-2 z-10 p-0.5 transition-transform active:scale-90 text-text-secondary"
          onClick={(e) => { e.stopPropagation(); toggleFavorite(station.id) }}
          onTouchStart={(e) => e.stopPropagation()}
          onTouchEnd={(e) => e.stopPropagation()}
          aria-label={isFavorite ? 'Fjern fra favoritter' : 'Tilføj til favoritter'}
        >
          <svg
            className="w-4 h-4 drop-shadow-sm"
            fill={isFavorite ? '#ef4444' : 'none'}
            stroke={isFavorite ? '#ef4444' : 'currentColor'}
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </button>

        {/* Logo badge — top left */}
        {station.logoUrl && (
          <div className="absolute top-2 left-4 w-11 h-11 rounded-lg overflow-hidden bg-black/30 flex items-center justify-center pointer-events-none">
            <img
              src={station.logoUrl}
              alt=""
              className="w-full h-full object-contain"
              draggable={false}
            />
          </div>
        )}

        {/* Name + category + flag/bitrate */}
        <div className={`pointer-events-none pr-7 ${station.logoUrl ? 'ml-14' : ''}`}>
          <h3 className={`font-display font-semibold text-text-primary leading-tight break-words min-h-[35px] line-clamp-2 ${nameSize(station.name)}`}>
            {station.name}
          </h3>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: accentColor }} />
            <span className="text-xs text-text-muted">{station.category}</span>
            {station.country && (
              <img
                src={`https://flagcdn.com/w40/${station.country}.png`}
                alt={station.country}
                className="w-[18px] rounded-sm shrink-0"
                draggable={false}
              />
            )}
          </div>
          {station.bitrate && (
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: bitrateColor(station.bitrate) }} />
              <span className="text-xs text-text-muted">{station.bitrate} kbps</span>
            </div>
          )}
        </div>

        {/* Equalizer — bottom-right, only when playing */}
        {isCurrentlyPlaying && (
          <div className="absolute bottom-2 right-2 flex items-end gap-0.5 h-3 pointer-events-none">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="w-0.5 rounded-sm animate-pulse"
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
