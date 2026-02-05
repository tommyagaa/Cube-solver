import type { Face, CubeState } from '../lib/cube/types'
import { FACE_INPUT_ORDER } from '../lib/cube/faceOrder'
const faceLabels: Record<Face, string> = {
  U: 'Up · Bianco',
  L: 'Left · Arancione',
  F: 'Front · Verde',
  R: 'Right · Rosso',
  B: 'Back · Blu',
  D: 'Down · Giallo',
}

type FaceWizardProps = {
  cube: CubeState
  completedFaces: Set<Face>
  activeFace: Face
  onFaceComplete: (face: Face) => void
  onSetActiveFace: (face: Face) => void
  faceIssues?: Partial<Record<Face, string[]>>
}

const FaceWizard = ({ cube, completedFaces, activeFace, onFaceComplete, onSetActiveFace, faceIssues }: FaceWizardProps) => {
  const completedCount = completedFaces.size
  const progress = (completedCount / FACE_INPUT_ORDER.length) * 100
  const activeFaceDone = completedFaces.has(activeFace)
  const activeFaceHasIssues = Boolean(faceIssues?.[activeFace]?.length)
  const faceIsFilled = (face: Face) => cube[face].every(Boolean)

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
                <p>{faceLabels[face]}</p>
                <small>{done ? 'Confermato' : face === activeFace ? 'In corso' : 'Bloccato'}</small>
              </div>
            </button>
          )
        })}
      </div>

      <div className="wizard-actions">
        <button
          type="button"
          className="ghost"
          disabled={!faceIsFilled(activeFace) || activeFaceDone || activeFaceHasIssues}
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
