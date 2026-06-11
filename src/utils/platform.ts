export const isIOS =
  typeof navigator !== 'undefined' &&
  (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1))

// Nov (måned 10) og dec (måned 11) i 0-indekseret
export function isJulSeason(): boolean {
  const m = new Date().getMonth()
  return m === 10 || m === 11
}
