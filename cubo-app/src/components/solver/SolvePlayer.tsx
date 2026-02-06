import { useEffect, useMemo, useRef, useState } from 'react'
import type { CubeState, Face, Move, MoveModifier } from '../../lib/cube/types'
import { FACE_INPUT_ORDER } from '../../lib/cube/faceOrder'
import CubeNet from '../CubeNet'
import type { SolveFrame, SolvePlan } from '../../lib/solver/sequence'
import { createSolvePlan, createSolvePlanFromMoves } from '../../lib/solver/sequence'

type ChangedMap = Partial<Record<Face, Set<number>>>
type PersistedPlanPayload = {
  cubeSignature: string
  moves: Move[]
  savedAt: number
}

const PLAN_STORAGE_KEY = 'cubo-app/solve-plan-v1'

const computeStateSignature = (state: CubeState): string => {
  return FACE_INPUT_ORDER.map((face) => state[face].join('-')).join('|')
}

const safeCopyText = async (text: string): Promise<boolean> => {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return true
  }
  if (typeof document !== 'undefined') {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.focus()
    textarea.select()
    try {
      const successful = document.execCommand('copy')
      return successful
    } finally {
      document.body.removeChild(textarea)
    }
  }
  return false
}

type MoveInstruction = {
  title: string
  detail: string
  orientation?: string
}

type CopyStatus = 'idle' | 'copied' | 'error'

const FACE_GUIDES: Record<Face, { label: string; action: string; orientation: string }> = {
  U: {
    label: 'Superiore (U)',
    action: 'Ruota la faccia superiore',
    orientation: 'Tieni il cubo con la faccia frontale verde rivolta verso di te e il bianco in alto.',
  },
  D: {
    label: 'Inferiore (D)',
    action: 'Ruota la faccia inferiore',
    orientation: 'Mantieni la faccia verde davanti e immagina di guardare il lato giallo dal basso.',
  },
  F: {
    label: 'Frontale (F)',
    action: 'Ruota la faccia frontale verde',
    orientation: 'Il verde resta rivolto verso di te: muovi la faccia che stai guardando direttamente.',
  },
  B: {
    label: 'Posteriore (B)',
    action: 'Ruota la faccia posteriore blu',
    orientation: 'Tieni il verde davanti ma immagina di ruotare il lato opposto blu guardandolo “di fronte”.',
  },
  L: {
    label: 'Sinistra (L)',
    action: 'Ruota la faccia sinistra arancione',
    orientation: 'Con il verde davanti, la faccia arancione è sulla tua sinistra.',
  },
  R: {
    label: 'Destra (R)',
    action: 'Ruota la faccia destra rossa',
    orientation: 'Con il verde davanti, la faccia rossa è sulla tua destra.',
  },
}

const MODIFIER_GUIDES: Record<MoveModifier, { short: string; detail: string }> = {
  '': {
    short: '90° orario',
    detail: 'di 90° in senso orario guardando direttamente la faccia',
  },
  "'": {
    short: '90° antiorario',
    detail: 'di 90° in senso antiorario guardando direttamente la faccia',
  },
  '2': {
    short: 'doppio giro',
    detail: 'di 180° (due quarti di giro, la direzione è indifferente)',
  },
}

const describeMove = (move: Move | null): MoveInstruction => {
  if (!move) {
    return {
      title: 'Pronti a partire',
      detail: 'Nessuna mossa eseguita: premi Play o usa Step per iniziare la sequenza.',
    }
  }
  const face = move[0] as Face
  const modifier = ((move.slice(1) as MoveModifier) || '') as MoveModifier
  const faceGuide = FACE_GUIDES[face]
  const modifierGuide = MODIFIER_GUIDES[modifier]
  return {
    title: `${faceGuide.label} · ${modifierGuide.short}`,
    detail: `${faceGuide.action} ${modifierGuide.detail}.`,
    orientation: faceGuide.orientation,
  }
}

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
  const [isPlaying, setIsPlaying] = useState(false)
  const [intervalMs, setIntervalMs] = useState(1200)
  const [loopEnabled, setLoopEnabled] = useState(false)
  const [planSignature, setPlanSignature] = useState<string | null>(null)
  const [copyStatus, setCopyStatus] = useState<CopyStatus>('idle')
  const stateSignature = useMemo(() => computeStateSignature(state), [state])
  const intervalRef = useRef<number | null>(null)

  const persistPlan = (moves: Move[]) => {
    if (typeof window === 'undefined') {
      return
    }
    const payload: PersistedPlanPayload = {
      cubeSignature: stateSignature,
      moves,
      savedAt: Date.now(),
    }
    window.localStorage.setItem(PLAN_STORAGE_KEY, JSON.stringify(payload))
  }

  const ensurePlan = () => {
    try {
      const nextPlan = createSolvePlan(state)
      setPlan(nextPlan)
      setCurrentIndex(0)
      setError(null)
      setIsPlaying(false)
      setPlanSignature(stateSignature)
      setCopyStatus('idle')
      persistPlan(nextPlan.moves)
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
  const moveInstruction = useMemo(() => describeMove(currentFrame?.move ?? null), [currentFrame])

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

  const prev = () => {
    setIsPlaying(false)
    goTo(currentIndex - 1)
  }
  const next = () => {
    setIsPlaying(false)
    goTo(currentIndex + 1)
  }

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

  useEffect(() => {
    if (planSignature === stateSignature) {
      return
    }
    if (typeof window === 'undefined') {
      setPlan(null)
      setPlanSignature(null)
      setCurrentIndex(0)
      setIsPlaying(false)
      setCopyStatus('idle')
      return
    }

    try {
      const raw = window.localStorage.getItem(PLAN_STORAGE_KEY)
      if (raw) {
        const persisted = JSON.parse(raw) as PersistedPlanPayload
        if (persisted.cubeSignature === stateSignature) {
          const restoredPlan = createSolvePlanFromMoves(state, persisted.moves)
          setPlan(restoredPlan)
          setPlanSignature(stateSignature)
          setCurrentIndex(0)
          setError(null)
          setCopyStatus('idle')
          return
        }
      }
    } catch (restoreError) {
      console.warn('Impossibile ripristinare il piano', restoreError)
    }

    if (planSignature !== null) {
      setPlan(null)
      setPlanSignature(null)
    }
    setCurrentIndex(0)
    setIsPlaying(false)
    setCopyStatus('idle')
  }, [planSignature, stateSignature, state])

  useEffect(() => {
    if (copyStatus === 'idle' || typeof window === 'undefined') {
      return
    }
    const timer = window.setTimeout(() => setCopyStatus('idle'), 2500)
    return () => window.clearTimeout(timer)
  }, [copyStatus])

  useEffect(() => {
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    if (!isPlaying || !plan) {
      return
    }

    const lastIndex = plan.frames.length - 1
    intervalRef.current = window.setInterval(() => {
      setCurrentIndex((prevIndex) => {
        if (lastIndex < 0) {
          return 0
        }
        if (prevIndex >= lastIndex) {
          return loopEnabled ? 0 : prevIndex
        }
        return prevIndex + 1
      })
    }, intervalMs)

    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [isPlaying, intervalMs, plan, loopEnabled])

  useEffect(() => {
    if (!plan) {
      setIsPlaying(false)
      return
    }
    if (!loopEnabled && currentIndex >= plan.frames.length - 1) {
      setIsPlaying(false)
    }
  }, [currentIndex, plan, loopEnabled])

  const togglePlay = () => {
    if (!plan) {
      return
    }
    if (isPlaying) {
      setIsPlaying(false)
      return
    }
    if (currentIndex >= plan.frames.length - 1) {
      setCurrentIndex(0)
    }
    setIsPlaying(true)
  }

  const renderPlayLabel = () => {
    if (!plan) {
      return '▶ Play'
    }
    if (currentIndex >= plan.frames.length - 1) {
      return '↺ Restart'
    }
    return isPlaying ? '⏸ Pause' : '▶ Play'
  }

  const handleCopyPlan = async () => {
    if (!plan) {
      return
    }
    const payload = {
      cubeSignature: planSignature ?? stateSignature,
      moves: plan.moves,
      length: plan.moves.length,
      generatedAt: new Date().toISOString(),
    }
    try {
      const success = await safeCopyText(JSON.stringify(payload, null, 2))
      setCopyStatus(success ? 'copied' : 'error')
    } catch {
      setCopyStatus('error')
    }
  }

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
        <button
          type="button"
          className="ghost"
          onClick={togglePlay}
          disabled={!hasPlan}
        >
          {renderPlayLabel()}
        </button>
        <button
          type="button"
          className="ghost"
          onClick={handleCopyPlan}
          disabled={!hasPlan}
        >
          {copyStatus === 'copied' ? 'Copiato!' : 'Copia sequenza'}
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
          <label className="player-speed">
            Velocità
            <select
              value={intervalMs}
              onChange={(event) => setIntervalMs(Number(event.target.value))}
              disabled={!hasPlan}
            >
              <option value={800}>0.8s</option>
              <option value={1200}>1.2s</option>
              <option value={2000}>2s</option>
            </select>
          </label>
          <label className="player-loop">
            <input
              type="checkbox"
              checked={loopEnabled}
              onChange={(event) => setLoopEnabled(event.target.checked)}
              disabled={!hasPlan}
            />
            Loop continuo
          </label>
        </div>
      </div>

      {copyStatus === 'copied' && <p className="copy-feedback success">Sequenza copiata negli appunti.</p>}
      {copyStatus === 'error' && <p className="copy-feedback error">Impossibile copiare la sequenza: riprova manualmente.</p>}

      {error && <p className="solve-error">{error}</p>}

      {currentFrame && (
        <div className="solve-stage">
          <div>
            <p className="eyebrow small">Passo corrente</p>
            <h3>{currentFrame.move ?? 'Start'}</h3>
            <p className="wizard-subtitle">
              {captions[currentIndex] ?? 'Frame'}. Prossima mossa: {nextMove ?? '—'}
            </p>
            {moveInstruction && (
              <div className="move-instructions">
                <p className="eyebrow small">Istruzione testuale</p>
                <h4>{moveInstruction.title}</h4>
                <p className="move-detail">{moveInstruction.detail}</p>
                {moveInstruction.orientation && (
                  <p className="move-orientation">{moveInstruction.orientation}</p>
                )}
              </div>
            )}
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
