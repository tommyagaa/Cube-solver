import { useEffect, useMemo, useRef, useState } from 'react'
import type { CubeState, Face, Move, MoveModifier } from '../../lib/cube/types'
import { FACE_INPUT_ORDER } from '../../lib/cube/faceOrder'
import CubeNet, { type FaceHintMap } from '../CubeNet'
import type { SolveFrame, SolvePlan, SolveStageId } from '../../lib/solver/sequence'
import { createSolvePlan, createSolvePlanFromMoves } from '../../lib/solver/sequence'

type ChangedMap = Partial<Record<Face, Set<number>>>
type PersistedPlanPayload = {
  cubeSignature: string
  moves: Move[]
  savedAt: number
  manualCompletion?: number[]
  appliedCount?: number
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

const persistPlan = (moves: Move[], data?: { manual?: Set<number>; applied?: number }, planSignature?: string, stateSignature?: string) => {
  if (typeof window === 'undefined') {
    return
  }
  const payload: PersistedPlanPayload = {
    cubeSignature: planSignature ?? stateSignature ?? '',
    moves,
    savedAt: Date.now(),
    manualCompletion: data?.manual ? Array.from(data.manual) : undefined,
    appliedCount: data?.applied,
  }
  window.localStorage.setItem(PLAN_STORAGE_KEY, JSON.stringify(payload))
}

type MoveInstruction = {
  title: string
  detail: string
  orientation?: string
}

type CopyStatus = 'idle' | 'copied' | 'error'

const MoveTracker = ({
  moves,
  currentIndex,
  completedManual,
  onToggle,
  appliedCount,
}: {
  moves: Move[]
  currentIndex: number
  completedManual: Set<number>
  onToggle: (index: number) => void
  appliedCount: number
}) => {
  if (!moves.length) {
    return (
      <div className="move-tracker empty">
        <p>Nessuna mossa calcolata.</p>
      </div>
    )
  }
  const previewIndex = currentIndex > 0 ? currentIndex - 1 : -1
  return (
    <div className="move-tracker">
      <div className="move-tracker-head">
        <p className="eyebrow small">Sequenza completa</p>
        <p className="move-progress">
          Anteprima {Math.max(0, Math.min(currentIndex, moves.length))}/{moves.length} · Cubo {appliedCount}/{moves.length}
        </p>
      </div>
      <ol>
        {moves.map((move, idx) => {
          const isCurrentPreview = previewIndex >= 0 && idx === previewIndex
          const isPreviewed = previewIndex >= 0 && idx < previewIndex
          const isUpcoming = previewIndex < 0 ? true : idx > previewIndex
          const isManuallyDone = completedManual.has(idx)
          return (
            <li
              key={`${move}-${idx}`}
              className={[
                isCurrentPreview ? 'current' : '',
                isPreviewed ? 'previewed' : '',
                isUpcoming ? 'upcoming' : '',
                isManuallyDone ? 'completed' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <div className="move-label">
                <span className="move-index">{idx + 1}</span>
                <strong>{move}</strong>
              </div>
              <label>
                <input
                  type="checkbox"
                  checked={isManuallyDone}
                  onChange={() => onToggle(idx)}
                />
                Riprodotta
              </label>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

const SUPPORT_FACE_MAP: Record<Face, Face> = {
  U: 'F',
  D: 'F',
  F: 'U',
  B: 'U',
  L: 'F',
  R: 'F',
}

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

const buildFaceHints = (move: Move | null): FaceHintMap => {
  if (!move) {
    return {}
  }
  const face = move[0] as Face
  const hints: FaceHintMap = {
    [face]: {
      icon: '↻',
      label: 'Ruota qui',
      variant: 'primary',
    },
  }
  const supportFace = SUPPORT_FACE_MAP[face]
  if (supportFace && supportFace !== face) {
    hints[supportFace] = {
      icon: '✋',
      label: 'Mantieni frontale',
      variant: 'secondary',
    }
  }
  return hints
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
  onApplyMoves?: (moves: Move[], options?: { label?: string }) => void
  onResolutionComplete?: () => void
  onResolutionReset?: () => void
}

const SolvePlayer = ({ state, onApplyMoves, onResolutionComplete, onResolutionReset }: SolvePlayerProps) => {
  const [plan, setPlan] = useState<SolvePlan | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [intervalMs, setIntervalMs] = useState(1200)
  const [loopEnabled, setLoopEnabled] = useState(false)
  const [planSignature, setPlanSignature] = useState<string | null>(null)
  const [copyStatus, setCopyStatus] = useState<CopyStatus>('idle')
  const [manualCompletion, setManualCompletion] = useState<Set<number>>(new Set())
  const [appliedCount, setAppliedCount] = useState(0)
  const totalMoves = plan?.moves.length ?? 0
  const remainingMoves = Math.max(0, totalMoves - appliedCount)
  const stateSignature = useMemo(() => computeStateSignature(state), [state])
  const intervalRef = useRef<number | null>(null)
  const resolutionRef = useRef(false)
  const persistCurrentPlan = (moves: Move[], data?: { manual?: Set<number>; applied?: number }) => {
    persistPlan(moves, data, planSignature ?? stateSignature, stateSignature)
  }

  const rebuildPlan = (): SolvePlan | null => {
    try {
      const nextPlan = createSolvePlan(state)
      const resetSet = new Set<number>()
      setPlan(nextPlan)
      setCurrentIndex(0)
      setError(null)
      setIsPlaying(false)
      setPlanSignature(stateSignature)
      setCopyStatus('idle')
      setManualCompletion(resetSet)
      setAppliedCount(0)
      persistCurrentPlan(nextPlan.moves, { manual: resetSet, applied: 0 })
      return nextPlan
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Errore sconosciuto durante il calcolo della soluzione.')
      }
      return null
    }
  }

  const ensurePlan = () => {
    rebuildPlan()
  }

  const frames = plan?.frames ?? []
  const currentFrame: SolveFrame | null = frames[currentIndex] ?? null
  const nextMove = plan?.moves[currentIndex] ?? null
  const moveInstruction = useMemo(() => describeMove(currentFrame?.move ?? null), [currentFrame])
  const faceHints = useMemo(() => buildFaceHints(currentFrame?.move ?? null), [currentFrame])

  const hasPlan = Boolean(plan && plan.moves.length)
  const whiteCrossStage = plan?.stages.find((stage) => stage.id === 'white-cross')
  const canApplyWhiteCross = Boolean(
    whiteCrossStage &&
      onApplyMoves &&
      appliedCount >= whiteCrossStage.startMoveIndex &&
      appliedCount <= whiteCrossStage.endMoveIndex,
  )

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

  const handleToggleManual = (index: number) => {
    setManualCompletion((prev) => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      if (plan) {
        persistCurrentPlan(plan.moves, { manual: next, applied: appliedCount })
      }
      return next
    })
  }

  useEffect(() => {
    if (plan || typeof window === 'undefined') {
      return
    }
    try {
      const raw = window.localStorage.getItem(PLAN_STORAGE_KEY)
      if (!raw) {
        return
      }
      const persisted = JSON.parse(raw) as PersistedPlanPayload
      if (persisted.cubeSignature !== stateSignature) {
        return
      }
      const restoredPlan = createSolvePlanFromMoves(state, persisted.moves)
      setPlan(restoredPlan)
      setPlanSignature(persisted.cubeSignature)
      setCurrentIndex(0)
      setError(null)
      setCopyStatus('idle')
      setManualCompletion(new Set(persisted.manualCompletion ?? []))
      setAppliedCount(persisted.appliedCount ?? 0)
    } catch (restoreError) {
      console.warn('Impossibile ripristinare il piano', restoreError)
    }
  }, [plan, stateSignature, state])

  useEffect(() => {
    if (!plan) {
      return
    }
    if (appliedCount > 0 || manualCompletion.size > 0) {
      return
    }
    if (planSignature && planSignature !== stateSignature) {
      setPlan(null)
      setPlanSignature(null)
      setCurrentIndex(0)
      setIsPlaying(false)
      setCopyStatus('idle')
      setManualCompletion(new Set())
      setAppliedCount(0)
    }
  }, [plan, planSignature, stateSignature, manualCompletion, appliedCount])

  useEffect(() => {
    const resolved = Boolean(plan && totalMoves > 0 && remainingMoves === 0)
    if (resolved && !resolutionRef.current) {
      resolutionRef.current = true
      onResolutionComplete?.()
    } else if (!resolved && resolutionRef.current) {
      resolutionRef.current = false
      onResolutionReset?.()
    }
  }, [plan, totalMoves, remainingMoves, onResolutionComplete, onResolutionReset])

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
          if (loopEnabled) {
            return 0
          }
          return prevIndex
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

  const handleApplyVirtualStep = () => {
    if (!plan || !onApplyMoves) {
      return
    }
    if (appliedCount >= plan.moves.length) {
      return
    }
    const targetIndex = appliedCount
    const move = plan.moves[targetIndex]
    onApplyMoves([move], { label: `Applica ${move}` })
    setAppliedCount(targetIndex + 1)
    setManualCompletion((prev) => {
      const next = new Set(prev)
      next.add(targetIndex)
      persistCurrentPlan(plan.moves, { manual: next, applied: targetIndex + 1 })
      return next
    })
  }

  const handleApplyRemaining = () => {
    if (!plan || !onApplyMoves) {
      return
    }
    const remaining = plan.moves.slice(appliedCount)
    if (!remaining.length) {
      return
    }
    onApplyMoves(remaining, {
      label: `Applica ultime ${remaining.length} mosse solver`,
    })
    const total = plan.moves.length
    setAppliedCount(total)
    setManualCompletion(() => {
      const next = new Set<number>()
      for (let i = 0; i < total; i += 1) {
        next.add(i)
      }
      persistCurrentPlan(plan.moves, { manual: next, applied: total })
      return next
    })
  }

  const handleApplyStage = (stageId: SolveStageId) => {
    if (!plan || !onApplyMoves) {
      return
    }
    const stage = plan.stages.find((entry) => entry.id === stageId)
    if (!stage) {
      return
    }
    if (appliedCount < stage.startMoveIndex || appliedCount > stage.endMoveIndex) {
      return
    }
    const movesToApply = plan.moves.slice(appliedCount, stage.endMoveIndex + 1)
    if (!movesToApply.length) {
      return
    }
    const label = `${stage.label} (${movesToApply.length} mosse)`
    onApplyMoves(movesToApply, { label })
    const totalApplied = stage.endMoveIndex + 1
    setAppliedCount(totalApplied)
    setManualCompletion((prev) => {
      const next = new Set(prev)
      for (let idx = stage.startMoveIndex; idx <= stage.endMoveIndex; idx += 1) {
        next.add(idx)
      }
      persistCurrentPlan(plan.moves, { manual: next, applied: totalApplied })
      return next
    })
  }

  const handleSolveAndApply = () => {
    if (!onApplyMoves) {
      rebuildPlan()
      return
    }
    const targetPlan = rebuildPlan()
    if (!targetPlan || !targetPlan.moves.length) {
      return
    }
    onApplyMoves(targetPlan.moves, { label: 'Risoluzione solver automatica' })
    const completeSet = new Set<number>()
    targetPlan.moves.forEach((_, idx) => {
      completeSet.add(idx)
    })
    setManualCompletion(completeSet)
    setAppliedCount(targetPlan.moves.length)
    persistCurrentPlan(targetPlan.moves, { manual: completeSet, applied: targetPlan.moves.length })
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
        <div className="solve-primary-actions">
          <button type="button" className="primary" onClick={ensurePlan}>
            Calcola soluzione
          </button>
          {onApplyMoves && (
            <button type="button" className="primary" onClick={handleSolveAndApply}>
              Calcola e applica sul cubo
            </button>
          )}
        </div>
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

      {whiteCrossStage && (
        <div className="solve-stage-card">
          <div>
            <p className="eyebrow small">Metodo a strati</p>
            <h3>{whiteCrossStage.label}</h3>
            <p className="stage-description">{whiteCrossStage.description}</p>
            <p className="stage-moves">{whiteCrossStage.previewMoves.join(' ')}</p>
          </div>
          {onApplyMoves && (
            <button
              type="button"
              className="ghost"
              disabled={!canApplyWhiteCross}
              onClick={() => handleApplyStage('white-cross')}
            >
              Applica croce ({whiteCrossStage.moveCount} mosse)
            </button>
          )}
        </div>
      )}

      {error && <p className="solve-error">{error}</p>}

      {currentFrame && (
        <div className="solve-stage">
          <div className="stage-text">
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
          <div className="stage-visual">
            <CubeNet
              state={currentFrame.state}
              changedStickers={changedStickers}
              faceHints={faceHints}
            />
            <MoveTracker
              moves={plan?.moves ?? []}
              currentIndex={currentIndex}
              completedManual={manualCompletion}
              onToggle={handleToggleManual}
              appliedCount={appliedCount}
            />
          </div>
        </div>
      )}

      {plan && onApplyMoves && (
        <div className="solve-apply-controls">
          <button
            type="button"
            className="ghost"
            onClick={handleApplyVirtualStep}
            disabled={!remainingMoves}
          >
            Applica passo sul cubo
          </button>
          <button
            type="button"
            className="ghost"
            onClick={handleApplyRemaining}
            disabled={remainingMoves === 0}
          >
            Completa sequenza sul cubo
          </button>
          <p className="apply-progress">Cubo virtuale: {appliedCount}/{totalMoves}</p>
        </div>
      )}

      {plan && totalMoves > 0 && remainingMoves === 0 && (
        <p className="solve-success">✅ Tutte le mosse sono state applicate al cubo virtuale.</p>
      )}
    </section>
  )
}

export default SolvePlayer
