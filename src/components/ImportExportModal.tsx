import { useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { CATEGORIES } from '../types'
import type { Category, Station, StationFormData } from '../types'
import { importStations } from '../firebase/stationsService'
import { useRadioStore } from '../store/useRadioStore'

interface Props {
  onClose: () => void
}

interface ParsedStation extends StationFormData {
  valid: boolean
  error?: string
}

interface ImportFile {
  stations: ParsedStation[]
  raw: unknown
}

function parseFile(raw: unknown): ParsedStation[] {
  const arr: unknown[] = Array.isArray(raw)
    ? raw
    : (raw as Record<string, unknown>)?.stations as unknown[] ?? []

  return arr.map((item) => {
    const s = item as Record<string, unknown>
    if (typeof s.name !== 'string' || !s.name.trim())
      return { name: '', streamUrl: '', category: CATEGORIES[0], valid: false, error: 'Mangler navn' }
    if (typeof s.streamUrl !== 'string' || !s.streamUrl.trim())
      return { name: s.name as string, streamUrl: '', category: CATEGORIES[0], valid: false, error: 'Mangler streamUrl' }
    if (!/^https?:\/\//i.test(s.streamUrl.trim()))
      return { name: s.name as string, streamUrl: s.streamUrl as string, category: CATEGORIES[0], valid: false, error: 'Ugyldig URL (kun http/https)' }
    if (!CATEGORIES.includes(s.category as Category))
      return { name: s.name as string, streamUrl: s.streamUrl as string, category: CATEGORIES[0], valid: false, error: `Ukendt kategori: "${s.category}"` }

    return {
      name: s.name.trim(),
      streamUrl: s.streamUrl.trim(),
      category: s.category as Category,
      bitrate: typeof s.bitrate === 'number' ? s.bitrate : undefined,
      logoUrl: typeof s.logoUrl === 'string' ? s.logoUrl : undefined,
      country: typeof s.country === 'string' ? s.country : undefined,
      valid: true,
    }
  })
}

export function ImportExportModal({ onClose }: Props) {
  const stations = useRadioStore((s) => s.stations)
  const [tab, setTab] = useState<'export' | 'import'>('export')
  const [parsed, setParsed] = useState<ImportFile | null>(null)
  const [importing, setImporting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  function handleExport() {
    const data = {
      exportedAt: new Date().toISOString(),
      count: stations.length,
      stations: stations.map(({ name, streamUrl, category, bitrate, logoUrl, country }: Station) => ({
        name,
        streamUrl,
        category,
        ...(bitrate !== undefined && { bitrate }),
        ...(logoUrl && { logoUrl }),
        ...(country && { country }),
      })),
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `webradio-stationer-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    toast.success(`${stations.length} stationer eksporteret`)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const raw = JSON.parse(ev.target?.result as string)
        setParsed({ stations: parseFile(raw), raw })
      } catch {
        toast.error('Kunne ikke læse filen — er det en gyldig JSON-fil?')
        setParsed(null)
      }
    }
    reader.readAsText(file)
  }

  async function handleImport() {
    if (!parsed) return
    const valid = parsed.stations.filter((s) => s.valid)
    setImporting(true)
    try {
      const { imported, skipped } = await importStations(valid)
      const parts = []
      if (imported > 0) parts.push(`${imported} stationer importeret`)
      if (skipped > 0) parts.push(`${skipped} sprunget over (findes allerede)`)
      toast.success(parts.join(' · '))
      onClose()
    } catch {
      toast.error('Import fejlede')
    } finally {
      setImporting(false)
    }
  }

  const validCount = parsed?.stations.filter((s) => s.valid).length ?? 0
  const invalidCount = parsed?.stations.filter((s) => !s.valid).length ?? 0

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-bg-secondary border border-border rounded-2xl p-6 w-full max-w-2xl max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display font-semibold text-text-primary text-xl">Import / Eksport</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-5 bg-bg-primary rounded-lg p-1">
          {(['export', 'import'] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setParsed(null); if (fileRef.current) fileRef.current.value = '' }}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
                tab === t
                  ? 'bg-accent text-bg-primary'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {t === 'export' ? 'Eksport' : 'Import'}
            </button>
          ))}
        </div>

        {/* Export tab */}
        {tab === 'export' && (
          <div className="flex flex-col gap-4">
            <p className="text-text-secondary text-sm">
              Henter alle <span className="text-text-primary font-medium">{stations.length} stationer</span> fra Firestore og gemmer dem som en JSON-fil på din computer.
            </p>
            <div className="bg-bg-primary border border-border rounded-lg p-4 text-xs text-text-muted font-mono">
              {`{ "exportedAt": "...", "count": ${stations.length}, "stations": [ { "name": "...", "streamUrl": "...", "category": "..." }, ... ] }`}
            </div>
            <button
              onClick={handleExport}
              className="flex items-center justify-center gap-2 py-2.5 rounded-lg bg-accent hover:bg-accent-hover text-bg-primary font-medium text-sm transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download JSON-fil ({stations.length} stationer)
            </button>
          </div>
        )}

        {/* Import tab */}
        {tab === 'import' && (
          <div className="flex flex-col gap-4 min-h-0">
            <p className="text-text-secondary text-sm">
              Vælg en JSON-fil i samme format som eksport. Stationer der allerede findes (samme stream-URL) springes over.
            </p>

            <input
              ref={fileRef}
              type="file"
              accept=".json"
              onChange={handleFileChange}
              className="block w-full text-sm text-text-secondary
                file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0
                file:text-sm file:font-medium file:bg-accent file:text-bg-primary
                file:cursor-pointer hover:file:bg-accent-hover file:transition-colors"
            />

            {parsed && (
              <>
                {/* Summary */}
                <div className="flex gap-3 text-sm">
                  <span className="text-green-400 font-medium">✓ {validCount} gyldige</span>
                  {invalidCount > 0 && (
                    <span className="text-red-400 font-medium">✗ {invalidCount} ugyldige</span>
                  )}
                </div>

                {/* Preview table */}
                <div className="overflow-y-auto border border-border rounded-lg min-h-0">
                  <table className="w-full text-sm">
                    <thead className="bg-bg-primary sticky top-0">
                      <tr className="text-left text-text-muted text-xs">
                        <th className="px-3 py-2 font-medium">Station</th>
                        <th className="px-3 py-2 font-medium">Kategori</th>
                        <th className="px-3 py-2 font-medium">Bitrate</th>
                        <th className="px-3 py-2 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsed.stations.map((s, i) => (
                        <tr key={i} className="border-t border-border/50">
                          <td className="px-3 py-2 text-text-primary truncate max-w-[200px]">{s.name || '—'}</td>
                          <td className="px-3 py-2 text-text-secondary">{s.valid ? s.category : '—'}</td>
                          <td className="px-3 py-2 text-text-muted">{s.bitrate ? `${s.bitrate} kbps` : '—'}</td>
                          <td className="px-3 py-2">
                            {s.valid
                              ? <span className="text-green-400 text-xs">✓ OK</span>
                              : <span className="text-red-400 text-xs" title={s.error}>✗ {s.error}</span>
                            }
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <button
                  onClick={handleImport}
                  disabled={importing || validCount === 0}
                  className="flex items-center justify-center gap-2 py-2.5 rounded-lg bg-accent hover:bg-accent-hover text-bg-primary font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l4-4m0 0l4 4m-4-4v12" />
                  </svg>
                  {importing ? 'Importerer…' : `Importér ${validCount} stationer`}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
