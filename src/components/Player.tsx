import { useState, useEffect } from 'react'
import { useRadioStore } from '../store/useRadioStore'

const CATEGORY_COLORS: Record<string, string> = {
  "70's": '#A78BFA',
  "80's": '#F5A623',
  "90's": '#E8679A',
  'Pop':   '#6EC6F5',
  'Rock':  '#A855F7',
  'Dansk': '#4ADE80',
  'Italo': '#F97316',
  'Jul':   '#E8262A',
}

export function Player() {
  const { currentStation, isPlaying, isBuffering, volume, togglePlay, setVolume } = useRadioStore()
  const [meta, setMeta] = useState<{ title: string | null; genre: string | null }>({ title: null, genre: null })

  useEffect(() => {
    if (!currentStation || !isPlaying) {
      setMeta({ title: null, genre: null })
      return
    }
    let cancelled = false
    async function fetchMeta() {
      try {
        const res = await fetch(`/api/icy-meta?url=${encodeURIComponent(currentStation!.streamUrl)}`)
        const data = await res.json()
        if (!cancelled) setMeta({ title: data.title ?? null, genre: data.genre ?? null })
      } catch {
        // stream doesn't support ICY metadata — ignore silently
      }
    }
    fetchMeta()
    const interval = setInterval(fetchMeta, 30000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [currentStation?.id, isPlaying])

  if (!currentStation) return null

  const accent = CATEGORY_COLORS[currentStation.category] ?? '#F5A623'

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 h-[15vh] bg-bg-secondary flex flex-col justify-between px-5 pt-3 pb-4"
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
        <div className="flex items-center gap-1.5">
          {isBuffering ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-yellow-400">Forbinder</span>
            </>
          ) : isPlaying ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-red-400">Live</span>
            </>
          ) : null}
        </div>
      </div>

      {/* Row 2 — Volume */}
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
