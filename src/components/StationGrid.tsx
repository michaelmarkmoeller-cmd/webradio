import { useRadioStore } from '../store/useRadioStore'
import { StationCard } from './StationCard'

export function StationGrid() {
  const { stations, selectedCategory, isLoading } = useRadioStore()

  const filtered =
    selectedCategory === 'All'
      ? stations
      : stations.filter((s) => s.category === selectedCategory)

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-bg-card p-4 h-28 animate-pulse" />
        ))}
      </div>
    )
  }

  if (filtered.length === 0) {
    return (
      <div className="text-center py-16 text-text-muted">
        Ingen stationer i denne kategori
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {filtered.map((station) => (
        <StationCard key={station.id} station={station} />
      ))}
    </div>
  )
}
