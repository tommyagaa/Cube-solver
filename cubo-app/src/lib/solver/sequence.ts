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

export type SolveStageId = 'white-cross' | 'full-solve'

export type SolveStage = {
  id: SolveStageId
  label: string
  description: string
  startMoveIndex: number
  endMoveIndex: number
  moveCount: number
  previewMoves: Move[]
}

export type SolvePlan = {
  phases: SolvePhase[]
  moves: Move[]
  frames: SolveFrame[]
  stages: SolveStage[]
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
  const cube = (Cube as unknown as { fromString: (input: string) => InstanceType<typeof Cube> }).fromString(toCubejsString(state))
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

const WHITE_CROSS_EDGES = [
  { upIndex: 7, face: 'F' as Face, index: 1 },
  { upIndex: 5, face: 'R' as Face, index: 1 },
  { upIndex: 1, face: 'B' as Face, index: 1 },
  { upIndex: 3, face: 'L' as Face, index: 1 },
]

const isWhiteCrossSolved = (state: CubeState) => {
  if (state.U[4] !== 'white') {
    return false
  }
  return WHITE_CROSS_EDGES.every(({ upIndex, face, index }) => {
    const upSticker = state.U[upIndex]
    const adjacentColor = state[face][index]
    return upSticker === 'white' && adjacentColor === state[face][4]
  })
}

const buildStages = (frames: SolveFrame[], moves: Move[]): SolveStage[] => {
  const stages: SolveStage[] = []
  let whiteCrossFrameIndex: number | null = null

  for (let i = 0; i < frames.length; i += 1) {
    if (isWhiteCrossSolved(frames[i].state)) {
      whiteCrossFrameIndex = i
      break
    }
  }

  if (whiteCrossFrameIndex !== null && whiteCrossFrameIndex > 0) {
    const moveCount = whiteCrossFrameIndex
    stages.push({
      id: 'white-cross',
      label: 'Croce bianca',
      description: 'Completa la croce sulla faccia superiore mantenendo gli spigoli allineati.',
      startMoveIndex: 0,
      endMoveIndex: moveCount - 1,
      moveCount,
      previewMoves: moves.slice(0, moveCount),
    })
  }

  if (moves.length) {
    stages.push({
      id: 'full-solve',
      label: 'Risoluzione completa',
      description: 'Sequenza completa generata dal solver.',
      startMoveIndex: 0,
      endMoveIndex: moves.length - 1,
      moveCount: moves.length,
      previewMoves: moves,
    })
  }

  return stages
}

const buildPlan = (state: CubeState, moves: Move[]): SolvePlan => {
  const frames = buildFrames(state, moves)
  return {
    phases: SOLVE_PHASES,
    moves,
    frames,
    stages: buildStages(frames, moves),
  }
}

export const createSolvePlan = (state: CubeState): SolvePlan => {
  const moves = deriveSolutionMoves(state)
  return buildPlan(state, moves)
}

export const createSolvePlanFromMoves = (state: CubeState, moves: Move[]): SolvePlan => {
  return buildPlan(state, moves)
}
