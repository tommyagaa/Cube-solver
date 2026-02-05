import { useMemo, useRef, useState } from 'react'
import CubeNet from './components/CubeNet'
import MappingGuide from './components/MappingGuide'
import ValidationPanel from './components/ValidationPanel'
import StateTransferPanel from './components/StateTransferPanel'
import HistoryPanel from './components/HistoryPanel'
import { createSolvedCube, cloneCube } from './lib/cube/state'
import type { Color, Face, CubeState } from './lib/cube/types'
import { validateCubeState } from './lib/cube/validation'
import './App.css'

const palette: Color[] = ['white', 'yellow', 'green', 'blue', 'orange', 'red']

type HistoryEntry = {
  id: number
  label: string
  state: CubeState
}

function App() {
  const [timeline, setTimeline] = useState(() => {
    const initial = createSolvedCube()
    return {
      entries: [{ id: 0, label: 'Stato iniziale', state: initial }] as HistoryEntry[],
      index: 0,
    }
  })
  const historyIdRef = useRef(1)
  const cube = timeline.entries[timeline.index]?.state ?? createSolvedCube()
  const [selectedColor, setSelectedColor] = useState<Color>('white')
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

  const commitState = (nextState: CubeState, label: string) => {
    setTimeline((prev) => {
      const base = prev.entries.slice(0, prev.index + 1)
      const entry: HistoryEntry = { id: historyIdRef.current++, label, state: cloneCube(nextState) }
      const entries = [...base, entry]
      return { entries, index: entries.length - 1 }
    })
  }

  const handleStickerClick = (face: Face, index: number) => {
    const next = cloneCube(cube)
    next[face][index] = selectedColor
    commitState(next, `Set ${face}${index} -> ${selectedColor}`)
  }

  const handleReset = () => {
    commitState(createSolvedCube(), 'Reset cubo')
  }

  const handleImport = (next: CubeState) => {
    commitState(next, 'Import JSON')
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
        />
      </section>
      <ValidationPanel issues={validationIssues} />
    </main>
  )
}

export default App
