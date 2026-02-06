import Cube from 'cubejs'
import type { CubeState, Face, Move, Color } from '../cube/types'
import { applyMove } from '../cube/moves'
import { cloneCube } from '../cube/state'

Cube.initSolver()

export type SolvePhaseId = 'input' | 'auto'

export type SolvePhase = {
  id: SolvePhaseId
  title: string
  description: string
}

export type SolveFrame = {
  index: number
  move: Move | null
  notation: string
  state: CubeState
  phase: SolvePhaseId
}

export type SolvePlan = {
  phases: SolvePhase[]
  moves: Move[]
  frames: SolveFrame[]
}

const SOLVE_PHASES: SolvePhase[] = [
  {
    id: 'input',
    title: 'Stato inserito',
    description: 'Configurazione fornita tramite il wizard di mapping.',
  },
  {
    id: 'auto',
    title: 'Risoluzione automatica',
    description: 'Sequenza ottimizzata calcolata dal solver interno.',
  },
]

const CUBEJS_FACE_ORDER: Face[] = ['U', 'R', 'F', 'D', 'L', 'B']

const COLOR_TO_FACE_CODE: Record<Exclude<Color, 'neutral'>, string> = {
  white: 'U',
  yellow: 'D',
  green: 'F',
  blue: 'B',
  orange: 'L',
  red: 'R',
}

const ensureNoPlaceholders = (state: CubeState) => {
  CUBEJS_FACE_ORDER.forEach((face) => {
    state[face].forEach((color, index) => {
      if (color === 'neutral') {
        throw new Error(
          `Impossibile calcolare una soluzione: lo sticker ${face}${index} non è ancora stato assegnato.`,
        )
      }
    })
  })
}

const toCubejsString = (state: CubeState): string => {
  ensureNoPlaceholders(state)
  const facelets: string[] = []
  CUBEJS_FACE_ORDER.forEach((face) => {
    state[face].forEach((color) => {
      const code = COLOR_TO_FACE_CODE[color as Exclude<Color, 'neutral'>]
      if (!code) {
        throw new Error(`Colore ${color} non mappato nel solver.`)
      }
      facelets.push(code)
    })
  })
  return facelets.join('')
}

const deriveSolutionMoves = (state: CubeState): Move[] => {
  const cube = new Cube()
  cube.fromString(toCubejsString(state))
  const solution = cube.solve()?.trim()
  if (!solution) {
    return []
  }
  return solution.split(/\s+/) as Move[]
}

const buildFrames = (initial: CubeState, moves: Move[]): SolveFrame[] => {
  const frames: SolveFrame[] = []
  let current = cloneCube(initial)
  frames.push({
    index: 0,
    move: null,
    notation: 'Start',
    state: current,
    phase: 'input',
  })

  moves.forEach((move, idx) => {
    current = applyMove(current, move)
    frames.push({
      index: idx + 1,
      move,
      notation: move,
      state: current,
      phase: 'auto',
    })
  })

  return frames
}

export const createSolvePlan = (state: CubeState): SolvePlan => {
  const moves = deriveSolutionMoves(state)
  const frames = buildFrames(state, moves)
  return {
    phases: SOLVE_PHASES,
    moves,
    frames,
  }
}
