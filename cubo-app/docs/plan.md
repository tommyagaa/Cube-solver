# Piano Rubik Solver

## Convenzioni iniziali

### Facce e orientamento
- Facce fisse: U (Up), D (Down), F (Front), B (Back), L (Left), R (Right).
- Orientamento di riferimento: guardo F, U sta sopra, R sta a destra. Questa convenzione rimane valida per tutte le trasformazioni.
- Rotazioni positive seguono la regola della mano destra guardando la faccia interessata.

### Indici degli sticker (per ogni faccia)

```
0 1 2
3 4 5
6 7 8
```

- Indice 4 rappresenta il centro (colore di riferimento, non cambia mai).
- Usiamo questo ordine (row-major) per tutte le facce per facilitare le permutazioni.

### Colori dei centri

| Faccia | Colore | Nota |
| --- | --- | --- |
| U | bianco | riferimento lato superiore |
| D | giallo | opposto di U |
| F | verde | davanti rispetto all'osservatore |
| B | blu | dietro |
| L | arancione | lato sinistro |
| R | rosso | lato destro |

Gli utenti possono impostare qualsiasi combinazione di colori sugli sticker esterni; i centri fungono da legenda per riconoscere gli altri pezzi.

### Notazione delle mosse
- Singmaster standard: `R`, `L`, `U`, `D`, `F`, `B`.
- Suffissi: `'` (rotazione antioraria di 90°), `2` (rotazione di 180°).
- In futuro includeremo mosse di slice e rotazioni globali solo se necessarie per il solver, per ora non indispensabili.

### Modello dati preliminare
- `type Face = "U" | "D" | "F" | "B" | "L" | "R"`.
- `type Color = "white" | "yellow" | "green" | "blue" | "orange" | "red"` (nomi provvisori).
- `type CubeState = Record<Face, Color[]>` con array di 9 elementi per faccia (ordine come sopra).
- Funzioni base da implementare subito dopo il setup: `createSolvedCube()`, `cloneCube(state)`, `applyMove(state, move)`.

## Prossimi passi operativi
1. Inizializzare repo Git nella cartella root (`git init`).
2. Creare progetto React+TypeScript con Vite (`npm create vite@latest cubo-app -- --template react-ts`).
3. Configurare strumenti base: ESLint, Prettier, Vitest.
4. Aggiungere questo documento al repo e fare il primo commit.

Da qui possiamo procedere con l'implementazione del modello del cubo e delle mosse (Fase 0 della roadmap).
