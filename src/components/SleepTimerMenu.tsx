import { useState, useEffect, useRef } from 'react'
import { useRadioStore } from '../store/useRadioStore'

const SLEEP_OPTIONS = [10, 20, 30, 60] as const

interface Props {
  accent: string
  // 'sm' = ikon i player-baren, 'lg' = knap med tekst i den store player
  size?: 'sm' | 'lg'
}

export function SleepTimerMenu({ accent, size = 'sm' }: Props) {
  const { sleepTimerEnd, setSleepTimer } = useRadioStore()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const [, setTick] = useState(0)

  // Refresh countdown display every 30s while timer is active
  useEffect(() => {
    if (!sleepTimerEnd) return
    const id = setInterval(() => setTick(t => t + 1), 30_000)
    return () => clearInterval(id)
  }, [sleepTimerEnd])

  // Close menu on outside click
  useEffect(() => {
    if (!open) return
    function onPointerDown(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  const remainingMinutes = sleepTimerEnd
    ? Math.max(0, Math.ceil((sleepTimerEnd - Date.now()) / 60_000))
    : null

  const lg = size === 'lg'
  const itemText = lg ? 'text-sm px-4 py-2' : 'text-[11px] px-3 py-1.5'

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className={lg
          ? 'flex flex-col items-center gap-1 w-16 text-text-muted hover:text-text-primary transition-colors'
          : 'flex items-center gap-1 text-text-muted hover:text-text-primary transition-colors'}
        aria-label="Sleep timer"
      >
        <svg className={lg ? 'w-6 h-6' : 'w-3.5 h-3.5'} style={{ color: sleepTimerEnd ? accent : undefined }} fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-2.98 0-5.4-2.42-5.4-5.4 0-1.81.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z" />
        </svg>
        {lg ? (
          <span className="text-[11px] font-semibold tabular-nums" style={{ color: sleepTimerEnd ? accent : undefined }}>
            {remainingMinutes ? `${remainingMinutes} min` : 'Søvntimer'}
          </span>
        ) : !!remainingMinutes && (
          <span className="text-[10px] font-bold tabular-nums" style={{ color: accent }}>{remainingMinutes}m</span>
        )}
      </button>
      {open && (
        <div className={`absolute bottom-full mb-2 bg-bg-secondary border border-border rounded-xl py-1 shadow-xl z-50 ${
          lg ? 'left-0 min-w-[120px]' : 'right-0 min-w-[90px]'
        }`}>
          <button
            onClick={() => { setSleepTimer(null); setOpen(false) }}
            className={`w-full text-left rounded-lg font-medium transition-colors ${itemText} ${
              !sleepTimerEnd ? 'text-text-primary bg-bg-hover' : 'text-text-muted hover:text-text-primary hover:bg-bg-hover'
            }`}
          >
            Fra
          </button>
          {SLEEP_OPTIONS.map((mins) => (
            <button
              key={mins}
              onClick={() => { setSleepTimer(mins); setOpen(false) }}
              className={`w-full text-left rounded-lg font-medium transition-colors ${itemText} ${
                !!remainingMinutes && Math.abs(remainingMinutes - mins) <= 1 && sleepTimerEnd
                  ? 'text-text-primary bg-bg-hover'
                  : 'text-text-muted hover:text-text-primary hover:bg-bg-hover'
              }`}
            >
              {mins} min
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
