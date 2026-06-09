interface Props {
  stationName: string
  onConfirm: () => void
  onCancel: () => void
}

export function DeleteConfirm({ stationName, onConfirm, onCancel }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="bg-bg-secondary border border-border rounded-2xl p-6 w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-display font-semibold text-text-primary text-lg mb-2">Slet station</h3>
        <p className="text-text-secondary text-sm mb-6">
          Er du sikker på, at du vil slette{' '}
          <span className="text-text-primary font-medium">"{stationName}"</span>? Dette kan ikke fortrydes.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-lg border border-border text-text-secondary hover:text-text-primary hover:border-text-secondary transition-colors text-sm font-medium"
          >
            Annuller
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-lg bg-red-500/20 border border-red-500/50 text-red-400 hover:bg-red-500/30 transition-colors text-sm font-medium"
          >
            Slet
          </button>
        </div>
      </div>
    </div>
  )
}
