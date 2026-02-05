import type { CubeState,Face,FaceStickers } from './types'
import { DEFAULT_FACE_COLORS,FACES } from './types'

//funzione di utilità: restituisce un array di 9 sticker tutti dello stesso colore
const fillFace=(color: FaceStickers[number]): FaceStickers=> Array(9).fill(color) as FaceStickers

export const createSolvedCube = (): CubeState => {
    const state ={} as CubeState

    FACES.forEach((face) =>{
        state[face] = fillFace(DEFAULT_FACE_COLORS[face])
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