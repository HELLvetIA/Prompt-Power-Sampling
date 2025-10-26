# Power Sampling - Ragionamento LLM Training-Free

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)

> **[🇬🇧 Read in English](./README.md)**

**Power Sampling** è un'implementazione minimalista e framework-agnostic del ragionamento training-free per Large Language Models (LLM) che utilizza tecniche di multi-sampling, self-critique e selective rewriting.

A differenza degli approcci tradizionali che richiedono fine-tuning del modello o architetture complesse, Power Sampling raggiunge una migliore qualità di ragionamento attraverso pura prompt engineering e un **sistema a 4 agenti** (Judge, Annotator, Rewriter, Solver).

---

## 🎯 Caratteristiche

- **🚀 Training-Free**: Non richiede fine-tuning - funziona con qualsiasi API compatibile con OpenAI
- **🎭 Sistema Multi-Agente**: 4 agenti specializzati (Judge, Annotator, Rewriter, Solver)
- **📦 Dipendenze Minime**: Solo 2 dipendenze (OpenAI SDK per CLI, Vite per Web UI)
- **🔒 Sicuro di Default**: API key protette tramite proxy Cloudflare Workers
- **🌐 Framework-Agnostic**: La libreria core funziona in Node.js, browser, CLI o qualsiasi ambiente
- **⚙️ Altamente Configurabile**: Template di prompt basati su JSON e parametri modificabili
- **🎨 Doppia Interfaccia**: Tool da riga di comando + bellissima Web UI

---

## 📋 Indice

- [Come Funziona](#-come-funziona)
- [Avvio Rapido](#-avvio-rapido)
- [Architettura](#-architettura)
- [Utilizzo](#-utilizzo)
- [Configurazione](#-configurazione)
- [Riferimento API](#-riferimento-api)
- [Stima Costi](#-stima-costi)
- [Contribuire](#-contribuire)
- [Licenza](#-licenza)

---

## 🧠 Come Funziona

Power Sampling implementa una pipeline **Reasoning with Sampling (RWS)** con un sistema a 4 agenti:

### 1️⃣ Consenso Multi-Sample
- Genera **k candidati diversi** (default: 3) con temperatura alta (0.9)
- L'agente **JUDGE** seleziona il miglior candidato basandosi sulla coerenza logica

### 2️⃣ Raffinamento Iterativo (Blockwise)
- Continua il ragionamento in blocchi (~200 token ciascuno)
- L'agente **ANNOTATOR** marca gli span incerti con tag `<weak>...</weak>`
- L'agente **REWRITER** riscrive solo gli span deboli, preservando il ragionamento forte

### 3️⃣ Estrazione Soluzione
- L'agente **SOLVER** legge il chain-of-thought completo
- Estrae una singola soluzione concisa e deterministica (temperatura 0.0)

### Diagramma di Flusso

```
Prompt Utente
    ↓
Multi-Sample (k=3, temp=0.9)
    ↓
JUDGE Agent (temp=0.0) → Miglior Candidato
    ↓
[Ripeti per 'steps' iterazioni]
│   Continua Ragionamento (~200 token)
│   ↓
│   ANNOTATOR Agent (temp=0.6) → Marca span <weak>
│   ↓
│   REWRITER Agent (temp=0.54) → Riscrive solo span deboli
└── Ragionamento Finale
    ↓
SOLVER Agent (temp=0.0) → Estrai Soluzione
    ↓
┌─────────────────┬──────────────────┐
│   Ragionamento  │    Soluzione     │
│ (CoT Completo)  │   (Conciso)      │
└─────────────────┴──────────────────┘
```

---

## 🚀 Avvio Rapido

### Prerequisiti

- **Node.js** >= 18.0.0
- **npm** o **yarn**
- Una chiave API OpenAI (o OpenRouter, Azure OpenAI, ecc.)

### Installazione

```bash
# Clona il repository
git clone https://github.com/tuousername/power-sampling-simple.git
cd power-sampling-simple

# Installa le dipendenze
npm install

# Configura le variabili d'ambiente
cp .env.example .env
# Modifica .env e aggiungi le tue chiavi API
```

### Configura `.env`

```bash
# Per Node.js (CLI)
OPENAI_API_KEY=tua-chiave-api-openai
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o-mini

# Per Browser (Vite richiede il prefisso VITE_)
VITE_OPENAI_API_KEY=tua-chiave-api-openai
VITE_OPENAI_BASE_URL=https://api.openai.com/v1
VITE_OPENAI_MODEL=gpt-4o-mini
```

### Avvia il Proxy Cloudflare Workers (Consigliato)

Per sviluppo locale sicuro senza esporre le chiavi API nel browser:

```bash
# Crea il file .dev.vars
cp .dev.vars.example .dev.vars
# Modifica .dev.vars con la tua chiave API

# Avvia il proxy su localhost:8787
npm run worker
```

### Esegui l'Applicazione

**Opzione 1: Web UI**

```bash
npm run dev
# Apri http://localhost:5173
```

**Opzione 2: Linea di Comando**

```bash
npm run cli "Risolvi: se x+y=10 e x-y=2, trova x e y"
```

---

## 🏗 Architettura

### Struttura dei File

```
power-sampling-simple/
├── power-sampling.js    # Libreria core (framework-agnostic)
├── prompts.json         # Template di prompt configurabili (4 agenti)
├── config.js            # Configurazione di default
├── config.browser.js    # Configurazione specifica per browser
├── cli.js               # Interfaccia da riga di comando
├── index.html           # Web UI (vanilla JS)
├── worker.js            # Proxy Cloudflare Workers
├── wrangler.toml        # Configurazione Cloudflare
├── .env                 # Variabili d'ambiente
├── .dev.vars            # Segreti del worker (locale)
├── package.json         # Dipendenze
└── README.md            # Questo file
```

### Sistema Multi-Agente

| Agente | Ruolo | Temperatura | Scopo |
|--------|-------|-------------|-------|
| **JUDGE** | Seleziona miglior candidato | 0.0 | Scegliere il ragionamento più coerente tra k campioni |
| **ANNOTATOR** | Marca span deboli | 0.6 | Identificare parti incerte con tag `<weak>` |
| **REWRITER** | Riscrive span deboli | 0.54 | Migliorare solo le sezioni marcate |
| **SOLVER** | Estrae soluzione | 0.0 | Estrazione deterministica della risposta finale |

---

## 📖 Utilizzo

### Web UI

1. Avvia il proxy worker: `npm run worker`
2. Avvia il server di sviluppo: `npm run dev`
3. Apri http://localhost:5173
4. Inserisci il tuo prompt
5. Seleziona la modalità (Full / Multi-Sample / Annotate)
6. Regola i parametri (k, steps)
7. Clicca "Esegui Power Sampling"

**Output:**
- **Ragionamento**: Chain-of-thought completo
- **Soluzione**: Soluzione concisa estratta dall'agente SOLVER

### Utilizzo CLI

```bash
# Uso base
npm run cli "Il tuo prompt qui"

# Con opzioni
npm run cli "Prompt" -- --k 5 --steps 3 --mode full --verbose

# Output JSON
npm run cli "Prompt" -- --json

# Aiuto
npm run cli -- --help
```

**Opzioni CLI:**

| Opzione | Default | Descrizione |
|---------|---------|-------------|
| `--k` | 3 | Numero di campioni da generare |
| `--steps` | 2 | Iterazioni di raffinamento |
| `--mode` | full | Modalità: `full`, `multi-sample`, `annotate` |
| `--json` | false | Output in formato JSON |
| `--verbose` | false | Mostra log dettagliati |

### Import come Libreria

```javascript
import PowerSampling from './power-sampling.js';

const ps = new PowerSampling({
  apiKey: 'tua-chiave-api',
  model: 'gpt-4o-mini',
  k: 3,
  steps: 2
});

const result = await ps.run("Il tuo prompt", { mode: 'full' });

console.log(result.result.reasoning);  // Chain-of-thought
console.log(result.result.solution);   // Soluzione concisa (dall'agente SOLVER)
console.log(result.metadata.time);     // Tempo di esecuzione (ms)
```

**Funzioni di Convenienza:**

```javascript
import { multiSample, annotateWeakSpans, powerSampling } from './power-sampling.js';

// Solo consenso multi-sample
const samples = await multiSample("prompt", { k: 5 });

// Solo annotazione + riscrittura
const rewritten = await annotateWeakSpans("testo");

// Pipeline completa
const full = await powerSampling("prompt", { steps: 3 });
```

---

## ⚙️ Configurazione

### Parametri (`config.js`)

```javascript
{
  provider: 'openai',         // Provider LLM
  model: 'gpt-4o-mini',       // Nome del modello
  k: 3,                       // Numero di campioni
  steps: 2,                   // Iterazioni di raffinamento
  blockTokens: 200,           // Token per blocco di continuazione
  proxyURL: 'http://localhost:8787',  // Endpoint del proxy
  temperature: {
    sample: 0.9,              // Alta diversità per il sampling
    rewrite: 0.6,             // Bilanciato per la riscrittura
    judge: 0.0                // Deterministico per il giudizio
  }
}
```

### Prompt (`prompts.json`)

Tutti i prompt sono completamente personalizzabili senza modifiche al codice. Il sistema usa **4 agenti specializzati**:

```json
{
  "mark": "Prompt Annotator: come identificare span deboli",
  "rewrite": "Prompt Rewriter: come riscrivere solo span deboli",
  "judge": "Prompt Judge: come selezionare il miglior candidato",
  "solver": "Prompt Solver: come estrarre soluzione concisa",

  "system_default": "Prompt di sistema di default con formato di ragionamento",
  "judge_system": "Prompt di sistema per agente Judge",
  "annotator_system": "Prompt di sistema per agente Annotator",
  "rewriter_system": "Prompt di sistema per agente Rewriter",
  "solver_system": "Prompt di sistema per agente Solver"
}
```

**Interpolazione Variabili:**
- Usa `{{variabile}}` per valori dinamici
- Disponibili: `{{k}}`, `{{candidates}}`, `{{question}}`, `{{reasoning}}`, `{{blockTokens}}`

---

## 📚 Riferimento API

### Classe `PowerSampling`

#### Costruttore

```javascript
new PowerSampling(config)
```

**Parametri:**
- `config` (Object): Oggetto di configurazione (sovrascrive i default da `config.js`)

#### Metodi

##### `run(prompt, options)`

Punto di ingresso principale per eseguire power sampling.

**Parametri:**
- `prompt` (String): Query o task dell'utente
- `options` (Object):
  - `mode` (String): `'full'`, `'multi-sample'`, `'annotate'`
  - `k` (Number): Numero di campioni
  - `steps` (Number): Iterazioni di raffinamento
  - `systemPrompt` (String): Prompt di sistema personalizzato

**Restituisce:** Promise che risolve a:
```javascript
{
  success: true,
  result: {
    text: "...",        // Output completo
    reasoning: "...",   // Chain-of-thought
    solution: "...",    // Soluzione concisa (dall'agente SOLVER)
    candidates: [...],  // (solo modalità multi-sample)
    judge: "...",       // (solo modalità multi-sample)
    annotated: "...",   // (solo modalità annotate)
  },
  metadata: {
    time: 12345,        // Tempo di esecuzione (ms)
    mode: "full",
    config: { k: 3, steps: 2, model: "..." }
  }
}
```

##### `multiSampleConsensus(baseMessages, options)`

Genera k candidati e seleziona il migliore tramite agente JUDGE.

##### `annotateAndRewrite(draft, options)`

Marca span deboli con agente ANNOTATOR e li riscrive con agente REWRITER.

##### `blockwisePowerSampling(baseMessages, options)`

Pipeline completa: multi-sample → raffinamento iterativo.

##### `solverAgent(question, reasoning)`

Estrae soluzione concisa e deterministica dal ragionamento completo usando l'agente SOLVER.

---

## 💰 Stima Costi

### Per esecuzione in modalità `full` (default: k=3, steps=2)

**~11-13 chiamate API LLM:**
1. Multi-sample: 3 candidati
2. Agente JUDGE: 1 chiamata
3. Per step (×2):
   - Continuazione: 1 chiamata
   - Agente ANNOTATOR: 1 chiamata
   - Agente REWRITER: 1 chiamata
4. Agente SOLVER: 1 chiamata

**Con `gpt-4o-mini` (prezzi OpenAI):**
- Input: ~$0.15 per 1M token
- Output: ~$0.60 per 1M token
- **Costo stimato per query: $0.01 - $0.05**

### Strategie di Riduzione Costi

| Strategia | Risparmio | Trade-off |
|-----------|-----------|-----------|
| `k=2` | -33% chiamate | Meno diversità |
| `steps=1` | -30% chiamate | Meno raffinamento |
| `mode=multi-sample` | -60% chiamate | Nessun raffinamento, nessun SOLVER |
| Usa modello più economico | -50-90% costo | La qualità può variare |

---

## 🔒 Best Practice di Sicurezza

### Sviluppo
- Usa il proxy Cloudflare Workers (`npm run worker`) per mantenere le chiavi API lato server
- Non committare mai `.env` o `.dev.vars` nel controllo versione
- Aggiungi `.env` e `.dev.vars` al `.gitignore`

### Produzione
- Deploya il worker su Cloudflare: `npm run worker:deploy`
- Imposta le variabili d'ambiente nella dashboard Cloudflare
- Aggiorna `proxyURL` nella config all'URL di produzione
- Abilita rate limiting e autenticazione sul proxy

### Proxy Alternativi
- **Cloudflare Workers**: Consigliato per questo progetto (incluso)
- **Vercel Edge Functions**: Proxy serverless su Vercel
- **Express.js**: Server Node.js tradizionale

---

## 🛠 Risoluzione Problemi

### Errore Module Not Found

Assicurati che `package.json` abbia:
```json
{
  "type": "module"
}
```

### Chiave API Non Caricata (CLI)

Su Windows, i file `.env` potrebbero non auto-caricarsi. Soluzioni:
1. Usa `cross-env`: `npm install -D cross-env`
2. Oppure carica manualmente: Aggiungi `import 'dotenv/config';` in cima al codice CLI
3. Oppure imposta la variabile d'ambiente di sistema

### Errori CORS nel Browser

Le chiamate API dirette dal browser sono bloccate da CORS. Soluzioni:
1. Usa il proxy Cloudflare Workers (consigliato) - **incluso in questo progetto**
2. Aggiungi proxy a `vite.config.js`
3. Usa un proxy backend

### Worker Non Si Avvia

```bash
# Controlla se wrangler è installato
npm list wrangler

# Reinstalla se necessario
npm install -D wrangler

# Controlla che .dev.vars esista
ls -la .dev.vars

# Prova con logging verbose
npx wrangler dev --port 8787 --log-level debug
```

### Agente SOLVER Non Funziona

Se il campo soluzione mostra "Nessuna soluzione separata disponibile":
1. Controlla che `prompts.json` contenga i prompt `solver` e `solver_system`
2. Verifica che il proxy sia in esecuzione (`npm run worker`)
3. Controlla la console del browser (F12) per errori
4. Assicurati che la temperatura sia impostata a 0.0 per l'agente SOLVER

---

## 🤝 Contribuire

I contributi sono benvenuti! Segui queste linee guida:

1. Fai un fork del repository
2. Crea un branch per la feature (`git checkout -b feature/funzionalita-fantastica`)
3. Committa le tue modifiche (`git commit -m 'Aggiungi funzionalità fantastica'`)
4. Pusha sul branch (`git push origin feature/funzionalita-fantastica`)
5. Apri una Pull Request

### Setup Sviluppo

```bash
git clone https://github.com/tuousername/power-sampling-simple.git
cd power-sampling-simple
npm install
cp .env.example .env
cp .dev.vars.example .dev.vars
# Modifica .env e .dev.vars con le tue chiavi API
npm run worker    # Terminale 1
npm run dev       # Terminale 2
```

### Idee per Contributi

- Aggiungere supporto per altri provider LLM (Anthropic, Google, ecc.)
- Migliorare i template di prompt in `prompts.json`
- Aggiungere supporto streaming per output in tempo reale
- Implementare caching dei risultati
- Aggiungere metriche e punteggi di confidenza
- Migliorare il design della Web UI
- Aggiungere più esempi e casi d'uso

---

## 📝 Licenza

Questo progetto è rilasciato sotto licenza **MIT** - vedi il file [LICENSE](LICENSE) per i dettagli.

---

## 🙏 Ringraziamenti

- Ispirato da ricerche sulle tecniche di ragionamento training-free
- Costruito con [OpenAI API](https://platform.openai.com/)
- Alimentato da [Cloudflare Workers](https://workers.cloudflare.com/)
- UI costruita con [Vite](https://vitejs.dev/)

---

## 📧 Contatti

Per domande, problemi o suggerimenti:

- **GitHub Issues**: [Crea un issue](https://github.com/tuousername/power-sampling-simple/issues)
- **Discussioni**: [Unisciti alla discussione](https://github.com/tuousername/power-sampling-simple/discussions)

---

## 🌟 Storia delle Stelle

Se trovi questo progetto utile, considera di dargli una stella su GitHub!

---

**Realizzato con ❤️ per la Open Source Community**
