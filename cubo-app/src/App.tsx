import { useEffect, useMemo, useRef, useState } from 'react'
import CubeNet from './components/CubeNet'
import MappingGuide from './components/MappingGuide'
import ValidationPanel from './components/ValidationPanel'
import StateTransferPanel from './components/StateTransferPanel'
import HistoryPanel from './components/HistoryPanel'
import FaceWizard from './components/FaceWizard'
import { createSolvedCube, cloneCube } from './lib/cube/state'
import type { Color, Face, CubeState } from './lib/cube/types'
import { validateCubeState } from './lib/cube/validation'
import { FACE_INPUT_ORDER } from './lib/cube/faceOrder'
import './App.css'

const palette: Color[] = ['white', 'yellow', 'green', 'blue', 'orange', 'red']

type HistoryEntry = {
  id: number
  label: string
  state: CubeState
}

const STORAGE_KEY = 'cubo-app/session-v1'

type SessionPayload = {
  cube: CubeState
  completedFaces: Face[]
  activeFace: Face
}

const loadSession = (): SessionPayload | null => {
  if (typeof window === 'undefined') {
    return null
  }

  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    return null
  }

  try {
    const parsed = JSON.parse(raw) as Partial<SessionPayload>
    if (!parsed.cube) {
      return null
    }

    const completedFaces = Array.isArray(parsed.completedFaces)
      ? parsed.completedFaces.filter((face): face is Face => FACE_INPUT_ORDER.includes(face as Face))
      : []

    const activeFace = FACE_INPUT_ORDER.includes(parsed.activeFace as Face) ? (parsed.activeFace as Face) : 'U'

    return {
      cube: parsed.cube as CubeState,
      completedFaces,
      activeFace,
    }
  } catch {
    return null
  }
}

const saveSession = (cube: CubeState, completedFaces: Set<Face>, activeFace: Face) => {
  if (typeof window === 'undefined') {
    return
  }

  const payload: SessionPayload = {
    cube: cloneCube(cube),
    completedFaces: Array.from(completedFaces),
    activeFace,
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
}

function App() {
  const sessionRef = useRef<SessionPayload | null>(loadSession())
  const session = sessionRef.current
  const initialCube = session?.cube ?? createSolvedCube()
  const initialCompleted = session?.completedFaces ?? []
  const initialActive = session?.activeFace ?? 'U'
  const initialLabel = session ? 'Sessione ripristinata' : 'Stato iniziale'

  const [timeline, setTimeline] = useState(() => {
    return {
      entries: [{ id: 0, label: initialLabel, state: cloneCube(initialCube) }] as HistoryEntry[],
      index: 0,
    }
  })
  const historyIdRef = useRef(1)
  const cube = timeline.entries[timeline.index]?.state ?? createSolvedCube()
  const [selectedColor, setSelectedColor] = useState<Color>('white')
  const [completedFaces, setCompletedFaces] = useState<Set<Face>>(() => new Set(initialCompleted))
  const [activeFace, setActiveFace] = useState<Face>(initialActive)
  const validationIssues = validateCubeState(cube)
  const { highlighted, issueMessages } = useMemo(() => {
    const highlightMap: Partial<Record<Face, Set<number>>> = {}
    const messageMap: Partial<Record<Face, Record<number, string[]>>> = {}

    validationIssues.forEach((issue) => {
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
      })
    })

    return { highlighted: highlightMap, issueMessages: messageMap }
  }, [validationIssues])

  const faceIssues = useMemo(() => {
    const map: Partial<Record<Face, string[]>> = {}
    validationIssues.forEach((issue) => {
      issue.stickers?.forEach(({ face }) => {
        if (!map[face]) {
          map[face] = []
        }
        if (!map[face]!.includes(issue.message)) {
          map[face]!.push(issue.message)
        }
      })
    })
    return map
  }, [validationIssues])

  const commitState = (nextState: CubeState, label: string) => {
    setTimeline((prev) => {
      const base = prev.entries.slice(0, prev.index + 1)
      const entry: HistoryEntry = { id: historyIdRef.current++, label, state: cloneCube(nextState) }
      const entries = [...base, entry]
      return { entries, index: entries.length - 1 }
    })
  }

  const handleStickerClick = (face: Face, index: number) => {
    if (face !== activeFace) {
      return
    }
    const next = cloneCube(cube)
    next[face][index] = selectedColor
    commitState(next, `Set ${face}${index} -> ${selectedColor}`)
  }

  const handleReset = () => {
    commitState(createSolvedCube(), 'Reset cubo')
    setCompletedFaces(new Set())
    setActiveFace('U')
  }

  const handleImport = (next: CubeState) => {
    commitState(next, 'Import JSON')
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
    saveSession(cube, completedFaces, activeFace)
  }, [cube, completedFaces, activeFace])

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
        cube={cube}
        completedFaces={completedFaces}
        activeFace={activeFace}
        faceIssues={faceIssues}
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

      <section className="palette">
        <p>Scegli il colore attivo</p>
        <div className="swatches">
          {palette.map((color) => (
            <button
              key={color}
              type="button"
              className={`swatch ${selectedColor === color ? 'swatch-active' : ''}`}
              style={{ backgroundColor: color }}
              aria-label={`Seleziona ${color}`}
              onClick={() => setSelectedColor(color)}
            />
          ))}
        </div>
      </section>
      <div className="actions">
        <button
          type="button"
          className="ghost"
          onClick={handleReset}
        >
          Reset cubo
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
    </main>
  )
}

export default App
