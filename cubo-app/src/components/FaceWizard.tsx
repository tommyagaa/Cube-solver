import type { Face } from '../lib/cube/types'
import { FACE_INPUT_ORDER } from '../lib/cube/faceOrder'
import { FACE_LABELS } from '../lib/cube/faceLabels'

type FaceWizardProps = {
  completedFaces: Set<Face>
  activeFace: Face
  onFaceComplete: (face: Face) => void
  onSetActiveFace: (face: Face) => void
  onRotateFace: (face: Face, direction: 'cw' | 'ccw') => void
  faceIssues?: Partial<Record<Face, string[]>>
  faceProgress?: Record<Face, { filled: number; total: number }>
}

const DEFAULT_PROGRESS = { filled: 0, total: 9 }

const FaceWizard = ({ completedFaces, activeFace, onFaceComplete, onSetActiveFace, onRotateFace, faceIssues, faceProgress }: FaceWizardProps) => {
  const completedCount = completedFaces.size
  const progress = (completedCount / FACE_INPUT_ORDER.length) * 100
  const activeFaceDone = completedFaces.has(activeFace)
  const activeFaceHasIssues = Boolean(faceIssues?.[activeFace]?.length)
  const getFaceProgress = (face: Face) => faceProgress?.[face] ?? DEFAULT_PROGRESS
  const activeProgress = getFaceProgress(activeFace)
  const missingActive = Math.max(0, activeProgress.total - activeProgress.filled)
  const canConfirm = missingActive === 0 && !activeFaceDone && !activeFaceHasIssues

  return (
    <section className="face-wizard">
      <header>
        <p className="eyebrow small">Percorso guidato</p>
        <h2>Compila una faccia alla volta</h2>
        <p className="wizard-subtitle">
          Segui l’ordine suggerito e conferma ogni faccia quando combacia con i colori target. Questo riduce il rischio di stati impossibili.
        </p>
      </header>

      <div className="wizard-progress" aria-label={`Progresso ${completedCount} su ${FACE_INPUT_ORDER.length} facce`}>
        <div className="wizard-progress-bar" style={{ width: `${progress}%` }} />
      </div>

      <div className="wizard-steps">
        {FACE_INPUT_ORDER.map((face) => {
          const done = completedFaces.has(face)
          const disabled = !done && face !== activeFace
          const { filled, total } = getFaceProgress(face)
          const missing = Math.max(0, total - filled)
          const statusLabel = done
            ? 'Confermato'
            : face === activeFace
              ? missing === 0
                ? 'Pronta alla conferma'
                : `${missing} da mappare`
              : `${filled}/${total} completati`
          return (
            <button
              key={face}
              type="button"
              className={`wizard-step ${face === activeFace ? 'active' : ''} ${done ? 'done' : ''}`}
              disabled={disabled}
              onClick={() => onSetActiveFace(face)}
            >
              <span className="wizard-step-dot" />
              <div>
                <p>{FACE_LABELS[face]}</p>
                <small>{statusLabel}</small>
              </div>
            </button>
          )
        })}
      </div>

      <div className="wizard-actions">
        <button
          type="button"
          className="ghost"
          disabled={!canConfirm}
          onClick={() => onFaceComplete(activeFace)}
        >
          Conferma faccia {activeFace}
        </button>
        <button
          type="button"
          className="primary"
          disabled={completedFaces.size < FACE_INPUT_ORDER.length}
          onClick={() => onSetActiveFace('D')}
        >
          Vai alla faccia finale
        </button>
      </div>

      <div className="wizard-rotate">
        <p>Ruota la griglia se l&apos;hai inserita con un orientamento diverso.</p>
        <div className="rotate-actions">
          <button type="button" className="ghost" onClick={() => onRotateFace(activeFace, 'ccw')}>
            ↺ Ruota faccia attiva
          </button>
          <button type="button" className="ghost" onClick={() => onRotateFace(activeFace, 'cw')}>
            Ruota faccia attiva ↻
          </button>
        </div>
      </div>

      <p className="wizard-progress-hint">
        {activeFaceDone
          ? 'Hai già confermato questa faccia.'
          : missingActive === 0
            ? 'Tutti gli sticker sono stati compilati: puoi confermare.'
            : `Mancano ${missingActive} sticker da colorare su questa faccia.`}
      </p>

      {faceIssues?.[activeFace] && faceIssues[activeFace]!.length > 0 && (
        <ul className="wizard-issues">
          {faceIssues[activeFace]!.map((message, idx) => (
            <li key={`${message}-${idx}`}>{message}</li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default FaceWizard
