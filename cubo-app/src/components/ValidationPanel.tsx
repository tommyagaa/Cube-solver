import type { ValidationIssue } from '../lib/cube/validation'

type IssueType = ValidationIssue['type']

const ISSUE_LABELS: Record<IssueType, string> = {
  'color-count': 'Conteggio colori',
  'duplicate-piece': 'Pezzo duplicato',
  orientation: 'Orientamento',
  parity: 'Parita',
}

const issueCountByType = (issues: ValidationIssue[]) => {
  return issues.reduce<Record<IssueType, number>>((acc, issue) => {
    acc[issue.type] = (acc[issue.type] ?? 0) + 1
    return acc
  }, {} as Record<IssueType, number>)
}

type ValidationPanelProps = {
  issues: ValidationIssue[]
}

const formatStickerRef = (face: string, index: number) => `${face}${index}`

const ValidationPanel = ({ issues }: ValidationPanelProps) => {
  const isValid = issues.length === 0
  const counts = issueCountByType(issues)

  return (
    <section className="diagnostics">
      <div className="diagnostics-head">
        <div>
          <h2>Diagnostica</h2>
          <p className="diagnostics-subtitle">
            {isValid ? 'Tutto torna. Puoi esportare lo stato.' : 'Risolvi i problemi qui sotto per ottenere uno stato risolvibile.'}
          </p>
        </div>
        <span className={`status-pill ${isValid ? 'status-ok' : 'status-bad'}`}>
          {isValid ? 'Stato valido' : `${issues.length} problemi`}
        </span>
      </div>

      {isValid ? (
        <p className="ok">Stato valido ✅</p>
      ) : (
        <>
          <p className="issue-hint">Gli sticker citati qui sotto sono gia evidenziati sulla net 2D e mostrano il motivo al passaggio del mouse.</p>
          <div className="issue-summary">
            {(Object.keys(counts) as IssueType[]).map((type) => (
              <span key={type} className="summary-pill">
                {counts[type]}× {ISSUE_LABELS[type]}
              </span>
            ))}
          </div>
          <ol className="issues">
            {issues.map((issue, idx) => (
              <li key={`${issue.type}-${idx}`} className="issue-item">
                <span className={`issue-tag issue-${issue.type}`}>{ISSUE_LABELS[issue.type]}</span>
                <p>{issue.message}</p>
                {issue.stickers && issue.stickers.length > 0 && (
                  <p className="issue-stickers">
                    Sticker coinvolti: {issue.stickers.map(({ face, index }) => formatStickerRef(face, index)).join(', ')}
                  </p>
                )}
              </li>
            ))}
          </ol>
        </>
      )}
    </section>
  )
}

export default ValidationPanel
