import { describe, expect, it } from 'vitest'
import { cubeToJson, parseCubeState } from './serialization'
import { createSolvedCube } from './state'

describe('serialization helpers', () => {
  it('serializes and parses a solved cube', () => {
    const solved = createSolvedCube()
    const json = cubeToJson(solved)
    const result = parseCubeState(json)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.cube).toEqual(solved)
    }
  })

  it('rejects json malformato', () => {
    const result = parseCubeState('not json')
    expect(result.success).toBe(false)
  })

  it('rifiuta colori non validi', () => {
    const payload = {
      U: Array(9).fill('white'),
      D: Array(9).fill('yellow'),
      F: Array(9).fill('green'),
      B: Array(9).fill('blue'),
      L: Array(9).fill('orange'),
      R: Array(8).fill('red').concat('pink'),
    }
    const result = parseCubeState(JSON.stringify(payload))
    expect(result.success).toBe(false)
  })
})
