import { useMemo, useState } from 'react'
import CubeNet from './components/CubeNet'
import MappingGuide from './components/MappingGuide'
import ValidationPanel from './components/ValidationPanel'
import StateTransferPanel from './components/StateTransferPanel'
import { createSolvedCube, cloneCube } from './lib/cube/state'
import type { Color, Face } from './lib/cube/types'
import { validateCubeState } from './lib/cube/validation'
import './App.css'

const palette: Color[] = ['white', 'yellow', 'green', 'blue', 'orange', 'red']

function App() {
  const [cube, setCube] = useState(() => createSolvedCube())
  const [selectedColor, setSelectedColor] = useState<Color>('white')
  const validationIssues = validateCubeState(cube)
  const highlighted = useMemo(() => {
    const map: Partial<Record<Face, Set<number>>> = {}
    validationIssues.forEach((issue) => {
      issue.stickers?.forEach(({ face, index }) => {
        if (!map[face]) {
          map[face] = new Set<number>()
        }
        map[face]!.add(index)
      })
    })
    return map
  }, [validationIssues])

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
          onClick={() => setCube(createSolvedCube())}
        >
          Reset cubo
        </button>
      </div>

      <StateTransferPanel
        state={cube}
        onImport={(next) => {
          setCube(cloneCube(next))
        }}
      />

      <section className="net-wrapper">
        <CubeNet
          state={cube}
          highlightedStickers={highlighted}
          onStickerClick={(face, index) => {
            setCube((prev) => {
              const next = cloneCube(prev)
              next[face][index] = selectedColor
              return next
            })
          }}
        />
      </section>
      <ValidationPanel issues={validationIssues} />
    </main>
  )
}

export default App
