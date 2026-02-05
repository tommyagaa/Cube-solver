import { describe, it, expect } from 'vitest'
import type { Move } from './types'
import { createSolvedCube } from './state'
import { applyMove } from './moves'

const inverseMap: Record<Move, Move> = {
  U: "U'",
  "U'": 'U',
  U2: 'U2',
  D: "D'",
  "D'": 'D',
  D2: 'D2',
  F: "F'",
  "F'": 'F',
  F2: 'F2',
  B: "B'",
  "B'": 'B',
  B2: 'B2',
  L: "L'",
  "L'": 'L',
  L2: 'L2',
  R: "R'",
  "R'": 'R',
  R2: 'R2',
}

const moves: Move[] = [
  'U', "U'", 'U2',
  'D', "D'", 'D2',
  'F', "F'", 'F2',
  'B', "B'", 'B2',
  'L', "L'", 'L2',
  'R', "R'", 'R2',
]

describe('applyMove', () => {
  moves.forEach((move) => {
    it(`${move} seguito dalla sua inversa restituisce lo stato iniziale`, () => {
      const solved = createSolvedCube()
      const after = applyMove(solved, move)
      const back = applyMove(after, inverseMap[move])
      expect(back).toEqual(solved)
    })
  })
})