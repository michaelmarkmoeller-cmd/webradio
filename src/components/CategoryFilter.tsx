import { useEffect, useState } from 'react'
import { CATEGORIES } from '../types'
import type { Category } from '../types'
import { useRadioStore } from '../store/useRadioStore'
import { isJulSeason } from '../utils/platform'
import { CATEGORY_COLORS } from '../utils/categoryColors'

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
  const { selectedCategory, setCategory, favorites } = useRadioStore()

  useEffect(() => {
    if (selectedCategory === 'Jul' && !isJulSeason()) setCategory('All')
  }, [selectedCategory, setCategory])

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
      <button
        onClick={() => setCategory('Favorites')}
        className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
          selectedCategory === 'Favorites'
            ? 'bg-red-500 text-white'
            : 'bg-bg-secondary text-text-secondary border border-border hover:border-red-400 hover:text-red-400'
        }`}
      >
        <svg className="w-3.5 h-3.5" fill={selectedCategory === 'Favorites' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
        Favoritter{favorites.length > 0 && <span className="text-xs opacity-75">({favorites.length})</span>}
      </button>
      {CATEGORIES.filter(cat => cat !== 'Jul' || isJulSeason()).map((cat) => (
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
