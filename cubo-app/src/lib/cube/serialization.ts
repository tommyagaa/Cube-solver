import type { CubeState, Color, Face } from './types'
import { FACES } from './types'

const allowedColors = new Set<Color>([
  'white',
  'yellow',
  'green',
  'blue',
  'orange',
  'red',
])

export const cubeToJson = (state: CubeState) => JSON.stringify(state, null, 2)

type ParseSuccess = { success: true; cube: CubeState }
type ParseFailure = { success: false; error: string }

export const parseCubeState = (input: string): ParseSuccess | ParseFailure => {
  let data: unknown
  try {
    data = JSON.parse(input)
  } catch {
    return { success: false, error: 'JSON non valido.' }
  }

  if (typeof data !== 'object' || data === null) {
    return { success: false, error: 'Il payload deve essere un oggetto con le facce del cubo.' }
  }

  const nextState: Partial<Record<Face, Color[]>> = {}

  for (const face of FACES) {
    const stickers = (data as Record<string, unknown>)[face]
    if (!Array.isArray(stickers) || stickers.length !== 9) {
      return { success: false, error: `La faccia ${face} deve avere 9 sticker.` }
    }

    const parsedFace: Color[] = []
    for (const sticker of stickers) {
      if (typeof sticker !== 'string' || !allowedColors.has(sticker as Color)) {
        return { success: false, error: `Sticker non valido rilevato sulla faccia ${face}.` }
      }
      parsedFace.push(sticker as Color)
    }

    nextState[face] = parsedFace
  }

  return { success: true, cube: nextState as CubeState }
}
