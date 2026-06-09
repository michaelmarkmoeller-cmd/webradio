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
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-border bg-bg-card h-14 animate-pulse" />
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
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
      {filtered.map((station) => (
        <StationCard key={station.id} station={station} />
      ))}
    </div>
  )
}
