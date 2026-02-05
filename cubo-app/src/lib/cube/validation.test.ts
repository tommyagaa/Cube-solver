import { describe, it, expect } from 'vitest'
import { createSolvedCube, cloneCube } from './state'
import { validateCubeState } from './validation'

const swapCorner = (
  state: ReturnType<typeof createSolvedCube>,
  cornerA: Array<[keyof typeof state, number]>,
  cornerB: Array<[keyof typeof state, number]>,
) => {
  const temp = cornerA.map(([face, idx]) => state[face][idx])
  cornerA.forEach(([face, idx], i) => {
    state[face][idx] = state[cornerB[i][0]][cornerB[i][1]]
  })
  cornerB.forEach(([face, idx], i) => {
    state[face][idx] = temp[i]
  })
}

describe('validateCubeState', () => {
  it('returns empty issues for solved cube', () => {
    const solved = createSolvedCube()
    const issues = validateCubeState(solved)
    expect(issues).toHaveLength(0)
  })

  it('detects parity issue when two corners are swapped', () => {
    const cube = cloneCube(createSolvedCube())
    const UFR: Array<[keyof typeof cube, number]> = [
      ['U', 8],
      ['F', 2],
      ['R', 0],
    ]
    const ULF: Array<[keyof typeof cube, number]> = [
      ['U', 6],
      ['L', 2],
      ['F', 0],
    ]

    swapCorner(cube, UFR, ULF)

    const issues = validateCubeState(cube)
    const parityIssue = issues.find((issue) => issue.type === 'parity')
    expect(parityIssue).toBeDefined()
  })
})
