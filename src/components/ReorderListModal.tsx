import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import { SortableContext, useSortable, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useRadioStore } from '../store/useRadioStore'
import type { Category, Station } from '../types'
import { CATEGORY_COLORS } from '../utils/categoryColors'

interface Props {
  category: Category
  onClose: () => void
}

function ReorderRow({ station }: { station: Station }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: station.id })

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        zIndex: isDragging ? 1 : undefined,
      }}
      className="flex items-center gap-3 bg-bg-card border border-border rounded-xl px-3 py-2.5"
      data-testid="reorder-row"
    >
      {station.logoUrl && (
        <img
          src={station.logoUrl}
          alt=""
          className="w-8 h-8 rounded-md object-contain bg-black/30 shrink-0"
          draggable={false}
        />
      )}
      <span className="flex-1 text-sm text-text-primary font-medium truncate">{station.name}</span>
      <button
        {...attributes}
        {...listeners}
        className="p-2 -mr-1 text-text-muted cursor-grab active:cursor-grabbing shrink-0"
        style={{ touchAction: 'none' }}
        aria-label="Træk for at ændre rækkefølge"
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <circle cx="7" cy="5" r="1.3" />
          <circle cx="7" cy="10" r="1.3" />
          <circle cx="7" cy="15" r="1.3" />
          <circle cx="13" cy="5" r="1.3" />
          <circle cx="13" cy="10" r="1.3" />
          <circle cx="13" cy="15" r="1.3" />
        </svg>
      </button>
    </div>
  )
}

export function ReorderListModal({ category, onClose }: Props) {
  const stations = useRadioStore((s) => s.stations)
  const reorderCategory = useRadioStore((s) => s.reorderCategory)
  const list = stations.filter((s) => s.category === category)
  const accentColor = CATEGORY_COLORS[category] ?? '#F5A623'

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return
    const oldIndex = list.findIndex((s) => s.id === active.id)
    const newIndex = list.findIndex((s) => s.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return
    const reordered = arrayMove(list, oldIndex, newIndex)
    reorderCategory(category, reordered.map((s) => s.id))
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-bg-secondary border border-border rounded-2xl p-6 w-full max-w-md max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-display font-semibold text-text-primary text-lg flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: accentColor }} />
            {category}
          </h2>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-accent text-bg-primary font-medium text-sm hover:bg-accent-hover transition-colors"
          >
            Færdig
          </button>
        </div>

        <p className="text-text-secondary text-xs mb-4">Træk i håndtaget for at ændre rækkefølgen</p>

        <div className="flex flex-col gap-2 overflow-y-auto">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={list.map((s) => s.id)} strategy={verticalListSortingStrategy}>
              {list.map((station) => (
                <ReorderRow key={station.id} station={station} />
              ))}
            </SortableContext>
          </DndContext>
        </div>
      </div>
    </div>
  )
}
