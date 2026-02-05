import { useState } from 'react'
import CubeNet from './components/CubeNet'
import { createSolvedCube, cloneCube } from './lib/cube/state'
import type { Color } from './lib/cube/types'
import { validateCubeState } from './lib/cube/validation'
import './App.css'

const palette: Color[] = ['white', 'yellow', 'green', 'blue', 'orange', 'red']

function App() {
  const [cube, setCube] = useState(() => createSolvedCube())
  const [selectedColor, setSelectedColor] = useState<Color>('white')
  const validationIssues = validateCubeState(cube)
  const isValid = validationIssues.length === 0

  return (
    <main className="app">
      <header className="app-header">
        <p className="eyebrow">Fase 1 · Input stato</p>
        <h1>Designer del Cubo</h1>
        <p className="subtitle">
          Visualizza le sei facce e assegna i colori reali del tuo cubo. Gli input sono ancora in sola lettura.
        </p>
      </header>

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
        <button
          type="button"
          className="primary"
          disabled={!isValid}
          onClick={() => {
            const payload = JSON.stringify(cube, null, 2)
            console.log(payload)
            alert('Stato esportato in console (JSON).')
          }}
        >
          Esporta JSON
        </button>
      </div>


      <section className="net-wrapper">
        <CubeNet
          state={cube}
          onStickerClick={(face, index) => {
            setCube((prev) => {
              const next = cloneCube(prev)
              next[face][index] = selectedColor
              return next
            })
          }}
        />
      </section>
      <section className="diagnostics">
  <h2>Diagnostica</h2>
  {isValid ? (
    <p className="ok">Stato valido ✅</p>
  ) : (
    <ol className="issues">
      {validationIssues.map((issue, idx) => (
        <li key={`${issue.type}-${idx}`}>{issue.message}</li>
      ))}
    </ol>
  )}
</section>
    </main>
  )
}

export default App
