import { useState, useEffect } from 'react'
import { DndContext, PointerSensor, useSensor, useSensors, closestCenter } from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import { SortableContext, arrayMove, rectSortingStrategy } from '@dnd-kit/sortable'
import { useRadioStore } from '../store/useRadioStore'
import { updateSortOrders } from '../firebase/stationsService'
import { StationCard } from './StationCard'
import type { Station } from '../types'

export function StationGrid() {
  const { stations, selectedCategory, isLoading, favorites } = useRadioStore()
  const [optimistic, setOptimistic] = useState<Station[] | null>(null)

  // Clear optimistic state when Firestore pushes confirmed order
  useEffect(() => { setOptimistic(null) }, [stations])

  const isDndEnabled = selectedCategory !== 'All' && selectedCategory !== 'Favorites'

  const filtered =
    selectedCategory === 'All'
      ? stations
      : selectedCategory === 'Favorites'
      ? stations.filter((s) => favorites.includes(s.id))
      : stations.filter((s) => s.category === selectedCategory)

  const displayed = optimistic ?? filtered

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return
    const oldIndex = displayed.findIndex((s) => s.id === active.id)
    const newIndex = displayed.findIndex((s) => s.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return
    const reordered = arrayMove(displayed, oldIndex, newIndex)
    setOptimistic(reordered)
    updateSortOrders(reordered.map((s, idx) => ({ id: s.id, sortOrder: idx }))).catch(() => {
      setOptimistic(null)
    })
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-border bg-bg-card h-14 animate-pulse" />
        ))}
      </div>
    )
  }

  if (displayed.length === 0) {
    return (
      <div className="text-center py-16 text-text-muted">
        Ingen stationer i denne kategori
      </div>
    )
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={displayed.map((s) => s.id)} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
          {displayed.map((station) => (
            <StationCard key={station.id} station={station} sortable={isDndEnabled} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
