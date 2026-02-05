type HistoryEntry = {
  id: number
  label: string
}

type HistoryPanelProps = {
  entries: HistoryEntry[]
  currentIndex: number
  onUndo: () => void
  onRedo: () => void
}

const HistoryPanel = ({ entries, currentIndex, onUndo, onRedo }: HistoryPanelProps) => {
  return (
    <section className="history-panel">
      <div className="history-head">
        <div>
          <p className="eyebrow small">Cronologia</p>
          <h2>Timeline modifiche</h2>
          <p className="history-subtitle">Ripercorri le azioni fatte sul cubo o torna indietro con undo/redo.</p>
        </div>
        <div className="history-actions">
          <button type="button" className="ghost" onClick={onUndo} disabled={currentIndex === 0}>
            Undo
          </button>
          <button
            type="button"
            className="primary"
            onClick={onRedo}
            disabled={currentIndex === entries.length - 1}
          >
            Redo
          </button>
        </div>
      </div>
      <ol className="history-list">
        {entries.map((entry, idx) => (
          <li key={entry.id} className={`history-item ${idx === currentIndex ? 'active' : ''}`}>
            <span className="history-step">{idx + 1}</span>
            <p>{entry.label}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}

export default HistoryPanel
