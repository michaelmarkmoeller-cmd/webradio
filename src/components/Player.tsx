import { useState, useEffect, useRef } from 'react'
import { useRadioStore } from '../store/useRadioStore'
import { isIOS } from '../utils/platform'
import { CATEGORY_COLORS } from '../utils/categoryColors'
import { playOnSonos } from '../utils/sonos'

const SLEEP_OPTIONS = [10, 20, 30, 60] as const

function formatListenTime(sec: number): string {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  if (h > 0) return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}


export function Player() {
  const { currentStation, isPlaying, isBuffering, volume, togglePlay, setVolume, sleepTimerEnd, setSleepTimer, listenAccumulatedMs, listenStartedAt } = useRadioStore()
  const [meta, setMeta] = useState<{ title: string | null; genre: string | null }>({ title: null, genre: null })
  const [sleepMenuOpen, setSleepMenuOpen] = useState(false)
  const sleepMenuRef = useRef<HTMLDivElement>(null)
  const icySupportedRef = useRef<boolean | null>(null)
  const [, setTick] = useState(0)
  const [, setListenTick] = useState(0)

  useEffect(() => {
    icySupportedRef.current = null
    if (!currentStation || !isPlaying) {
      setMeta({ title: null, genre: null })
      return
    }
    let cancelled = false
    const controller = new AbortController()
    async function fetchMeta() {
      if (icySupportedRef.current === false) return
      try {
        const res = await fetch(
          `/api/icy-meta?url=${encodeURIComponent(currentStation!.streamUrl)}`,
          { signal: controller.signal }
        )
        if (!res.ok) return
        const data = await res.json()
        if (cancelled) return
        if (data.icySupported === false) { icySupportedRef.current = false; return }
        icySupportedRef.current = true
        setMeta({ title: data.title ?? null, genre: data.genre ?? null })
      } catch { }
    }
    fetchMeta()
    const interval = setInterval(fetchMeta, 30000)
    return () => { cancelled = true; controller.abort(); clearInterval(interval) }
  }, [currentStation?.id, isPlaying])

  // Refresh countdown display every 30s while timer is active
  useEffect(() => {
    if (!sleepTimerEnd) return
    const id = setInterval(() => setTick(t => t + 1), 30_000)
    return () => clearInterval(id)
  }, [sleepTimerEnd])

  // 1s tick to keep listen timer display up to date
  useEffect(() => {
    if (!isPlaying) return
    const id = setInterval(() => setListenTick(t => t + 1), 1000)
    return () => clearInterval(id)
  }, [isPlaying])

  // Close sleep menu on outside click
  useEffect(() => {
    if (!sleepMenuOpen) return
    function onPointerDown(e: PointerEvent) {
      if (sleepMenuRef.current && !sleepMenuRef.current.contains(e.target as Node))
        setSleepMenuOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [sleepMenuOpen])

  const remainingMinutes = sleepTimerEnd
    ? Math.max(0, Math.ceil((sleepTimerEnd - Date.now()) / 60_000))
    : null

  if (!currentStation) return null

  const accent = CATEGORY_COLORS[currentStation.category] ?? '#F5A623'

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-40 bg-bg-secondary flex flex-col px-5 ${
        isIOS ? 'gap-3 py-4' : 'h-[20vh] justify-between pt-3 pb-4'
      }`}
      style={{ borderTop: `1px solid ${accent}50` }}
    >
      {/* Accent stripe */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px]"
        style={{ background: `linear-gradient(to right, ${accent}, ${accent}30 70%, transparent)` }}
      />

      {/* Row 1 — NOW PLAYING + status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {isPlaying && !isBuffering ? (
            <div className="flex items-end gap-[2px] h-3 mr-0.5">
              {[0.6, 1, 0.75, 0.9].map((h, i) => (
                <div
                  key={i}
                  className="w-[3px] rounded-full animate-pulse"
                  style={{
                    height: `${h * 100}%`,
                    backgroundColor: accent,
                    animationDelay: `${i * 0.18}s`,
                    animationDuration: `${0.7 + i * 0.1}s`,
                  }}
                />
              ))}
            </div>
          ) : (
            <svg className="w-3 h-3 text-text-muted" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
            </svg>
          )}
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">Now Playing</span>
        </div>
        <div className="flex items-center gap-3">
          {/* Sleep timer */}
          <div ref={sleepMenuRef} className="relative">
            <button
              onClick={() => setSleepMenuOpen(v => !v)}
              className="flex items-center gap-1 text-text-muted hover:text-text-primary transition-colors"
              aria-label="Sleep timer"
            >
              <svg className="w-3.5 h-3.5" style={{ color: sleepTimerEnd ? accent : undefined }} fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-2.98 0-5.4-2.42-5.4-5.4 0-1.81.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z" />
              </svg>
              {!!remainingMinutes && (
                <span className="text-[10px] font-bold tabular-nums" style={{ color: accent }}>{remainingMinutes}m</span>
              )}
            </button>
            {sleepMenuOpen && (
              <div className="absolute bottom-full right-0 mb-2 bg-[#1a1a24] border border-white/10 rounded-xl py-1 min-w-[90px] shadow-xl z-50">
                <button
                  onClick={() => { setSleepTimer(null); setSleepMenuOpen(false) }}
                  className={`w-full text-left px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${
                    !sleepTimerEnd ? 'text-text-primary bg-white/5' : 'text-text-muted hover:text-text-primary hover:bg-white/5'
                  }`}
                >
                  Fra
                </button>
                {SLEEP_OPTIONS.map((mins) => (
                  <button
                    key={mins}
                    onClick={() => { setSleepTimer(mins); setSleepMenuOpen(false) }}
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${
                      !!remainingMinutes && Math.abs(remainingMinutes - mins) <= 1 && sleepTimerEnd
                        ? 'text-text-primary bg-white/5'
                        : 'text-text-muted hover:text-text-primary hover:bg-white/5'
                    }`}
                  >
                    {mins} min
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Live / Forbinder status */}
          {isBuffering ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-yellow-400">Forbinder</span>
            </>
          ) : isPlaying ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-red-400">Live</span>
              <span className="text-[10px] tabular-nums text-red-400">
                {formatListenTime(Math.floor((listenAccumulatedMs + (listenStartedAt ? Date.now() - listenStartedAt : 0)) / 1000))}
              </span>
            </>
          ) : null}
        </div>
      </div>

      {/* Row 2 — Volume (skjult på iOS: audio.volume er read-only i WebKit) */}
      {!isIOS && (
        <div className="flex items-center gap-3">
          <svg className="w-4 h-4 text-text-muted shrink-0" fill="currentColor" viewBox="0 0 24 24">
            <path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z" />
          </svg>
          <input
            type="range"
            min={0}
            max={1}
            step={0.02}
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="flex-1 cursor-pointer"
            style={{ accentColor: accent }}
            aria-label="Lydstyrke"
          />
          <svg className="w-4 h-4 text-text-muted shrink-0" fill="currentColor" viewBox="0 0 24 24">
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
          </svg>
        </div>
      )}

      {/* Row 3 — Logo + station info + play button */}
      <div className="flex items-center gap-4">
        {/* Logo */}
        {currentStation.logoUrl ? (
          <img
            src={currentStation.logoUrl}
            alt={currentStation.name}
            className="h-12 w-12 rounded-xl object-cover shrink-0"
            style={{ boxShadow: `0 4px 16px ${accent}40` }}
          />
        ) : (
          <div
            className="h-12 w-12 rounded-xl shrink-0 flex items-center justify-center"
            style={{ backgroundColor: accent + '22' }}
          >
            <svg className="w-6 h-6" style={{ color: accent }} fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
            </svg>
          </div>
        )}

        {/* Station info */}
        <div className="flex-1 min-w-0">
          <div className="font-display font-bold text-base text-text-primary truncate leading-tight">
            {currentStation.name}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span
              className="text-[11px] font-semibold px-2 py-0.5 rounded-full leading-none"
              style={{ backgroundColor: accent + '25', color: accent }}
            >
              {currentStation.category}
            </span>
            {currentStation.bitrate && (
              <span className="text-[11px] text-text-muted">{currentStation.bitrate} kbps</span>
            )}
          </div>
          {meta.title && (
            <div className="flex items-center gap-1 mt-1 min-w-0">
              <svg className="w-3 h-3 shrink-0" style={{ color: accent }} fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
              </svg>
              <span className="text-[11px] text-text-muted truncate">{meta.title}</span>
            </div>
          )}
          {meta.genre && (
            <div className="flex items-center gap-1 mt-0.5 min-w-0">
              <svg className="w-3 h-3 shrink-0 text-text-muted/50" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" />
              </svg>
              <span className="text-[10px] text-text-muted/60 truncate">{meta.genre}</span>
            </div>
          )}
        </div>

        {/* Sonos cast */}
        <button
          onClick={() => playOnSonos(currentStation.name, currentStation.streamUrl, currentStation.logoUrl)}
          className="w-10 h-10 rounded-full flex items-center justify-center border border-white/15 text-text-muted hover:text-text-primary hover:border-white/30 transition-colors shrink-0"
          aria-label="Afspil på Sonos"
          title="Afspil på Sonos"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M1 18v3h3c0-1.66-1.34-3-3-3zm0-4v2c2.76 0 5 2.24 5 5h2c0-3.87-3.13-7-7-7zm0-4v2c4.97 0 9 4.03 9 9h2c0-6.08-4.93-11-11-11zM21 3H3c-1.1 0-2 .9-2 2v3h2V5h18v14h-7v2h7c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z" />
          </svg>
        </button>

        {/* Play / Pause */}
        <button
          onClick={togglePlay}
          className="w-12 h-12 rounded-full flex items-center justify-center transition-transform active:scale-95 shrink-0"
          style={{ backgroundColor: accent, boxShadow: `0 4px 20px ${accent}55` }}
          aria-label={isPlaying ? 'Pause' : 'Afspil'}
        >
          {isPlaying ? (
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>
      </div>
    </div>
  )
}
