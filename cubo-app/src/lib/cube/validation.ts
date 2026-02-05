import type { CubeState, Face, Color } from './types'
import { DEFAULT_FACE_COLORS } from './types'
import { createSolvedCube } from './state'

export type ValidationIssue = {
  type: 'color-count' | 'duplicate-piece' | 'orientation' | 'parity'
  message: string
}

const cornerDefinitions = [
  { id: 'UFR', stickers: [['U', 8], ['F', 2], ['R', 0]] },
  { id: 'URB', stickers: [['U', 2], ['R', 2], ['B', 0]] },
  { id: 'UBL', stickers: [['U', 0], ['B', 2], ['L', 0]] },
  { id: 'ULF', stickers: [['U', 6], ['L', 2], ['F', 0]] },
  { id: 'DFR', stickers: [['D', 2], ['F', 8], ['R', 6]] },
  { id: 'DRB', stickers: [['D', 8], ['R', 8], ['B', 6]] },
  { id: 'DBL', stickers: [['D', 6], ['B', 8], ['L', 6]] },
  { id: 'DLF', stickers: [['D', 0], ['L', 8], ['F', 6]] },
] as const satisfies Array<{
  id: string
  stickers: Array<[Face, number]>
}>

const edgeDefinitions = [
  { id: 'UF', stickers: [['U', 7], ['F', 1]] },
  { id: 'UR', stickers: [['U', 5], ['R', 1]] },
  { id: 'UB', stickers: [['U', 1], ['B', 1]] },
  { id: 'UL', stickers: [['U', 3], ['L', 1]] },
  { id: 'FR', stickers: [['F', 5], ['R', 3]] },
  { id: 'RB', stickers: [['R', 5], ['B', 3]] },
  { id: 'BL', stickers: [['B', 5], ['L', 3]] },
  { id: 'LF', stickers: [['L', 5], ['F', 3]] },
  { id: 'DF', stickers: [['D', 1], ['F', 7]] },
  { id: 'DR', stickers: [['D', 5], ['R', 7]] },
  { id: 'DB', stickers: [['D', 7], ['B', 7]] },
  { id: 'DL', stickers: [['D', 3], ['L', 7]] },
] as const

const sortedKey = (colors: string[]) => [...colors].sort().join('-')

const solvedState = createSolvedCube()

const canonicalCornerKeys = new Map<string, string>()
cornerDefinitions.forEach((def) => {
  const colors = def.stickers.map(([face]) => solvedState[face][4])
  canonicalCornerKeys.set(sortedKey(colors), def.id)
})

const canonicalEdgeKeys = new Map<string, string>()
edgeDefinitions.forEach((def) => {
  const colors = def.stickers.map(([face]) => solvedState[face][4])
  canonicalEdgeKeys.set(sortedKey(colors), def.id)
})

export const collectColorCounts = (state: CubeState) => {
  const counts: Record<string, number> = {}
  Object.values(state).forEach((stickers) => {
    stickers.forEach((color) => {
      counts[color] = (counts[color] || 0) + 1
    })
  })
  return counts
}

const expectedColors = new Set<Color>(Object.values(DEFAULT_FACE_COLORS))

const validateColorCounts = (state: CubeState, issues: ValidationIssue[]) => {
  const counts = collectColorCounts(state)
  expectedColors.forEach((color) => {
    const current = counts[color] ?? 0
    if (current !== 9) {
      issues.push({
        type: 'color-count',
        message: `Il colore "${color}" appare ${current} volte (atteso 9).`,
      })
    }
  })

  Object.keys(counts).forEach((color) => {
    if (!expectedColors.has(color as Color)) {
      issues.push({
        type: 'color-count',
        message: `Colore sconosciuto rilevato: "${color}".`,
      })
    }
  })
}

const collectCornerIssues = (state: CubeState, issues: ValidationIssue[]) => {
  const counts = new Map<string, number>()

  cornerDefinitions.forEach((def) => {
    const colors = def.stickers.map(([face, index]) => state[face][index])
    const key = sortedKey(colors)
    const canonicalId = canonicalCornerKeys.get(key)

    if (!canonicalId) {
      issues.push({
        type: 'duplicate-piece',
        message: `Corner definito da ${def.id} contiene combinazione colori non valida (${colors.join(', ')}).`,
      })
      return
    }

    counts.set(canonicalId, (counts.get(canonicalId) ?? 0) + 1)
  })

  cornerDefinitions.forEach((def) => {
    const seen = counts.get(def.id) ?? 0
    if (seen === 0) {
      issues.push({
        type: 'duplicate-piece',
        message: `Corner ${def.id} mancante nello stato inserito.`,
      })
    } else if (seen > 1) {
      issues.push({
        type: 'duplicate-piece',
        message: `Corner ${def.id} appare ${seen} volte.`,
      })
    }
  })
}

const collectEdgeIssues = (state: CubeState, issues: ValidationIssue[]) => {
  const counts = new Map<string, number>()

  edgeDefinitions.forEach((def) => {
    const colors = def.stickers.map(([face, index]) => state[face][index])
    const key = sortedKey(colors)
    const canonicalId = canonicalEdgeKeys.get(key)

    if (!canonicalId) {
      issues.push({
        type: 'duplicate-piece',
        message: `Spigolo definito da ${def.id} contiene combinazione non valida (${colors.join(', ')}).`,
      })
      return
    }

    counts.set(canonicalId, (counts.get(canonicalId) ?? 0) + 1)
  })

  edgeDefinitions.forEach((def) => {
    const seen = counts.get(def.id) ?? 0
    if (seen === 0) {
      issues.push({
        type: 'duplicate-piece',
        message: `Spigolo ${def.id} mancante nello stato inserito.`,
      })
    } else if (seen > 1) {
      issues.push({
        type: 'duplicate-piece',
        message: `Spigolo ${def.id} appare ${seen} volte.`,
      })
    }
  })
}

export const validateCubeState = (state: CubeState): ValidationIssue[] => {
  const issues: ValidationIssue[] = []

  validateColorCounts(state, issues)
  collectCornerIssues(state, issues)
  collectEdgeIssues(state, issues)

  return issues
}
