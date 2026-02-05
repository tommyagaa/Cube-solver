export type Face = 'U' | 'D' | 'F'| 'B' |'L' |'R'
export const FACES: readonly Face[] =['U', 'D', 'F', 'B', 'L', 'R']
export type Color = 'white'| 'yellow' | 'green' |'blue' | 'orange' | 'red' | 'neutral'

export type FaceStickers = [
    Color, Color, Color,
    Color, Color, Color,
    Color, Color, Color
]

export type CubeState = Record<Face, FaceStickers>

export const DEFAULT_FACE_COLORS: Record<Face, Color> = {
    U: 'white',
    D: 'yellow',
    F: 'green',
    B: 'blue',
    L: 'orange',
    R: 'red'
}

export const PLACEHOLDER_COLOR: Color = 'neutral'

export type MoveBase = Face
export type MoveModifier = '' | "'" | '2'
export type Move = `${MoveBase}${MoveModifier}`