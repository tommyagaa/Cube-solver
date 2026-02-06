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

export type SolveStageId = 'white-cross' | 'first-layer' | 'second-layer' | 'pll' | 'full-solve'

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

type StandardColor = Exclude<Color, 'neutral'>

const STANDARD_COLORS: StandardColor[] = ['white', 'yellow', 'green', 'blue', 'orange', 'red']

const REQUIRED_COLOR_COUNTS: Record<StandardColor, number> = {
  white: 9,
  yellow: 9,
  green: 9,
  blue: 9,
  orange: 9,
  red: 9,
}

const COLOR_TO_FACE_CODE: Record<StandardColor, string> = {
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

const countColors = (state: CubeState) => {
  const counts: Record<StandardColor, number> = {
    white: 0,
    yellow: 0,
    green: 0,
    blue: 0,
    orange: 0,
    red: 0,
  }
  CUBEJS_FACE_ORDER.forEach((face) => {
    state[face].forEach((color) => {
      if (color !== 'neutral') {
        counts[color as StandardColor] += 1
      }
    })
  })
  return counts
}

const ensureValidColorDistribution = (state: CubeState) => {
  const counts = countColors(state)
  const issues: string[] = []
  STANDARD_COLORS.forEach((color) => {
    if (counts[color] !== REQUIRED_COLOR_COUNTS[color]) {
      issues.push(`${color}: ${counts[color]}/${REQUIRED_COLOR_COUNTS[color]}`)
    }
  })
  if (issues.length) {
    throw new Error(
      `Impossibile calcolare una soluzione: distribuzione colori non valida (${issues.join(
        ', ',
      )}). Ogni colore deve comparire esattamente 9 volte.`,
    )
  }
}

const toCubejsString = (state: CubeState): string => {
  ensureNoPlaceholders(state)
  ensureValidColorDistribution(state)
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

type CubeInternal = InstanceType<typeof Cube> & {
  cp: number[]
  co: number[]
  ep: number[]
  eo: number[]
}

const orientationSumIsValid = (orientations: number[], modulo: number) => {
  const sum = orientations.reduce((acc, value) => acc + value, 0)
  return sum % modulo === 0
}

const permutationParity = (permutation: number[]) => {
  const visited = new Array(permutation.length).fill(false)
  let parity = 0
  for (let i = 0; i < permutation.length; i += 1) {
    if (visited[i]) {
      continue
    }
    let cycleLength = 0
    let j = i
    while (!visited[j]) {
      visited[j] = true
      j = permutation[j]
      cycleLength += 1
    }
    if (cycleLength > 0) {
      parity = (parity + cycleLength - 1) % 2
    }
  }
  return parity
}

const ensureReachableConfiguration = (cube: CubeInternal) => {
  if (!orientationSumIsValid(cube.co, 3)) {
    throw new Error('Impossibile calcolare una soluzione: orientamento degli angoli non valido.')
  }
  if (!orientationSumIsValid(cube.eo, 2)) {
    throw new Error('Impossibile calcolare una soluzione: orientamento degli spigoli non valido.')
  }
  const cornerParity = permutationParity(cube.cp)
  const edgeParity = permutationParity(cube.ep)
  if (cornerParity !== edgeParity) {
    throw new Error('Impossibile calcolare una soluzione: permutazione non raggiungibile (parita errata).')
  }
}

const deriveSolutionMoves = (state: CubeState): Move[] => {
  const cube = (Cube as unknown as { fromString: (input: string) => InstanceType<typeof Cube> }).fromString(
    toCubejsString(state),
  ) as CubeInternal
  ensureReachableConfiguration(cube)
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

const WHITE_CORNERS: Array<{ upIndex: number; faces: Array<{ face: Face; index: number }> }> = [
  { upIndex: 8, faces: [{ face: 'F', index: 2 }, { face: 'R', index: 0 }] },
  { upIndex: 6, faces: [{ face: 'F', index: 0 }, { face: 'L', index: 2 }] },
  { upIndex: 0, faces: [{ face: 'B', index: 2 }, { face: 'L', index: 0 }] },
  { upIndex: 2, faces: [{ face: 'B', index: 0 }, { face: 'R', index: 2 }] },
]

const SECOND_LAYER_EDGES: Array<{ faces: Array<{ face: Face; index: number }> }> = [
  { faces: [{ face: 'F', index: 3 }, { face: 'L', index: 5 }] },
  { faces: [{ face: 'F', index: 5 }, { face: 'R', index: 3 }] },
  { faces: [{ face: 'B', index: 5 }, { face: 'L', index: 3 }] },
  { faces: [{ face: 'B', index: 3 }, { face: 'R', index: 5 }] },
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

const isFirstLayerSolved = (state: CubeState) => {
  if (!isWhiteCrossSolved(state)) {
    return false
  }
  return WHITE_CORNERS.every(({ upIndex, faces }) => {
    if (state.U[upIndex] !== 'white') {
      return false
    }
    return faces.every(({ face, index }) => state[face][index] === state[face][4])
  })
}

const isSecondLayerSolved = (state: CubeState) => {
  if (!isFirstLayerSolved(state)) {
    return false
  }
  const topColor = state.U[4]
  const bottomColor = state.D[4]
  return SECOND_LAYER_EDGES.every(({ faces }) => {
    return faces.every(({ face, index }) => {
      const color = state[face][index]
      if (color === topColor || color === bottomColor) {
        return false
      }
      return color === state[face][4]
    })
  })
}

const isOllSolved = (state: CubeState) => {
  if (!isSecondLayerSolved(state)) {
    return false
  }
  const downColor = state.D[4]
  return state.D.every((color) => color === downColor)
}

const isCubeSolved = (state: CubeState) => {
  return CUBEJS_FACE_ORDER.every((face) => {
    const faceColor = state[face][4]
    return state[face].every((sticker) => sticker === faceColor)
  })
}

const buildStages = (frames: SolveFrame[], moves: Move[]): SolveStage[] => {
  const stages: SolveStage[] = []
  let whiteCrossFrameIndex: number | null = null
  let firstLayerFrameIndex: number | null = null
  let secondLayerFrameIndex: number | null = null
  let ollFrameIndex: number | null = null
  let solvedFrameIndex: number | null = null

  for (let i = 0; i < frames.length; i += 1) {
    const frameState = frames[i].state
    if (whiteCrossFrameIndex == null && isWhiteCrossSolved(frameState)) {
      whiteCrossFrameIndex = i
    }
    if (firstLayerFrameIndex == null && isFirstLayerSolved(frameState)) {
      firstLayerFrameIndex = i
    }
    if (secondLayerFrameIndex == null && isSecondLayerSolved(frameState)) {
      secondLayerFrameIndex = i
    }
    if (ollFrameIndex == null && isOllSolved(frameState)) {
      ollFrameIndex = i
    }
    if (solvedFrameIndex == null && isCubeSolved(frameState)) {
      solvedFrameIndex = i
      break
    }
  }

  let lastFrameIndex = 0
  const registerStage = (
    stage: {
      id: SolveStageId
      label: string
      description: string
      completionFrameIndex: number | null
      customStartFrameIndex?: number
    },
  ) => {
    const { completionFrameIndex, customStartFrameIndex, id, label, description } = stage
    if (completionFrameIndex == null) {
      return
    }
    const startFrameIndex = customStartFrameIndex ?? lastFrameIndex
    if (completionFrameIndex <= startFrameIndex) {
      lastFrameIndex = Math.max(lastFrameIndex, completionFrameIndex)
      return
    }
    const startMoveIndex = startFrameIndex
    const endMoveIndex = completionFrameIndex - 1
    const moveCount = endMoveIndex - startMoveIndex + 1
    if (moveCount <= 0) {
      lastFrameIndex = Math.max(lastFrameIndex, completionFrameIndex)
      return
    }
    stages.push({
      id,
      label,
      description,
      startMoveIndex,
      endMoveIndex,
      moveCount,
      previewMoves: moves.slice(startMoveIndex, completionFrameIndex),
    })
    lastFrameIndex = Math.max(lastFrameIndex, completionFrameIndex)
  }

  registerStage({
    id: 'white-cross',
    label: 'Croce bianca',
    description: 'Completa la croce sulla faccia superiore mantenendo gli spigoli allineati.',
    completionFrameIndex: whiteCrossFrameIndex,
  })

  registerStage({
    id: 'first-layer',
    label: 'Primo strato',
    description: 'Completa gli angoli bianchi e allinea il primo strato.',
    completionFrameIndex: firstLayerFrameIndex,
  })

  registerStage({
    id: 'second-layer',
    label: 'Secondo strato',
    description: 'Inserisci gli spigoli della fascia centrale senza alterare il bianco.',
    completionFrameIndex: secondLayerFrameIndex,
  })

  registerStage({
    id: 'pll',
    label: 'Permutazione finale (PLL)',
    description: 'Permuta gli ultimi pezzi mantenendo orientati gli sticker gialli.',
    completionFrameIndex: solvedFrameIndex,
    customStartFrameIndex: ollFrameIndex ?? lastFrameIndex,
  })

  if (moves.length) {
    stages.push({
      id: 'full-solve',
      label: 'Risoluzione completa',
      description: 'Sequenza completa generata dal solver.',
      startMoveIndex: 0,
      endMoveIndex: moves.length - 1,
      moveCount: moves.length,
      previewMoves: moves.slice(0),
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
