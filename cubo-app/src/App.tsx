import { useEffect, useMemo, useRef, useState } from 'react'
import CubeNet from './components/CubeNet'
import MappingGuide from './components/MappingGuide'
import ValidationPanel from './components/ValidationPanel'
import StateTransferPanel from './components/StateTransferPanel'
import HistoryPanel from './components/HistoryPanel'
import FaceWizard from './components/FaceWizard'
import FaceDiagnostics from './components/FaceDiagnostics'
import SolvePlayer from './components/solver/SolvePlayer'
import { createSolvedCube, cloneCube, createEmptyCube } from './lib/cube/state'
import type { Color, Face, CubeState, Move } from './lib/cube/types'
import { PLACEHOLDER_COLOR } from './lib/cube/types'
import type { ValidationIssue } from './lib/cube/validation'
import { FACE_INPUT_ORDER } from './lib/cube/faceOrder'
import { applyMove } from './lib/cube/moves'
import './App.css'

const palette: Color[] = ['white', 'yellow', 'green', 'blue', 'orange', 'red']

const STICKER_INDEXES = Array.from({ length: 9 }, (_, idx) => idx)
const CENTER_INDEX = 4

const ROTATE_SOURCE_CW = [6, 3, 0, 7, 4, 1, 8, 5, 2] as const
const ROTATE_SOURCE_CCW = [2, 5, 8, 1, 4, 7, 0, 3, 6] as const
const ROTATE_TARGET_CW = [2, 5, 8, 1, 4, 7, 0, 3, 6] as const
const ROTATE_TARGET_CCW = [6, 3, 0, 7, 4, 1, 8, 5, 2] as const

type FaceRotationDirection = 'cw' | 'ccw'

const rotateFaceStickers = (stickers: CubeState[Face], direction: FaceRotationDirection): CubeState[Face] => {
  const source = direction === 'cw' ? ROTATE_SOURCE_CW : ROTATE_SOURCE_CCW
  const next = source.map((sourceIdx) => stickers[sourceIdx]) as CubeState[Face]
  return next
}

const rotateTouchedIndexes = (indexes: Set<number> | undefined, direction: FaceRotationDirection) => {
  const map = direction === 'cw' ? ROTATE_TARGET_CW : ROTATE_TARGET_CCW
  const next = new Set<number>()
  indexes?.forEach((idx) => {
    const target = map[idx]
    if (typeof target === 'number') {
      next.add(target)
    }
  })
  return next
}

type TouchedMap = Record<Face, Set<number>>
type SerializedTouchedMap = Record<Face, number[]>

type HistoryEntry = {
  id: number
  label: string
  state: CubeState
  touched: TouchedMap
}

const STORAGE_KEY = 'cubo-app/session-v1'

type PersistedSession = {
  cube: CubeState
  completedFaces: Face[]
  activeFace: Face
  touched?: SerializedTouchedMap
}

type LoadedSession = {
  cube: CubeState
  completedFaces: Face[]
  activeFace: Face
  touched: TouchedMap
}

const createTouchedMap = (): TouchedMap => {
  const map = {} as TouchedMap
  FACE_INPUT_ORDER.forEach((face) => {
    map[face] = new Set<number>([CENTER_INDEX])
  })
  return map
}

const createFullTouchedMap = (): TouchedMap => {
  const map = {} as TouchedMap
  FACE_INPUT_ORDER.forEach((face) => {
    map[face] = new Set<number>(STICKER_INDEXES)
  })
  return map
}

const cloneTouchedMap = (source: TouchedMap): TouchedMap => {
  const map = {} as TouchedMap
  FACE_INPUT_ORDER.forEach((face) => {
    map[face] = new Set(source[face] ?? [])
  })
  return map
}

const serializeTouchedMap = (map: TouchedMap): SerializedTouchedMap => {
  const serialized = {} as SerializedTouchedMap
  FACE_INPUT_ORDER.forEach((face) => {
    serialized[face] = Array.from(map[face] ?? [])
  })
  return serialized
}

const deserializeTouchedMap = (serialized?: SerializedTouchedMap): TouchedMap => {
  if (!serialized) {
    return createTouchedMap()
  }
  const map = {} as TouchedMap
  FACE_INPUT_ORDER.forEach((face) => {
    const indexes = serialized[face]
    if (Array.isArray(indexes) && indexes.length > 0) {
      map[face] = new Set(indexes.filter((idx) => STICKER_INDEXES.includes(idx)))
    } else {
      map[face] = new Set<number>([CENTER_INDEX])
    }
  })
  return map
}

const loadSession = (): LoadedSession | null => {
  if (typeof window === 'undefined') {
    return null
  }

  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    return null
  }

  try {
    const parsed = JSON.parse(raw) as Partial<PersistedSession>
    if (!parsed.cube) {
      return null
    }

    const completedFaces = Array.isArray(parsed.completedFaces)
      ? parsed.completedFaces.filter((face): face is Face => FACE_INPUT_ORDER.includes(face as Face))
      : []

    const activeFace = FACE_INPUT_ORDER.includes(parsed.activeFace as Face) ? (parsed.activeFace as Face) : 'U'
    const touched = deserializeTouchedMap(parsed.touched as SerializedTouchedMap | undefined)

    return {
      cube: parsed.cube as CubeState,
      completedFaces,
      activeFace,
      touched,
    }
  } catch {
    return null
  }
}

const saveSession = (cube: CubeState, completedFaces: Set<Face>, activeFace: Face, touched: TouchedMap) => {
  if (typeof window === 'undefined') {
    return
  }

  const payload: PersistedSession = {
    cube: cloneCube(cube),
    completedFaces: Array.from(completedFaces),
    activeFace,
    touched: serializeTouchedMap(touched),
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
}

function App() {
  const sessionRef = useRef<LoadedSession | null>(loadSession())
  const session = sessionRef.current
  const initialCube = session?.cube ?? createSolvedCube()
  const initialCompleted = session?.completedFaces ?? []
  const initialActive = session?.activeFace ?? 'U'
  const initialTouched = session?.touched ?? createTouchedMap()
  const initialLabel = session ? 'Sessione ripristinata' : 'Stato iniziale'

  const [timeline, setTimeline] = useState(() => {
    return {
      entries: [
        {
          id: 0,
          label: initialLabel,
          state: cloneCube(initialCube),
          touched: cloneTouchedMap(initialTouched),
        },
      ] as HistoryEntry[],
      index: 0,
    }
  })
  const historyIdRef = useRef(1)
  const currentEntry = timeline.entries[timeline.index]
  const cube = currentEntry?.state ?? createSolvedCube()
  const touched = currentEntry?.touched ?? createTouchedMap()
  const [selectedColor, setSelectedColor] = useState<Color>('white')
  const [completedFaces, setCompletedFaces] = useState<Set<Face>>(() => new Set(initialCompleted))
  const [activeFace, setActiveFace] = useState<Face>(initialActive)
  const [guardMessage, setGuardMessage] = useState<string | null>(null)
  const [solverStatus, setSolverStatus] = useState<'idle' | 'complete'>('idle')
  const validationIssues: ValidationIssue[] = []
  const { highlighted, issueMessages, faceIssues, issuesByFace } = useMemo(() => {
    const highlightMap: Partial<Record<Face, Set<number>>> = {}
    const messageMap: Partial<Record<Face, Record<number, string[]>>> = {}
    const perFaceIssues: Partial<Record<Face, ValidationIssue[]>> = {}
    const perFaceMessages: Partial<Record<Face, string[]>> = {}

    validationIssues.forEach((issue) => {
      const facesInIssue = new Set<Face>()
      issue.stickers?.forEach(({ face, index }) => {
        if (!highlightMap[face]) {
          highlightMap[face] = new Set<number>()
        }
        highlightMap[face]!.add(index)

        if (!messageMap[face]) {
          messageMap[face] = {}
        }
        if (!messageMap[face]![index]) {
          messageMap[face]![index] = []
        }
        messageMap[face]![index]?.push(issue.message)

        facesInIssue.add(face)
      })

      facesInIssue.forEach((face) => {
        if (!perFaceIssues[face]) {
          perFaceIssues[face] = []
        }
        perFaceIssues[face]!.push(issue)

        if (!perFaceMessages[face]) {
          perFaceMessages[face] = []
        }
        if (!perFaceMessages[face]!.includes(issue.message)) {
          perFaceMessages[face]!.push(issue.message)
        }
      })
    })

    return {
      highlighted: highlightMap,
      issueMessages: messageMap,
      faceIssues: perFaceMessages,
      issuesByFace: perFaceIssues,
    }
  }, [validationIssues])

  const faceProgress = useMemo(() => {
    const map = {} as Record<Face, { filled: number; total: number }>
    FACE_INPUT_ORDER.forEach((face) => {
      const stickers = cube[face]
      const filled = stickers.reduce((acc, color) => {
        return acc + (color === PLACEHOLDER_COLOR ? 0 : 1)
      }, 0)
      map[face] = {
        filled,
        total: STICKER_INDEXES.length,
      }
    })
    return map
  }, [cube])

  const colorCounts = useMemo(() => {
    const counts: Partial<Record<Color, number>> = {}
    palette.forEach((color) => {
      counts[color] = 0
    })
    FACE_INPUT_ORDER.forEach((face) => {
      cube[face].forEach((color) => {
        if (counts[color as Color] != null) {
          counts[color as Color] = (counts[color as Color] ?? 0) + 1
        }
      })
    })
    return counts
  }, [cube])

  useEffect(() => {
    if (!guardMessage || typeof window === 'undefined') {
      return
    }
    const timer = window.setTimeout(() => setGuardMessage(null), 3000)
    return () => window.clearTimeout(timer)
  }, [guardMessage])

  const handleResolutionComplete = () => {
    setSolverStatus('complete')
  }

  const handleResolutionReset = () => {
    setSolverStatus('idle')
  }

  const commitState = (nextState: CubeState, nextTouched: TouchedMap, label: string) => {
    setTimeline((prev) => {
      const base = prev.entries.slice(0, prev.index + 1)
      const entry: HistoryEntry = {
        id: historyIdRef.current++,
        label,
        state: cloneCube(nextState),
        touched: cloneTouchedMap(nextTouched),
      }
      const entries = [...base, entry]
      return { entries, index: entries.length - 1 }
    })
  }

  const handleStickerClick = (face: Face, index: number) => {
    if (face !== activeFace) {
      return
    }
    if (index === CENTER_INDEX) {
      setGuardMessage('I centri del cubo sono fissi: usa i centri solo come riferimento colore.')
      return
    }
    const currentColor = cube[face][index]
    const alreadyTouched = touched[face]?.has(index)
    const needsColorChange = currentColor !== selectedColor
    if (!needsColorChange && alreadyTouched) {
      return
    }
    const next = needsColorChange ? cloneCube(cube) : cube
    if (needsColorChange) {
      next[face][index] = selectedColor
    }
    const nextTouched = cloneTouchedMap(touched)
    nextTouched[face]?.add(index)

    const label = needsColorChange ? `Set ${face}${index} -> ${selectedColor}` : `Conferma ${face}${index}`
    commitState(next, nextTouched, label)
  }

  const handleClearCube = () => {
    const empty = createEmptyCube()
    const resetTouched = createTouchedMap()
    commitState(empty, resetTouched, 'Svuota cubo')
    setCompletedFaces(new Set())
    setActiveFace('U')
    setGuardMessage('Hai svuotato il cubo: compila ogni sticker seguendo il wizard.')
  }

  const handleReset = () => {
    const resetCube = createSolvedCube()
    const resetTouched = createTouchedMap()
    commitState(resetCube, resetTouched, 'Reset cubo')
    setCompletedFaces(new Set())
    setActiveFace('U')
  }

  const handleImport = (next: CubeState) => {
    const importTouched = createFullTouchedMap()
    commitState(next, importTouched, 'Import JSON')
    setCompletedFaces(new Set())
    setActiveFace('U')
  }

  const handleRotateFace = (face: Face, direction: FaceRotationDirection) => {
    const rotated = rotateFaceStickers(cube[face], direction)
    const nextState = cloneCube(cube)
    nextState[face] = rotated
    const nextTouched = cloneTouchedMap(touched)
    nextTouched[face] = rotateTouchedIndexes(nextTouched[face], direction)
    commitState(nextState, nextTouched, `Ruota ${face} ${direction === 'cw' ? '↻' : '↺'}`)
  }

  const undo = () => {
    setTimeline((prev) => {
      if (prev.index === 0) {
        return prev
      }
      return { ...prev, index: prev.index - 1 }
    })
  }

  const redo = () => {
    setTimeline((prev) => {
      if (prev.index >= prev.entries.length - 1) {
        return prev
      }
      return { ...prev, index: prev.index + 1 }
    })
  }

  const handleApplySolverMoves = (moves: Move[], options?: { label?: string }) => {
    if (!moves.length) {
      return
    }
    let nextState = cloneCube(cube)
    moves.forEach((move) => {
      nextState = applyMove(nextState, move)
    })
    const fullTouched = createFullTouchedMap()
    commitState(nextState, fullTouched, options?.label ?? `Applica ${moves.length} mosse solver`)
    setCompletedFaces(new Set(FACE_INPUT_ORDER))
    setActiveFace('U')
  }

  useEffect(() => {
    saveSession(cube, completedFaces, activeFace, touched)
  }, [cube, completedFaces, activeFace, touched])

  useEffect(() => {
    setCompletedFaces((prev) => {
      let changed = false
      const next = new Set(prev)
      prev.forEach((face) => {
        if (faceIssues[face]?.length) {
          if (next.delete(face)) {
            changed = true
          }
        }
      })
      return changed ? next : prev
    })
  }, [faceIssues])

  return (
    <main className="app">
      <header className="app-header">
        <p className="eyebrow">Fase 1 · Input stato</p>
        <h1>Designer del Cubo</h1>
        <p className="subtitle">
          Visualizza le sei facce, segui la guida di mappatura e clicca sugli sticker per riportare lo stato reale del tuo cubo.
        </p>
      </header>

      <MappingGuide />

      <FaceWizard
        completedFaces={completedFaces}
        activeFace={activeFace}
        faceIssues={faceIssues}
        faceProgress={faceProgress}
        onFaceComplete={(face) => {
          setCompletedFaces((prev) => {
            const next = new Set(prev)
            next.add(face)
            return next
          })
          const currentIndex = FACE_INPUT_ORDER.findIndex((f) => f === face)
          const nextFace = FACE_INPUT_ORDER[Math.min(FACE_INPUT_ORDER.length - 1, currentIndex + 1)]
          setActiveFace(nextFace)
        }}
        onSetActiveFace={(face) => {
          const allowedIndex = completedFaces.size
          const targetIndex = FACE_INPUT_ORDER.findIndex((f) => f === face)
          if (targetIndex <= allowedIndex) {
            setActiveFace(face)
          }
        }}
        onRotateFace={handleRotateFace}
      />

      <FaceDiagnostics
        activeFace={activeFace}
        issues={issuesByFace[activeFace] ?? []}
      />

      <section className="palette">
        <p>Scegli il colore attivo</p>
        <div className="swatches">
          {palette.map((color) => (
            <div key={color} className="swatch-stack">
              <button
                type="button"
                className={`swatch ${selectedColor === color ? 'swatch-active' : ''}`}
                style={{ backgroundColor: color }}
                aria-label={`Seleziona ${color}`}
                onClick={() => setSelectedColor(color)}
              />
              <span className="swatch-counter">
                {colorCounts[color] ?? 0} sticker
              </span>
            </div>
          ))}
        </div>
        {guardMessage && <p className="palette-warning">{guardMessage}</p>}
      </section>
      <div className="actions">
        <button
          type="button"
          className="ghost"
          onClick={handleReset}
        >
          Reset cubo
        </button>
        <button
          type="button"
          className="ghost"
          onClick={handleClearCube}
        >
          Svuota cubo
        </button>
      </div>

      <HistoryPanel
        entries={timeline.entries.map(({ id, label }) => ({ id, label }))}
        currentIndex={timeline.index}
        onUndo={undo}
        onRedo={redo}
      />

      <StateTransferPanel
        state={cube}
        onImport={handleImport}
      />

      <section className="net-wrapper">
        <CubeNet
          state={cube}
          highlightedStickers={highlighted}
          issueMessages={issueMessages}
          onStickerClick={handleStickerClick}
          activeFace={activeFace}
        />
      </section>
      <ValidationPanel issues={validationIssues} />
      {solverStatus === 'complete' && (
        <section className="resolution-banner">
          <p className="eyebrow small">Fase 2 · completata</p>
          <h3>Cubo virtuale risolto</h3>
          <p>
            Hai applicato l&apos;intera sequenza sul cubo virtuale. Salva questo stato nella timeline o ricalcola una
            nuova soluzione per continuare gli esperimenti.
          </p>
        </section>
      )}
      <SolvePlayer
        state={cube}
        onApplyMoves={handleApplySolverMoves}
        onResolutionComplete={handleResolutionComplete}
        onResolutionReset={handleResolutionReset}
      />
    </main>
  )
}

export default App
