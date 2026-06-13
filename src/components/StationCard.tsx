import { useRef, useState, useEffect } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Station } from '../types'
import { useRadioStore } from '../store/useRadioStore'
import { DeleteConfirm } from './DeleteConfirm'
import { deleteStation } from '../firebase/stationsService'
import toast from 'react-hot-toast'

interface Props {
  station: Station
  sortable?: boolean
}

const CATEGORY_COLORS: Record<string, string> = {
  "70's": '#A78BFA',
  "80's": '#F5A623',
  "90's": '#E8679A',
  'Pop':   '#6EC6F5',
  'Rock':  '#A855F7',
  'Dansk': '#4ADE80',
  'Italo': '#F97316',
  'Jul':   '#E8262A',
  'Dance': '#22D3EE',
}

function bitrateColor(bitrate: number): string {
  if (bitrate >= 320) return '#4ADE80'
  if (bitrate >= 192) return '#F5A623'
  return '#F87171'
}

function nameSize(name: string): string {
  if (name.length <= 12) return 'text-sm'
  if (name.length <= 18) return 'text-xs'
  return 'text-[11px]'
}

const LONG_PRESS_MS = 2000

export function StationCard({ station, sortable = false }: Props) {
  const { currentStation, isPlaying, playStation, favorites, toggleFavorite } = useRadioStore()
  const [showDelete, setShowDelete] = useState(false)
  const [isPressing, setIsPressing] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const didLongPress = useRef(false)

  const [hovered, setHovered] = useState(false)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: station.id,
    disabled: !sortable,
  })

  const wasDragged = useRef(false)
  useEffect(() => {
    if (isDragging) {
      wasDragged.current = true
      cancelPress()
    }
  }, [isDragging])
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
    setIsPressing(false)
  }

  function handleClick() {
    if (wasDragged.current) { wasDragged.current = false; return }
    if (didLongPress.current) { didLongPress.current = false; return }
    playStation(station)
  }

  return (
    <>
      <div
        ref={setNodeRef}
        {...(sortable ? listeners : {})}
        {...(sortable ? attributes : {})}
        className={`relative overflow-hidden rounded-xl border px-4 pt-4 pb-4 select-none ${
          isDragging ? '' : 'transition-all duration-150'
        } ${
          sortable ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-pointer'
        } ${
          isDragging ? '' : (isPressing ? 'scale-[0.97] brightness-75' : hovered ? 'scale-[1.02]' : '')
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
          transform: CSS.Transform.toString(transform),
          transition,
          opacity: isDragging ? 0 : 1,
          zIndex: isDragging ? 1 : undefined,
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => { setHovered(false); cancelPress() }}
        onMouseDown={startPress}
        onMouseUp={cancelPress}
        onTouchStart={startPress}
        onTouchEnd={cancelPress}
        onTouchCancel={cancelPress}
        onContextMenu={(e) => e.preventDefault()}
        onClick={handleClick}
      >
        {/* Favorite heart */}
        <button
          className="absolute top-2 right-2 z-10 p-0.5 transition-transform active:scale-90"
          onClick={(e) => { e.stopPropagation(); toggleFavorite(station.id) }}
          onTouchStart={(e) => e.stopPropagation()}
          onTouchEnd={(e) => e.stopPropagation()}
          aria-label={isFavorite ? 'Fjern fra favoritter' : 'Tilføj til favoritter'}
        >
          <svg
            className="w-4 h-4 drop-shadow-sm"
            fill={isFavorite ? '#ef4444' : 'none'}
            stroke={isFavorite ? '#ef4444' : 'rgba(255,255,255,0.4)'}
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </button>

        {/* Logo badge — top left */}
        {station.logoUrl && (
          <div className="absolute top-3 left-4 w-11 h-11 rounded-lg overflow-hidden bg-black/30 flex items-center justify-center pointer-events-none">
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
          <h3 className={`font-display font-semibold text-text-primary leading-tight break-words ${nameSize(station.name)}`}>
            {station.name}
          </h3>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: accentColor }} />
            <span className="text-xs text-text-muted">{station.category}</span>
          </div>
          {(station.bitrate || station.country) && (
            <div className="flex items-center gap-1.5 mt-0.5">
              {station.country && (
                <img
                  src={`https://flagcdn.com/w40/${station.country}.png`}
                  alt={station.country}
                  className="w-[18px] rounded-sm shrink-0"
                  draggable={false}
                />
              )}
              {station.bitrate && (
                <>
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: bitrateColor(station.bitrate) }} />
                  <span className="text-xs text-text-muted">{station.bitrate} kbps</span>
                </>
              )}
              {isCurrentlyPlaying && (
                <div className="flex items-end gap-0.5 h-3 ml-0.5">
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
