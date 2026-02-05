import { DEFAULT_FACE_COLORS } from '../lib/cube/types'
import type { Face } from '../lib/cube/types'

const steps = [
  'Posiziona il cubo con il bianco (U) rivolto verso l\'alto e il verde (F) verso di te. In questo modo l\'orientamento corrisponde alla net 2D.',
  'Compila una faccia alla volta seguendo l\'ordine U -> L -> F -> R -> B -> D. Quando cambi lato, ruota il cubo fisico mantenendo il bianco sempre in alto.',
  'Clicca sugli sticker nella griglia e assegna il colore con la palette in alto. Se sbagli, puoi semplicemente ricolorarli o ripartire con "Reset cubo".',
  'Controlla il riquadro Diagnostica: segnala contatori errati, pezzi duplicati, orientamenti impossibili e parita non risolvibili.',
]

const faceMeta: Array<{ face: Face; label: string; hint: string }> = [
  { face: 'U', label: 'Up · Alto', hint: 'Colore bianco, resta sempre rivolto verso il cielo.' },
  { face: 'L', label: 'Left · Sinistra', hint: 'Colore arancione, subito a sinistra del verde frontale.' },
  { face: 'F', label: 'Front · Fronte', hint: 'Colore verde, e la faccia che guardi mentre inserisci i dati.' },
  { face: 'R', label: 'Right · Destra', hint: 'Colore rosso, si trova a destra del fronte verde.' },
  { face: 'B', label: 'Back · Retro', hint: 'Colore blu, opposto al fronte: ruota il cubo senza cambiare l\'orientamento di U.' },
  { face: 'D', label: 'Down · Basso', hint: 'Colore giallo, completa la croce una volta compilati gli altri lati.' },
]

const MappingGuide = () => {
  return (
    <section className="mapping-guide">
      <header>
        <p className="eyebrow small">Mappatura</p>
        <h2>Allinea il cubo fisico</h2>
        <p className="mapping-subtitle">
          Segui questi passaggi per evitare stati impossibili mentre riporti i colori nella net 2D.
        </p>
      </header>

      <ol className="guide-steps">
        {steps.map((text, idx) => (
          <li key={text} className="guide-step">
            <span className="step-index">{idx + 1}</span>
            <p>{text}</p>
          </li>
        ))}
      </ol>

      <div className="face-map">
        {faceMeta.map((meta) => (
          <article key={meta.face} className="face-chip">
            <span className="chip-dot" style={{ backgroundColor: DEFAULT_FACE_COLORS[meta.face] }} />
            <div>
              <p className="chip-face">{meta.face} · {meta.label}</p>
              <p className="chip-hint">{meta.hint}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

export default MappingGuide
