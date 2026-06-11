import { useState } from 'react'
import { CATEGORIES } from '../types'
import type { Category } from '../types'
import { addStation } from '../firebase/stationsService'
import toast from 'react-hot-toast'

interface Props {
  onClose: () => void
}

export function AddStationModal({ onClose }: Props) {
  const [name, setName] = useState('')
  const [streamUrl, setStreamUrl] = useState('')
  const [category, setCategory] = useState<Category>(CATEGORIES[0])
  const [bitrate, setBitrate] = useState<number | undefined>(undefined)
  const [country, setCountry] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !streamUrl.trim()) return

    setSaving(true)
    try {
      await addStation({ name: name.trim(), streamUrl: streamUrl.trim(), category, bitrate, country: country.trim().toLowerCase() || undefined })
      toast.success(`"${name.trim()}" tilføjet`)
      onClose()
    } catch {
      toast.error('Kunne ikke tilføje stationen')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-bg-secondary border border-border rounded-2xl p-6 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display font-semibold text-text-primary text-xl">Tilføj station</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">
              Stationsnavn
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="f.eks. Radio Nova"
              required
              className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2.5 text-text-primary placeholder-text-muted text-sm focus:outline-none focus:border-accent transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">
              Stream URL
            </label>
            <input
              type="url"
              value={streamUrl}
              onChange={(e) => setStreamUrl(e.target.value)}
              placeholder="https://stream.example.com/live"
              required
              className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2.5 text-text-primary placeholder-text-muted text-sm focus:outline-none focus:border-accent transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">
              Kategori
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as Category)}
              className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2.5 text-text-primary text-sm focus:outline-none focus:border-accent transition-colors appearance-none cursor-pointer"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">
              Bitrate
            </label>
            <select
              value={bitrate ?? ''}
              onChange={(e) => setBitrate(e.target.value ? Number(e.target.value) : undefined)}
              className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2.5 text-text-primary text-sm focus:outline-none focus:border-accent transition-colors appearance-none cursor-pointer"
            >
              <option value="">Ukendt</option>
              <option value="128">128 kbps</option>
              <option value="192">192 kbps</option>
              <option value="320">320 kbps</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">
              Land (ISO-kode, fx dk, de, nl)
            </label>
            <input
              type="text"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="dk"
              maxLength={2}
              className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2.5 text-text-primary placeholder-text-muted text-sm focus:outline-none focus:border-accent transition-colors"
            />
          </div>

          <div className="flex gap-3 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg border border-border text-text-secondary hover:text-text-primary hover:border-text-secondary transition-colors text-sm font-medium"
            >
              Annuller
            </button>
            <button
              type="submit"
              disabled={saving || !name.trim() || !streamUrl.trim()}
              className="flex-1 py-2.5 rounded-lg bg-accent text-bg-primary font-medium text-sm hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Gemmer…' : 'Tilføj station'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
