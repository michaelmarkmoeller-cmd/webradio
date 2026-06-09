import { CATEGORIES } from '../types'
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
      {CATEGORIES.map((cat) => {
        const color = CATEGORY_COLORS[cat]
        const isActive = selectedCategory === cat
        return (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className="px-4 py-1.5 rounded-full text-sm font-medium transition-all"
            style={
              isActive
                ? { backgroundColor: color, color: '#0F0F14' }
                : { backgroundColor: 'transparent', color, border: `1px solid ${color}40` }
            }
          >
            {cat}
          </button>
        )
      })}
    </div>
  )
}
