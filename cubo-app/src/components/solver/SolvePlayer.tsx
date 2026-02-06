import { useMemo, useState } from 'react'
import type { CubeState, Face } from '../../lib/cube/types'
import CubeNet from '../CubeNet'
import type { SolveFrame, SolvePlan } from '../../lib/solver/sequence'
import { createSolvePlan } from '../../lib/solver/sequence'

type ChangedMap = Partial<Record<Face, Set<number>>>

const buildChangedMap = (previous: CubeState | null, current: CubeState | null): ChangedMap => {
  if (!previous || !current) {
    return {}
  }
  const faces = Object.keys(current) as Face[]
  const map: ChangedMap = {}
  faces.forEach((face) => {
    current[face].forEach((color, idx) => {
      if (previous[face][idx] !== color) {
        if (!map[face]) {
          map[face] = new Set()
        }
        map[face]!.add(idx)
      }
    })
  })
  return map
}

export type SolvePlayerProps = {
  state: CubeState
}

const SolvePlayer = ({ state }: SolvePlayerProps) => {
  const [plan, setPlan] = useState<SolvePlan | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const ensurePlan = () => {
    try {
      const nextPlan = createSolvePlan(state)
      setPlan(nextPlan)
      setCurrentIndex(0)
      setError(null)
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Errore sconosciuto durante il calcolo della soluzione.')
      }
    }
  }

  const frames = plan?.frames ?? []
  const currentFrame: SolveFrame | null = frames[currentIndex] ?? null
  const nextMove = plan?.moves[currentIndex] ?? null

  const hasPlan = Boolean(plan && plan.moves.length)

  const changedStickers = useMemo(() => {
    if (!plan || !currentFrame) {
      return {}
    }
    const prevState = currentIndex > 0 ? frames[currentIndex - 1]?.state ?? null : null
    return buildChangedMap(prevState, currentFrame.state)
  }, [plan, frames, currentFrame, currentIndex])

  const goTo = (index: number) => {
    if (!plan) return
    const nextIndex = Math.max(0, Math.min(index, plan.frames.length - 1))
    setCurrentIndex(nextIndex)
  }

  const prev = () => goTo(currentIndex - 1)
  const next = () => goTo(currentIndex + 1)

  const captions = useMemo(() => {
    if (!plan) {
      return []
    }
    return plan.frames.map((frame, idx) => {
      if (frame.move == null) {
        return `Frame ${idx} · Stato iniziale`
      }
      return `Frame ${idx} · ${frame.notation}`
    })
  }, [plan])

  return (
    <section className="solve-player">
      <header>
        <p className="eyebrow small">Fase 2 · Replay risoluzione</p>
        <h2>Riproduci la soluzione passo passo</h2>
        <p className="wizard-subtitle">
          Calcoliamo una sequenza ottimizzata (metodo layer-by-layer). Naviga tra le mosse, osserva lo stato e ripeti sul cubo reale.
        </p>
      </header>

      <div className="solve-controls">
        <button type="button" className="primary" onClick={ensurePlan}>
          Calcola soluzione
        </button>
        <div className="player-buttons">
          <button type="button" onClick={() => goTo(0)} disabled={!hasPlan || currentIndex === 0}>
            ⏮ Inizio
          </button>
          <button type="button" onClick={prev} disabled={!hasPlan || currentIndex === 0}>
            ⬅ Step
          </button>
          <button
            type="button"
            onClick={next}
            disabled={!hasPlan || currentIndex >= frames.length - 1}
          >
            Step ➡
          </button>
          <button
            type="button"
            onClick={() => goTo(frames.length - 1)}
            disabled={!hasPlan || currentIndex >= frames.length - 1}
          >
            Fine ⏭
          </button>
        </div>
      </div>

      {error && <p className="solve-error">{error}</p>}

      {currentFrame && (
        <div className="solve-stage">
          <div>
            <p className="eyebrow small">Passo corrente</p>
            <h3>{currentFrame.move ?? 'Start'}</h3>
            <p className="wizard-subtitle">
              {captions[currentIndex] ?? 'Frame'}. Prossima mossa: {nextMove ?? '—'}
            </p>
          </div>
          <CubeNet
            state={currentFrame.state}
            changedStickers={changedStickers}
          />
        </div>
      )}
    </section>
  )
}

export default SolvePlayer
