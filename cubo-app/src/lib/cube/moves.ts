import type { CubeState, Face, FaceStickers, Move, MoveBase, MoveModifier} from './types'

import { cloneCube, createSolvedCube } from './state'
import { FACES } from './types'

// Ruota una faccia di 90° *clockwiseQuarterTurns* volte (clockwise = 1)
const rotateFace = (
  stickers: FaceStickers,
  clockwiseQuarterTurns: 0 | 1 | 2 | 3,
): FaceStickers => {
  if (clockwiseQuarterTurns === 0) return [...stickers] as FaceStickers

  const mapping: Record<
    number,
    Record<typeof clockwiseQuarterTurns, number>
  > = {
    0: { 1: 6, 2: 8, 3: 2 },
    1: { 1: 3, 2: 7, 3: 5 },
    2: { 1: 0, 2: 6, 3: 8 },
    3: { 1: 7, 2: 5, 3: 1 },
    4: { 1: 4, 2: 4, 3: 4 },
    5: { 1: 1, 2: 3, 3: 7 },
    6: { 1: 8, 2: 2, 3: 0 },
    7: { 1: 5, 2: 1, 3: 3 },
    8: { 1: 2, 2: 0, 3: 6 },
  }

  const result = [...stickers] as FaceStickers
  Object.keys(mapping).forEach((key) => {
    const index = Number(key)
    const sourceIndex = mapping[index][clockwiseQuarterTurns]
    result[index] = stickers[sourceIndex]
  })
  return result
}
type StickerRef = { face: Face; index: number }
type StickerCycle = StickerRef[]

const cycle = (...refs: StickerRef[]): StickerCycle => refs



// applica un ciclo di sticker (A→B→C→D→A)
const applyStickerCycle = (state: CubeState, cycle: StickerCycle) => {
  if (cycle.length === 0) return
  const last = cycle[cycle.length - 1]
  const buffer = state[last.face][last.index]

  for (let i = cycle.length - 1; i > 0; i--) {
    const current = cycle[i]
    const previous = cycle[i - 1]
    state[current.face][current.index] = state[previous.face][previous.index]
  }

  const first = cycle[0]
  state[first.face][first.index] = buffer
}

type MoveDefinition = {
  face: Face
  cycles: StickerCycle[]
}

const MOVE_DEFINITIONS: Record<MoveBase, MoveDefinition> = {
  U: {
    face: 'U',
    cycles: [
      cycle({ face: 'F', index: 0 }, { face: 'R', index: 0 }, { face: 'B', index: 0 }, { face: 'L', index: 0 }),
      cycle({ face: 'F', index: 1 }, { face: 'R', index: 1 }, { face: 'B', index: 1 }, { face: 'L', index: 1 }),
      cycle({ face: 'F', index: 2 }, { face: 'R', index: 2 }, { face: 'B', index: 2 }, { face: 'L', index: 2 }),
    ],
  },
  D: {
    face: 'D',
    cycles: [
      cycle({ face: 'F', index: 6 }, { face: 'L', index: 6 }, { face: 'B', index: 6 }, { face: 'R', index: 6 }),
      cycle({ face: 'F', index: 7 }, { face: 'L', index: 7 }, { face: 'B', index: 7 }, { face: 'R', index: 7 }),
      cycle({ face: 'F', index: 8 }, { face: 'L', index: 8 }, { face: 'B', index: 8 }, { face: 'R', index: 8 }),
    ],
  },
  R: {
    face: 'R',
    cycles: [
      cycle({ face: 'U', index: 2 }, { face: 'F', index: 2 }, { face: 'D', index: 2 }, { face: 'B', index: 6 }),
      cycle({ face: 'U', index: 5 }, { face: 'F', index: 5 }, { face: 'D', index: 5 }, { face: 'B', index: 3 }),
      cycle({ face: 'U', index: 8 }, { face: 'F', index: 8 }, { face: 'D', index: 8 }, { face: 'B', index: 0 }),
    ],
  },
  L: {
    face: 'L',
    cycles: [
      cycle({ face: 'U', index: 0 }, { face: 'B', index: 2 }, { face: 'D', index: 6 }, { face: 'F', index: 0 }),
      cycle({ face: 'U', index: 3 }, { face: 'B', index: 5 }, { face: 'D', index: 3 }, { face: 'F', index: 3 }),
      cycle({ face: 'U', index: 6 }, { face: 'B', index: 8 }, { face: 'D', index: 0 }, { face: 'F', index: 6 }),
    ],
  },
  F: {
    face: 'F',
    cycles: [
      cycle({ face: 'U', index: 6 }, { face: 'L', index: 8 }, { face: 'D', index: 2 }, { face: 'R', index: 0 }),
      cycle({ face: 'U', index: 7 }, { face: 'L', index: 5 }, { face: 'D', index: 1 }, { face: 'R', index: 3 }),
      cycle({ face: 'U', index: 8 }, { face: 'L', index: 2 }, { face: 'D', index: 0 }, { face: 'R', index: 6 }),
    ],
  },
  B: {
    face: 'B',
    cycles: [
      cycle({ face: 'U', index: 0 }, { face: 'R', index: 2 }, { face: 'D', index: 8 }, { face: 'L', index: 6 }),
      cycle({ face: 'U', index: 1 }, { face: 'R', index: 5 }, { face: 'D', index: 7 }, { face: 'L', index: 3 }),
      cycle({ face: 'U', index: 2 }, { face: 'R', index: 8 }, { face: 'D', index: 6 }, { face: 'L', index: 0 }),
    ],
  },
}
//traduce il suffisso nel numero di quarti di giro
const MODIFIER_TURNS: Record<MoveModifier, 1 | 2 | 3> = {
  '': 1,
  "'": 3,
  '2': 2,
}

const parseMove = (move: Move): { base: MoveBase; turns: 1 | 2 | 3 } => {
  const base = move[0] as MoveBase
  const modifier = (move[1] ?? '') as MoveModifier
  const turns = MODIFIER_TURNS[modifier]
  return { base, turns }
}

export const applyMove = (state: CubeState, move: Move): CubeState => {
  const { base, turns } = parseMove(move)
  const definition = MOVE_DEFINITIONS[base]
  if (!definition) throw new Error(`Move ${move} non supportata`)

  const next = cloneCube(state)

  for (let i = 0; i < turns; i++) {
    next[definition.face] = rotateFace(next[definition.face], 1)
    definition.cycles.forEach((cycle) => applyStickerCycle(next, cycle))
  }

  return next
}