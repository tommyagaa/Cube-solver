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
import type { Color, Face, CubeState } from './lib/cube/types'
import { validateCubeState } from './lib/cube/validation'
import type { ValidationIssue } from './lib/cube/validation'
import { FACE_INPUT_ORDER } from './lib/cube/faceOrder'
import './App.css'

const palette: Color[] = ['white', 'yellow', 'green', 'blue', 'orange', 'red']
const MAX_COLOR_COUNT = 9

const STICKER_INDEXES = Array.from({ length: 9 }, (_, idx) => idx)
const CENTER_INDEX = 4

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
  const validationIssues = validateCubeState(cube)
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
      map[face] = {
        filled: touched[face]?.size ?? 0,
        total: STICKER_INDEXES.length,
      }
    })
    return map
  }, [touched])

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
    if (currentColor === selectedColor) {
      return
    }
    const next = cloneCube(cube)
    next[face][index] = selectedColor
    const nextTouched = cloneTouchedMap(touched)
    nextTouched[face]?.add(index)

    const potentialCount = (colorCounts[selectedColor] ?? 0) + 1
    if (potentialCount > MAX_COLOR_COUNT) {
      setGuardMessage(`Attenzione: avresti ${potentialCount} sticker ${selectedColor}. Libera uno sticker di quel colore prima di confermare il wizard.`)
    }

    commitState(next, nextTouched, `Set ${face}${index} -> ${selectedColor}`)
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
                className={`swatch ${selectedColor === color ? 'swatch-active' : ''} ${(colorCounts[color] ?? 0) > MAX_COLOR_COUNT ? 'swatch-over-limit' : ''}`}
                style={{ backgroundColor: color }}
                aria-label={`Seleziona ${color}`}
                onClick={() => setSelectedColor(color)}
              />
              <span className={`swatch-counter ${(colorCounts[color] ?? 0) > MAX_COLOR_COUNT ? 'over' : ''}`}>
                {colorCounts[color] ?? 0}/{MAX_COLOR_COUNT}
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
      <SolvePlayer state={cube} />
    </main>
  )
}

export default App
