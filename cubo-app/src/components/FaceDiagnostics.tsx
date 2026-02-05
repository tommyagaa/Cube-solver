import type { Face } from '../lib/cube/types'
import type { ValidationIssue } from '../lib/cube/validation'
import { FACE_LABELS } from '../lib/cube/faceLabels'
import { ISSUE_LABELS } from '../lib/cube/issueLabels'

type FaceDiagnosticsProps = {
  activeFace: Face
  issues: ValidationIssue[]
}

const formatStickerRef = (face: Face, index: number) => `${face}${index}`

const FaceDiagnostics = ({ activeFace, issues }: FaceDiagnosticsProps) => {
  const hasIssues = issues.length > 0

  return (
    <section className="face-diagnostics">
      <div className="face-diagnostics-head">
        <div>
          <p className="eyebrow small">Faccia attiva</p>
          <h2>Controlli su {FACE_LABELS[activeFace]}</h2>
          <p className="diagnostics-subtitle">
            {hasIssues
              ? 'Risolvi questi problemi sulla faccia selezionata per poterla confermare.'
              : 'Nessun problema rilevato su questa faccia. Puoi procedere alla conferma.'}
          </p>
        </div>
        <span className={`status-pill ${hasIssues ? 'status-bad' : 'status-ok'}`}>
          {hasIssues ? `${issues.length} problemi` : 'Tutto ok'}
        </span>
      </div>

      {hasIssues ? (
        <ul className="face-issues">
          {issues.map((issue, idx) => {
            const localStickers = issue.stickers?.filter((sticker) => sticker.face === activeFace) ?? []
            return (
              <li key={`${issue.type}-${idx}`} className="face-issue-item">
                <span className={`issue-tag issue-${issue.type}`}>{ISSUE_LABELS[issue.type]}</span>
                <p>{issue.message}</p>
                {localStickers.length > 0 && (
                  <p className="issue-stickers">
                    Sticker di questa faccia: {localStickers.map(({ face, index }) => formatStickerRef(face, index)).join(', ')}
                  </p>
                )}
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="ok">Faccia pronta ✅</p>
      )}
    </section>
  )
}

export default FaceDiagnostics
