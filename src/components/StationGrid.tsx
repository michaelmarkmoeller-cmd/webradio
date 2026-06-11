import { useState } from 'react'
import {
  DndContext, DragOverlay, PointerSensor,
  useSensor, useSensors, closestCenter,
} from '@dnd-kit/core'
import type { DragStartEvent, DragEndEvent } from '@dnd-kit/core'
import { SortableContext, arrayMove, rectSortingStrategy } from '@dnd-kit/sortable'
import { useRadioStore } from '../store/useRadioStore'
import { StationCard } from './StationCard'
import type { Station, Category } from '../types'
import { isJulSeason } from '../utils/platform'

const CATEGORY_COLORS: Record<string, string> = {
  "70's": '#A78BFA', "80's": '#F5A623', "90's": '#E8679A',
  'Pop': '#6EC6F5', 'Rock': '#A855F7', 'Dansk': '#4ADE80',
  'Italo': '#F97316', 'Jul': '#E8262A', 'Dance': '#22D3EE',
}

export function StationGrid() {
  const { stations, selectedCategory, isLoading, favorites, reorderCategory } = useRadioStore()
  const [activeStation, setActiveStation] = useState<Station | null>(null)

  const isDndEnabled = selectedCategory !== 'All' && selectedCategory !== 'Favorites'

  const julVisible = isJulSeason()
  const filtered =
    selectedCategory === 'All'
      ? stations.filter(s => julVisible || s.category !== 'Jul')
      : selectedCategory === 'Favorites'
      ? stations.filter(s => favorites.includes(s.id) && (julVisible || s.category !== 'Jul'))
      : stations.filter(s => s.category === selectedCategory)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
  )

  function handleDragStart({ active }: DragStartEvent) {
    setActiveStation(filtered.find((s) => s.id === active.id) ?? null)
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveStation(null)
    if (!over || active.id === over.id) return
    const oldIndex = filtered.findIndex((s) => s.id === active.id)
    const newIndex = filtered.findIndex((s) => s.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return
    const reordered = arrayMove(filtered, oldIndex, newIndex)
    reorderCategory(selectedCategory as Category, reordered.map((s) => s.id))
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

  if (filtered.length === 0) {
    return (
      <div className="text-center py-16 text-text-muted">
        Ingen stationer i denne kategori
      </div>
    )
  }

  const accent = activeStation ? (CATEGORY_COLORS[activeStation.category] ?? '#F5A623') : '#F5A623'

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={filtered.map((s) => s.id)} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
          {filtered.map((station) => (
            <StationCard key={station.id} station={station} sortable={isDndEnabled} />
          ))}
        </div>
      </SortableContext>

      <DragOverlay dropAnimation={null}>
        {activeStation && (
          <div
            className="rounded-xl border px-4 pt-4 pb-9 shadow-2xl rotate-1 bg-bg-card"
            style={{
              borderLeftWidth: 3,
              borderLeftColor: accent,
              borderColor: accent + '60',
              boxShadow: `0 8px 32px ${accent}40`,
              opacity: 0.95,
            }}
          >
            <p className="font-display font-semibold text-text-primary text-sm leading-tight">
              {activeStation.name}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: accent }} />
              <span className="text-xs text-text-muted">{activeStation.category}</span>
            </div>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
