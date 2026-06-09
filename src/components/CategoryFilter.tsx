import { CATEGORIES } from '../types'
import { useRadioStore } from '../store/useRadioStore'

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
        <button
          key={cat}
          onClick={() => setCategory(cat)}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
            selectedCategory === cat
              ? 'bg-accent text-bg-primary'
              : 'bg-bg-secondary text-text-secondary border border-border hover:border-accent hover:text-text-primary'
          }`}
        >
          {cat}
        </button>
      ))}
    </div>
  )
}
