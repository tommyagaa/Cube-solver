declare module 'cubejs' {
  export default class Cube {
    constructor()
    static initSolver(): void
    fromString(facelets: string): void
    solve(): string
  }
}
