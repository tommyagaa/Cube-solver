import { useEffect, useState } from 'react'
import type { CubeState } from '../lib/cube/types'
import { cubeToJson, parseCubeState } from '../lib/cube/serialization'

type StateTransferPanelProps = {
  state: CubeState
  onImport: (next: CubeState) => void
}

type Status =
  | { type: 'idle'; message: null }
  | { type: 'success'; message: string }
  | { type: 'error'; message: string }

const StateTransferPanel = ({ state, onImport }: StateTransferPanelProps) => {
  const [buffer, setBuffer] = useState(() => cubeToJson(state))
  const [status, setStatus] = useState<Status>({ type: 'idle', message: null })

  useEffect(() => {
    setBuffer(cubeToJson(state))
  }, [state])

  const copyJson = async () => {
    if (!navigator?.clipboard) {
      setStatus({ type: 'error', message: 'Clipboard non disponibile: copia manualmente dal campo di testo.' })
      return
    }

    try {
      await navigator.clipboard.writeText(buffer)
      setStatus({ type: 'success', message: 'Copiato negli appunti.' })
    } catch {
      setStatus({ type: 'error', message: 'Impossibile copiare: copia manualmente dal campo di testo.' })
    }
  }

  const handleImport = () => {
    const parsed = parseCubeState(buffer)
    if (!parsed.success) {
      setStatus({ type: 'error', message: parsed.error })
      return
    }
    onImport(parsed.cube)
    setStatus({ type: 'success', message: 'Stato importato correttamente.' })
  }

  return (
    <section className="state-transfer">
      <div className="state-transfer-head">
        <div>
          <p className="eyebrow small">Condivisione</p>
          <h2>Importa / Esporta</h2>
          <p className="transfer-subtitle">Copia il JSON per salvarlo o incolla un JSON valido per ricreare lo stato.</p>
        </div>
        <div className="transfer-actions">
          <button type="button" className="ghost" onClick={copyJson}>
            Copia JSON
          </button>
          <button type="button" className="primary" onClick={handleImport}>
            Importa JSON
          </button>
        </div>
      </div>
      <textarea
        className="transfer-textarea"
        value={buffer}
        onChange={(event) => setBuffer(event.target.value)}
        spellCheck={false}
        rows={6}
        aria-label="JSON dello stato del cubo"
      />
      {status.message && (
        <p className={`transfer-status ${status.type === 'error' ? 'error' : 'success'}`}>
          {status.message}
        </p>
      )}
    </section>
  )
}

export default StateTransferPanel
