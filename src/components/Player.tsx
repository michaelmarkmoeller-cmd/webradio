import { useRadioStore } from '../store/useRadioStore'

export function Player() {
  const { currentStation, isPlaying, isBuffering, volume, togglePlay, setVolume } = useRadioStore()

  if (!currentStation) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-bg-secondary border-t border-border">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-4">
        {/* Play/Pause */}
        <button
          onClick={togglePlay}
          className="w-10 h-10 rounded-full bg-accent hover:bg-accent-hover flex items-center justify-center transition-colors shrink-0"
          aria-label={isPlaying ? 'Pause' : 'Afspil'}
        >
          {isPlaying ? (
            <svg className="w-5 h-5 text-bg-primary" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-bg-primary" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        {/* Station info */}
        <div className="flex-1 min-w-0">
          <div className="font-display font-semibold text-text-primary truncate leading-tight">
            {currentStation.name}
          </div>
          <div className="text-xs text-text-secondary">{currentStation.category}</div>
        </div>

        {/* Status: buffering or live */}
        {isPlaying && (
          <div className="flex items-center gap-1.5 shrink-0">
            {isBuffering ? (
              <>
                <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
                <span className="text-xs font-medium text-yellow-400 uppercase tracking-wider">Forbinder</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-xs font-medium text-red-400 uppercase tracking-wider">Live</span>
              </>
            )}
          </div>
        )}

        {/* Volume */}
        <div className="flex items-center gap-2 shrink-0">
          <svg className="w-4 h-4 text-text-muted" fill="currentColor" viewBox="0 0 24 24">
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
          </svg>
          <input
            type="range"
            min={0}
            max={1}
            step={0.02}
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="w-24 accent-accent cursor-pointer"
            aria-label="Lydstyrke"
          />
        </div>
      </div>
    </div>
  )
}
