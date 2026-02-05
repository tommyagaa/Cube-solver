import type { CubeState, FaceStickers } from './types'
import { DEFAULT_FACE_COLORS, FACES, PLACEHOLDER_COLOR } from './types'

//funzione di utilità: restituisce un array di 9 sticker tutti dello stesso colore
const fillFace=(color: FaceStickers[number]): FaceStickers=> Array(9).fill(color) as FaceStickers

export const createSolvedCube = (): CubeState => {
    const state ={} as CubeState

    FACES.forEach((face) =>{
        state[face] = fillFace(DEFAULT_FACE_COLORS[face])
    })
    return state
}

export const createEmptyCube = (): CubeState => {
    const state ={} as CubeState

    FACES.forEach((face) =>{
        const stickers = fillFace(PLACEHOLDER_COLOR)
        stickers[4] = DEFAULT_FACE_COLORS[face]
        state[face] = stickers
    })
    return state
}

export const cloneCube = (state: CubeState): CubeState => {
    const clone = {} as CubeState

    FACES.forEach((face) =>{
        clone[face] = [...state[face]] as FaceStickers
    })
    return clone
}