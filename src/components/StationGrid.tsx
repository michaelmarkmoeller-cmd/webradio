import { useState } from 'react'
import { useRadioStore } from '../store/useRadioStore'
import { StationCard } from './StationCard'
import { ReorderListModal } from './ReorderListModal'
import type { Category } from '../types'
import { isJulSeason } from '../utils/platform'

export function StationGrid() {
  const { stations, selectedCategory, isLoading, favorites } = useRadioStore()
  const [reordering, setReordering] = useState(false)

  const isDndEnabled = selectedCategory !== 'All' && selectedCategory !== 'Favorites'

  const julVisible = isJulSeason()
  const filtered =
    selectedCategory === 'All'
      ? stations.filter(s => julVisible || s.category !== 'Jul')
      : selectedCategory === 'Favorites'
      ? stations.filter(s => favorites.includes(s.id) && (julVisible || s.category !== 'Jul'))
      : stations.filter(s => s.category === selectedCategory)

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
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
        {filtered.map((station) => (
          <StationCard
            key={station.id}
            station={station}
            sortable={isDndEnabled}
            onRequestReorder={isDndEnabled ? () => setReordering(true) : undefined}
          />
        ))}
      </div>

      {reordering && isDndEnabled && (
        <ReorderListModal
          category={selectedCategory as Category}
          onClose={() => setReordering(false)}
        />
      )}
    </>
  )
}
