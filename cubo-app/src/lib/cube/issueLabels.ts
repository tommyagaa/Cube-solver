import type { ValidationIssue } from './validation'

type IssueType = ValidationIssue['type']

export const ISSUE_LABELS: Record<IssueType, string> = {
  'color-count': 'Conteggio colori',
  'duplicate-piece': 'Pezzo duplicato',
  orientation: 'Orientamento',
  parity: 'Parita',
  incomplete: 'Sticker mancanti',
}
