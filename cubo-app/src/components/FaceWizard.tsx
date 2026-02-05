import type { Face, CubeState } from '../lib/cube/types'
import { DEFAULT_FACE_COLORS } from '../lib/cube/types'

const faceOrder: Face[] = ['U', 'L', 'F', 'R', 'B', 'D']
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
}

const FaceWizard = ({ cube, completedFaces, activeFace, onFaceComplete, onSetActiveFace }: FaceWizardProps) => {
  const completedCount = completedFaces.size
  const progress = (completedCount / faceOrder.length) * 100

  const faceIsComplete = (face: Face) => {
    const stickers = cube[face]
    const reference = DEFAULT_FACE_COLORS[face]
    return stickers.every((sticker) => sticker === reference)
  }

  return (
    <section className="face-wizard">
      <header>
        <p className="eyebrow small">Percorso guidato</p>
        <h2>Compila una faccia alla volta</h2>
        <p className="wizard-subtitle">
          Segui l’ordine suggerito e conferma ogni faccia quando combacia con i colori target. Questo riduce il rischio di stati impossibili.
        </p>
      </header>

      <div className="wizard-progress" aria-label={`Progresso ${completedCount} su ${faceOrder.length} facce`}>
        <div className="wizard-progress-bar" style={{ width: `${progress}%` }} />
      </div>

      <div className="wizard-steps">
        {faceOrder.map((face) => {
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
          disabled={!faceIsComplete(activeFace)}
          onClick={() => onFaceComplete(activeFace)}
        >
          Conferma faccia {activeFace}
        </button>
        <button
          type="button"
          className="primary"
          disabled={completedFaces.size < faceOrder.length}
          onClick={() => onSetActiveFace('D')}
        >
          Vai alla faccia finale
        </button>
      </div>
    </section>
  )
}

export default FaceWizard
