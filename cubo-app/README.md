# Rubick · Designer e Solver del Cubo 3x3

Applicazione React + Vite che guida l'utente nella mappatura dello stato di un cubo di Rubik reale, mostra ogni mossa in 2D e 3D e permette di seguire passo dopo passo la sequenza di risoluzione proposta dal solver integrato.

> **Stato del progetto:** quasi completo. Tutte le funzionalità principali sono operative, ma rimane da ottimizzare il bundle (warning oltre 500 kB) e rifinire alcuni dettagli UX/minor bugfix.

## Funzionalità principali

- **Wizard di mappatura:** palette colori, guida faccia-per-faccia, validazioni per garantire uno stato coerente.
- **Timeline con undo/redo:** ogni modifica viene registrata e può essere rivista o annullata in qualsiasi momento.
- **Import/Export JSON:** consente di salvare/ricaricare lo stato del cubo o scambiarlo con altri utenti.
- **Diagnostica per faccia:** evidenzia problemi di mappatura e suggerisce correzioni.
- **Viewer 3D interattivo (Three.js):** mostra le mosse in tempo reale, sincronizzate con il solver e con l’editor 2D.
- **SolvePlayer:** applica automaticamente la sequenza calcolata e permette di seguirla per replicarla sul cubo fisico.

## Requisiti

- Node.js 18+ (consigliato l'uso di `nvm` per la gestione delle versioni)
- npm 9+ (installato insieme a Node)

## Setup rapido

```bash
git clone <repo-url>
cd cubo-app
npm install
```

### Ambiente di sviluppo

```bash
npm run dev
```

Vite avvia il server locale (porta 5173, oppure la successiva libera). L'interfaccia è ottimizzata per desktop moderni.

### Build di produzione

```bash
npm run build
```

Il comando esegue `tsc -b` e `vite build`, producendo l'output in `dist/`. Attenzione: al momento viene mostrato un warning perché il bundle principale supera i 500 kB; la riduzione di questo peso è l'unico TODO aperto.

### Anteprima della build

```bash
npm run preview
```

Serve per testare localmente la build appena generata.

## Come usare l'app

1. **Mappa il cubo reale:** scegli il colore attivo e clicca sugli sticker nell'editor 2D seguendo il wizard.
2. **Verifica:** consulta diagnosi e timeline per correggere eventuali errori prima di procedere.
3. **Attiva il viewer 3D:** una volta completata la mappatura, il cubo tridimensionale mostra ogni rotazione.
4. **Calcola la soluzione:** tramite SolvePlayer ottieni la sequenza di mosse. Puoi applicarla virtualmente e replicarla sul cubo fisico.
5. **Importa/Esporta:** usa il pannello dedicato per salvare lo stato o condividerlo.

## Script npm

| Comando         | Descrizione                                    |
|-----------------|------------------------------------------------|
| `npm run dev`   | Avvia Vite con HMR                              |
| `npm run build` | Compila TypeScript e costruisce la versione prod|
| `npm run lint`  | Esegue ESLint su tutto il progetto              |
| `npm run test`  | Lancia Vitest (non sono ancora presenti test)   |
| `npm run preview` | Serve la build prod in locale                |

## Roadmap

- [ ] Ridurre la dimensione del bundle principale (code splitting o manual chunks)
- [ ] Rifiniture UI/UX e documentazione video
- [ ] Test end-to-end per la procedura di mapping e solver

## Licenza

Scegli la licenza più adatta (MIT consigliata). Inserisci qui il testo definitivo quando disponibile.
