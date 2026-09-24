import { useState, useEffect, useRef, type MouseEvent } from 'react'
import toast from 'react-hot-toast'
import { useRadioStore } from '../store/useRadioStore'
import type { Station } from '../types'
import { playOnSonos, setVolumeOnSonos, stopSonos, isHlsStream, SONOS_ROOM_LABELS, type SonosRoom } from '../utils/sonos'

const SONOS_VOLUME_STEP = 5

interface Props {
  station: Station
  // 'sm' = knap i player-baren, 'lg' = knap med tekst i den store player
  size?: 'sm' | 'lg'
}

export function SonosMenu({ station, size = 'sm' }: Props) {
  const { stopPlayback } = useRadioStore()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close menu on outside click
  useEffect(() => {
    if (!open) return
    function onPointerDown(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  const unsupported = isHlsStream(station.streamUrl)
  const lg = size === 'lg'

  async function handleSelect(room: SonosRoom) {
    // Undgå at samme station spiller både lokalt og på Sonos samtidig
    stopPlayback()
    setOpen(false)
    try {
      await playOnSonos(room, station.name, station.streamUrl, station.logoUrl)
      toast.success(`Sendt til Sonos ${SONOS_ROOM_LABELS[room]} — kan tage 5-10 sek.`)
    } catch {
      toast.error(`Kunne ikke sende til Sonos ${SONOS_ROOM_LABELS[room]} — tjek netværk`)
    }
  }

  async function handleVolume(e: MouseEvent, room: SonosRoom, delta: number) {
    e.stopPropagation()
    try {
      await setVolumeOnSonos(room, 'adjust', delta)
    } catch {
      toast.error(`Kunne ikke justere volumen for Sonos ${SONOS_ROOM_LABELS[room]} — tjek netværk`)
    }
  }

  async function handleStop(e: MouseEvent, room: SonosRoom) {
    e.stopPropagation()
    try {
      await stopSonos(room)
      toast.success(`Stoppet Sonos ${SONOS_ROOM_LABELS[room]}`)
    } catch {
      toast.error(`Kunne ikke stoppe Sonos ${SONOS_ROOM_LABELS[room]} — tjek netværk`)
    }
  }

  const icon = (
    <svg className={lg ? 'w-6 h-6' : 'w-5 h-5'} fill="currentColor" viewBox="0 0 24 24">
      <path d="M1 18v3h3c0-1.66-1.34-3-3-3zm0-4v2c2.76 0 5 2.24 5 5h2c0-3.87-3.13-7-7-7zm0-4v2c4.97 0 9 4.03 9 9h2c0-6.08-4.93-11-11-11zM21 3H3c-1.1 0-2 .9-2 2v3h2V5h18v14h-7v2h7c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z" />
    </svg>
  )

  return (
    <div ref={ref} className="relative shrink-0">
      {lg ? (
        <button
          onClick={() => !unsupported && setOpen(v => !v)}
          disabled={unsupported}
          className={`flex flex-col items-center gap-1 w-16 transition-colors ${
            unsupported ? 'text-text-muted/30 cursor-not-allowed' : 'text-text-muted hover:text-text-primary'
          }`}
          aria-label="Afspil på Sonos"
          title={unsupported ? 'Ikke understøttet på Sonos (HLS-stream)' : 'Afspil på Sonos'}
        >
          {icon}
          <span className="text-[11px] font-semibold">Sonos</span>
        </button>
      ) : (
        <button
          onClick={() => !unsupported && setOpen(v => !v)}
          disabled={unsupported}
          className={`w-10 h-10 rounded-full flex items-center justify-center border transition-colors ${
            unsupported
              ? 'border-white/10 text-text-muted/30 cursor-not-allowed'
              : 'border-white/15 text-text-muted hover:text-text-primary hover:border-white/30'
          }`}
          aria-label="Afspil på Sonos"
          title={unsupported ? 'Ikke understøttet på Sonos (HLS-stream)' : 'Afspil på Sonos'}
        >
          {icon}
        </button>
      )}
      {open && (
        <div className="absolute bottom-full right-0 mb-2 bg-bg-secondary border border-border rounded-xl py-1 min-w-[320px] shadow-xl z-50">
          {(['bad', 'koekken', 'stue'] as const).map(room => (
            <div key={room} className="flex items-center gap-2 px-2">
              <button
                onClick={() => handleSelect(room)}
                className="flex-1 text-left px-2 py-2.5 rounded-lg text-[22px] font-medium text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors"
              >
                {SONOS_ROOM_LABELS[room]}
              </button>
              <button
                onClick={() => handleSelect(room)}
                aria-label={`Afspil på Sonos ${SONOS_ROOM_LABELS[room]}`}
                title={`Afspil på Sonos ${SONOS_ROOM_LABELS[room]}`}
                className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center border border-white/15 text-text-primary/80 hover:text-text-primary hover:border-white/30 hover:bg-bg-hover transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </button>
              <button
                onClick={(e) => handleStop(e, room)}
                aria-label={`Stop Sonos ${SONOS_ROOM_LABELS[room]}`}
                title={`Stop Sonos ${SONOS_ROOM_LABELS[room]}`}
                className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center border border-white/15 text-text-primary/80 hover:text-text-primary hover:border-white/30 hover:bg-bg-hover transition-colors"
              >
                <span className="w-3 h-3 bg-current rounded-[1px]" />
              </button>
              <button
                onClick={(e) => handleVolume(e, room, SONOS_VOLUME_STEP)}
                aria-label={`Skru op for ${SONOS_ROOM_LABELS[room]}`}
                title={`Skru op for ${SONOS_ROOM_LABELS[room]}`}
                className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center border border-white/15 text-text-primary/80 hover:text-text-primary hover:border-white/30 hover:bg-bg-hover transition-colors text-lg font-semibold"
              >
                +
              </button>
              <button
                onClick={(e) => handleVolume(e, room, -SONOS_VOLUME_STEP)}
                aria-label={`Skru ned for ${SONOS_ROOM_LABELS[room]}`}
                title={`Skru ned for ${SONOS_ROOM_LABELS[room]}`}
                className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center border border-white/15 text-text-primary/80 hover:text-text-primary hover:border-white/30 hover:bg-bg-hover transition-colors text-lg font-semibold"
              >
                −
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
