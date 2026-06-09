import { useState } from 'react'
import { CATEGORIES } from '../types'
import type { Category } from '../types'
import { useRadioStore } from '../store/useRadioStore'

const CATEGORY_COLORS: Record<string, string> = {
  "70's": '#A78BFA',
  "80's": '#F5A623',
  "90's": '#E8679A',
  'Pop':   '#6EC6F5',
  'Rock':  '#A855F7',
  'Dansk': '#4ADE80',
  'Italo': '#F97316',
}

function CategoryButton({ cat, isActive, onClick }: { cat: Category; isActive: boolean; onClick: () => void }) {
  const [hovered, setHovered] = useState(false)
  const color = CATEGORY_COLORS[cat]

  let style: React.CSSProperties
  if (isActive) {
    style = { backgroundColor: color, color: '#0F0F14', opacity: hovered ? 0.85 : 1 }
  } else if (hovered) {
    style = { backgroundColor: `${color}22`, color, border: `1px solid ${color}90` }
  } else {
    style = { backgroundColor: 'transparent', color, border: `1px solid ${color}40` }
  }

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-150 cursor-pointer"
      style={style}
    >
      {cat}
    </button>
  )
}

export function CategoryFilter() {
  const { selectedCategory, setCategory } = useRadioStore()

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button
        onClick={() => setCategory('All')}
        className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
          selectedCategory === 'All'
            ? 'bg-accent text-bg-primary'
            : 'bg-bg-secondary text-text-secondary border border-border hover:border-accent hover:text-text-primary'
        }`}
      >
        Alle
      </button>
      {CATEGORIES.map((cat) => (
        <CategoryButton
          key={cat}
          cat={cat}
          isActive={selectedCategory === cat}
          onClick={() => setCategory(cat)}
        />
      ))}
    </div>
  )
}
