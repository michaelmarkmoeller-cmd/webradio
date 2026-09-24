import { useState, useEffect, useRef, type TouchEvent } from 'react'
import { useRadioStore } from '../store/useRadioStore'
import { isIOS } from '../utils/platform'
import type { Station } from '../types'
import type { NowPlayingCover } from '../utils/nowPlaying'
import { SleepTimerMenu } from './SleepTimerMenu'
import { SonosMenu } from './SonosMenu'

// Stor "Now Playing"-visning i fuld skærm — åbnes ved tryk på player-baren. Lukkes ved tryk på
// albumcover/stationslogo, ⌄-pilen, swipe ned eller Escape. Afspilningen påvirkes ikke.

const ANIM_MS = 280
// Så langt skal man swipe ned, før visningen lukker (ellers glider den tilbage)
const SWIPE_CLOSE_PX = 110

interface Props {
  station: Station
  accent: string
  trackTitle: string | null
  genre: string | null
  cover: NowPlayingCover | null
  metaSource: string | null
  listenTime: string
  onCoverError: (src: string) => void
  onClose: () => void
}

// "Kunstner - Titel" → { artist, title }. Uden separator er hele strengen titlen
function splitTrack(t: string): { artist: string | null; title: string } {
  const i = t.indexOf(' - ')
  if (i <= 0) return { artist: null, title: t }
  return { artist: t.slice(0, i).trim(), title: t.slice(i + 3).trim() }
}

// Formatet gættes ud fra stream-URL'en — mange streams har ingen endelse
function streamFormat(url: string): string | null {
  const u = url.toLowerCase()
  if (u.includes('.m3u8')) return 'HLS'
  if (/aacp?\b|\.aac|_aac|aac_|\/aac/.test(u)) return 'AAC'
  if (/mp3/.test(u)) return 'MP3'
  if (/\.ogg|\.opus/.test(u)) return 'Ogg'
  return null
}

function countryName(code: string): string {
  try {
    return new Intl.DisplayNames(['da'], { type: 'region' }).of(code.toUpperCase()) ?? code.toUpperCase()
  } catch {
    return code.toUpperCase()
  }
}

export function NowPlayingSheet({ station, accent, trackTitle, genre, cover, metaSource, listenTime, onCoverError, onClose }: Props) {
  const { isPlaying, isBuffering, togglePlay, volume, setVolume, favorites, toggleFavorite } = useRadioStore()
  const [shown, setShown] = useState(false)
  const [dragY, setDragY] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)
  const touchStart = useRef<number | null>(null)
  const closing = useRef(false)

  // Glid op ved åbning
  useEffect(() => {
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)))
    return () => cancelAnimationFrame(id)
  }, [])

  // Lås baggrunden, så stationsgitteret ikke scroller bag visningen
  useEffect(() => {
    const prev = document.documentElement.style.overflow
    document.documentElement.style.overflow = 'hidden'
    return () => { document.documentElement.style.overflow = prev }
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') requestClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  function requestClose() {
    if (closing.current) return
    closing.current = true
    setDragY(0)
    setShown(false)
    setTimeout(onClose, ANIM_MS)
  }

  function onTouchStart(e: TouchEvent) {
    // Swipe ned lukker kun, når indholdet er scrollet helt op
    touchStart.current = (scrollRef.current?.scrollTop ?? 0) <= 0 ? e.touches[0].clientY : null
  }
  function onTouchMove(e: TouchEvent) {
    if (touchStart.current === null) return
    const dy = e.touches[0].clientY - touchStart.current
    setDragY(dy > 0 ? dy : 0)
  }
  function onTouchEnd() {
    if (touchStart.current === null) return
    touchStart.current = null
    if (dragY > SWIPE_CLOSE_PX) requestClose()
    else setDragY(0)
  }

  const track = trackTitle ? splitTrack(trackTitle) : null
  const isFavorite = favorites.includes(station.id)
  const format = streamFormat(station.streamUrl)

  const logo = station.logoUrl ? (
    <img src={station.logoUrl} alt={station.name} className="w-full h-full object-contain" draggable={false} />
  ) : (
    <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: accent + '22' }}>
      <svg className="w-1/3 h-1/3" style={{ color: accent }} fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
      </svg>
    </div>
  )

  const infoRows: { label: string; value: string }[] = [
    { label: 'Bitrate', value: station.bitrate ? `${station.bitrate} kbps` : '—' },
    { label: 'Format', value: format ?? '—' },
    { label: 'Land', value: station.country ? countryName(station.country) : '—' },
    { label: 'Genre', value: genre ?? '—' },
    { label: 'Nu spiller-kilde', value: metaSource ?? '—' },
  ]

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-bg-primary"
      style={{
        transform: shown ? `translateY(${dragY}px)` : 'translateY(100%)',
        transition: touchStart.current !== null ? 'none' : `transform ${ANIM_MS}ms cubic-bezier(0.32, 0.72, 0, 1)`,
        backgroundImage: `linear-gradient(to bottom, ${accent}40, transparent 55%)`,
      }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
      role="dialog"
      aria-label="Afspiller"
    >
      <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-contain">
        <div className={`max-w-lg mx-auto px-6 pb-10 flex flex-col ${isIOS ? 'pt-12' : 'pt-4'}`}>
          {/* Topbar — luk, titel, favorit */}
          <div className="flex items-center justify-between">
            <button
              onClick={requestClose}
              className="w-10 h-10 -ml-2 flex items-center justify-center rounded-full text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors"
              aria-label="Luk afspiller"
            >
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
              </svg>
            </button>
            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-text-muted">Now Playing</span>
            <button
              onClick={() => toggleFavorite(station.id)}
              className="w-10 h-10 -mr-2 flex items-center justify-center rounded-full text-text-secondary hover:bg-bg-hover transition-transform active:scale-90"
              aria-label={isFavorite ? 'Fjern fra favoritter' : 'Tilføj til favoritter'}
            >
              <svg className="w-6 h-6" fill={isFavorite ? '#ef4444' : 'none'} stroke={isFavorite ? '#ef4444' : 'currentColor'} strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </button>
          </div>

          {/* Stort billede — albumcover hvis der er et, ellers stationslogo. Tryk lukker */}
          <button
            onClick={requestClose}
            className="mt-6 mx-auto w-full max-w-[min(100%,42vh)] aspect-square rounded-2xl overflow-hidden bg-black/30 transition-transform active:scale-[0.98]"
            style={{ boxShadow: `0 12px 48px ${accent}55` }}
            aria-label="Luk afspiller"
          >
            {cover ? (
              <img
                key={cover.src}
                src={cover.src}
                alt={trackTitle ?? station.name}
                onError={() => onCoverError(cover.src)}
                className="w-full h-full object-cover"
                draggable={false}
              />
            ) : logo}
          </button>

          {/* Nummer */}
          <div className="mt-6 min-h-[56px]">
            {track ? (
              <>
                <div className="font-display font-bold text-2xl text-text-primary leading-tight">{track.title}</div>
                {track.artist && <div className="text-lg text-text-secondary mt-0.5">{track.artist}</div>}
              </>
            ) : (
              <div className="font-display font-bold text-2xl text-text-primary leading-tight">{station.name}</div>
            )}
          </div>

          {/* Station — lille logo når albumcoveret står stort (tryk lukker også) */}
          <div className="mt-4 flex items-center gap-3">
            {cover && (
              <button
                onClick={requestClose}
                className="w-12 h-12 shrink-0 rounded-lg overflow-hidden bg-black/30"
                aria-label="Luk afspiller"
              >
                {logo}
              </button>
            )}
            <div className="min-w-0 flex-1">
              {(track || cover) && (
                <div className="font-display font-semibold text-base text-text-primary truncate">{station.name}</div>
              )}
              <div className="flex items-center gap-2 mt-1">
                <span
                  className="text-[11px] font-semibold px-2 py-0.5 rounded-full leading-none"
                  style={{ backgroundColor: accent + '25', color: accent }}
                >
                  {station.category}
                </span>
                {station.country && (
                  <img
                    src={`https://flagcdn.com/w40/${station.country}.png`}
                    alt={station.country}
                    className="w-[20px] rounded-sm shrink-0"
                    draggable={false}
                  />
                )}
              </div>
            </div>
            {/* Live / Forbinder + lyttetid */}
            <div className="flex items-center gap-1.5 shrink-0">
              {isBuffering ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
                  <span className="text-[11px] font-bold uppercase tracking-widest text-yellow-400">Forbinder</span>
                </>
              ) : isPlaying ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-[11px] font-bold uppercase tracking-widest text-red-400">Live</span>
                  <span className="text-[11px] tabular-nums text-red-400">{listenTime}</span>
                </>
              ) : (
                <span className="text-[11px] font-bold uppercase tracking-widest text-text-muted">Pause</span>
              )}
            </div>
          </div>

          {/* Betjening — søvntimer, play/pause, Sonos */}
          <div className="mt-8 flex items-center justify-between">
            <SleepTimerMenu accent={accent} size="lg" />
            <button
              onClick={togglePlay}
              className="w-20 h-20 rounded-full flex items-center justify-center transition-transform active:scale-95"
              style={{ backgroundColor: accent, boxShadow: `0 6px 28px ${accent}66` }}
              aria-label={isPlaying ? 'Pause' : 'Afspil'}
            >
              {isPlaying ? (
                <svg className="w-9 h-9 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                </svg>
              ) : (
                <svg className="w-9 h-9 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>
            <SonosMenu station={station} size="lg" />
          </div>

          {/* Volume (skjult på iOS: audio.volume er read-only i WebKit) */}
          {!isIOS && (
            <div className="mt-8 flex items-center gap-3">
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

          {/* Stream-detaljer */}
          <div className="mt-8 rounded-2xl border border-border bg-bg-card/70 px-4 py-3">
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted mb-2">Stream</div>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
              {infoRows.map(r => (
                <div key={r.label} className="contents">
                  <dt className="text-text-muted">{r.label}</dt>
                  <dd className="text-text-primary text-right">{r.value}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-3 pt-3 border-t border-border">
              <div className="text-[11px] text-text-muted mb-0.5">Stream-URL</div>
              <div className="text-[11px] text-text-secondary break-all select-text">{station.streamUrl}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
