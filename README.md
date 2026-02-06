🧩 Rubick

Designer & Solver per Cubo di Rubik 3×3

Rubick è un’applicazione React + Vite che guida l’utente nella mappatura dello stato di un cubo di Rubik reale e ne calcola la soluzione passo dopo passo.

L’app consente di:

mappare manualmente un cubo fisico tramite un wizard guidato,

visualizzare ogni mossa sia in 2D che in 3D,

seguire e replicare la sequenza di risoluzione proposta dal solver integrato.

✨ Stato del progetto

🟢 Quasi completo

Tutte le funzionalità principali sono operative.
Rimane aperto un solo TODO rilevante:

⚠️ ottimizzazione del bundle di produzione (warning > 500 kB)

Sono inoltre previsti piccoli miglioramenti UX e alcuni bugfix minori.

🚀 Funzionalità principali
🧭 Wizard di mappatura

Palette colori

Guida faccia-per-faccia

Validazioni per garantire uno stato del cubo coerente e risolvibile

⏱ Timeline con undo / redo

Ogni modifica viene registrata

Possibilità di tornare indietro o rivedere lo storico in qualsiasi momento

📦 Import / Export JSON

Salvataggio e caricamento dello stato del cubo

Condivisione dello stato con altri utenti

🩺 Diagnostica per faccia

Evidenzia errori di mappatura

Suggerisce correzioni prima di procedere al solve

🧊 Viewer 3D interattivo

Realizzato con Three.js

Mostra le rotazioni in tempo reale

Sincronizzato con solver ed editor 2D

▶️ SolvePlayer

Calcola automaticamente la sequenza di mosse

Riproduzione guidata passo-passo

Pensato per replicare facilmente la soluzione sul cubo fisico

🛠 Requisiti

Node.js 18+
(consigliato l’uso di nvm)

npm 9+
(incluso con Node)

⚡ Setup rapido
git clone <repo-url>
cd cubo-app
npm install

💻 Ambiente di sviluppo
npm run dev


Vite avvia il server di sviluppo con HMR su http://localhost:5173
(o sulla prima porta disponibile).

L’interfaccia è ottimizzata per desktop moderni.

🏗 Build di produzione
npm run build


Il comando esegue:

tsc -b

vite build

L’output viene generato nella cartella dist/.

⚠️ Nota
Attualmente viene mostrato un warning perché il bundle principale supera i 500 kB.
La riduzione del peso è l’unico TODO aperto.

🔍 Anteprima della build
npm run preview


Serve per testare localmente la build di produzione appena generata.

🧑‍🏫 Come usare l’app

Mappa il cubo reale
Seleziona il colore attivo e clicca sugli sticker nell’editor 2D seguendo il wizard.

Verifica lo stato
Usa la diagnostica e la timeline per correggere eventuali errori.

Attiva il viewer 3D
Una volta completata la mappatura, il cubo 3D mostra ogni rotazione.

Calcola la soluzione
Il SolvePlayer genera la sequenza di mosse.
Puoi seguirla virtualmente e replicarla sul cubo fisico.

Importa / Esporta
Salva lo stato del cubo o condividilo tramite JSON.

📜 Script npm
Comando	Descrizione
npm run dev	Avvia Vite con HMR
npm run build	Compila TypeScript e crea la build di produzione
npm run lint	Esegue ESLint su tutto il progetto
npm run test	Avvia Vitest (test non ancora presenti)
npm run preview	Serve la build prod in locale
🗺 Roadmap

 Riduzione dimensione bundle principale
(code splitting / manual chunks)

 Rifiniture UI/UX

 Documentazione video

 Test end-to-end per mappatura e solver

