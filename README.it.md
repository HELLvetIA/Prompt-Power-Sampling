# Power Sampling - Ragionamento LLM Training-Free

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)

> **[🇬🇧 Read in English](./README.md)**

**Power Sampling** è un'implementazione minimalista e framework-agnostic del ragionamento training-free per Large Language Models (LLM) che utilizza tecniche avanzate di multi-sampling, self-critique, MCMC e selective rewriting.

A differenza degli approcci tradizionali che richiedono fine-tuning del modello o architetture complesse, Power Sampling raggiunge una migliore qualità di ragionamento attraverso pura prompt engineering e un **sistema a 5 agenti** (Judge, Annotator, Rewriter, Solver, Scorer) con supporto **multilingua** e **campionamento MCMC**.

---

## 🎯 Caratteristiche

- **🚀 Training-Free**: Non richiede fine-tuning - funziona con qualsiasi API compatibile con OpenAI
- **🎭 Sistema a 5 Agenti**: Judge, Annotator, Rewriter, Solver, Scorer specializzati
- **🔗 Campionamento MCMC**: Tecniche Markov Chain Monte Carlo con annealing di temperatura
- **🌍 Supporto Multilingua**: 7 lingue (Italiano, Inglese, Spagnolo, Tedesco, Cinese, Francese, Russo)
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

Power Sampling implementa una pipeline **Reasoning with Sampling (RWS)** con **due modalità operative**:

### 🔹 Modalità 1: Power Sampling Classico

Pipeline tradizionale con consenso multi-sample e raffinamento iterativo.

#### 1️⃣ Consenso Multi-Sample
- Genera **k candidati diversi** (default: 2) con temperatura alta (0.9)
- L'agente **JUDGE** seleziona il miglior candidato basandosi sulla coerenza logica

#### 2️⃣ Raffinamento Iterativo (Blockwise)
- Continua il ragionamento in blocchi (~100 token ciascuno)
- L'agente **ANNOTATOR** marca gli span incerti con tag `<weak>...</weak>`
- L'agente **REWRITER** riscrive solo gli span deboli, preservando il ragionamento forte

#### 3️⃣ Estrazione Soluzione
- L'agente **SOLVER** legge il chain-of-thought completo
- Estrae una singola soluzione concisa e deterministica (temperatura 0.0)

### 🔹 Modalità 2: Campionamento MCMC (Markov Chain Monte Carlo)

Pipeline avanzata con esplorazione sistematica dello spazio delle soluzioni.

#### 1️⃣ Campionamento Iniziale
- Genera k candidati iniziali con multi-sample consensus
- L'agente **SCORER** valuta la qualità del ragionamento (punteggio 0-10)
- Stato iniziale: X₀ (miglior candidato)

#### 2️⃣ Catena MCMC con Temperature Annealing
Per ogni iterazione t:
- **PROPONI**: Continua il ragionamento da X_current con temp(t) = 0.95 × (0.7ᵗ)
- **RAFFINA**: Annota e riscrivi gli span deboli
- **VALUTA**: L'agente SCORER valuta X_proposed
- **ACCETTA/RIFIUTA**: Algoritmo Metropolis-Hastings
  - Probabilità di accettazione = min(1, score_proposed / score_current)
  - Se accettato: X_current = X_proposed
  - Altrimenti: mantieni X_current

#### 3️⃣ Selezione dello Stato Migliore
- Traccia l'intera catena di stati
- Restituisce lo stato con il punteggio più alto
- Include metadati: tasso di accettazione, storia dei punteggi, iterazione migliore

### Diagrammi di Flusso

#### **Modalità Classica**

```
Prompt Utente
    ↓
Rilevamento Lingua Automatico (IT/EN/ES/DE/ZH/FR/RU)
    ↓
Multi-Sample (k=2, temp=0.9)
    ↓
JUDGE Agent (temp=0.0) → Miglior Candidato
    ↓
[Ripeti per 'steps' iterazioni]
│   Continua Ragionamento (~100 token)
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

#### **Modalità MCMC**

```
Prompt Utente
    ↓
Rilevamento Lingua Automatico
    ↓
Multi-Sample Iniziale (k=2, temp=0.95)
    ↓
SCORER Agent → Punteggio Iniziale
    ↓
X₀ = Miglior Candidato (stato iniziale)
    ↓
╔═══════════════════════════════════════╗
║ Catena MCMC (T iterazioni)            ║
╠═══════════════════════════════════════╣
║ [Per t = 1 a T]                       ║
║                                       ║
║ 1. PROPONI:                           ║
║    temp(t) = 0.95 × 0.7ᵗ              ║
║    X_prop = Continua(X_curr)          ║
║    ↓                                  ║
║ 2. RAFFINA:                           ║
║    ANNOTATOR → Marca <weak>           ║
║    REWRITER → Riscrivi weak spans     ║
║    ↓                                  ║
║ 3. VALUTA:                            ║
║    SCORER → score_prop                ║
║    ↓                                  ║
║ 4. METROPOLIS-HASTINGS:               ║
║    α = min(1, score_prop/score_curr)  ║
║    Se random() < α:                   ║
║      X_curr = X_prop (ACCETTA)        ║
║    Altrimenti:                        ║
║      mantieni X_curr (RIFIUTA)        ║
║    ↓                                  ║
║ Registra stato in catena              ║
╚═══════════════════════════════════════╝
    ↓
Seleziona Stato con Punteggio Massimo dalla Catena
    ↓
SOLVER Agent → Estrai Soluzione Finale
    ↓
┌──────────────────┬───────────────────┬────────────────┐
│   Ragionamento   │    Soluzione      │    Metadati    │
│ (Stato Migliore) │    (Conciso)      │  MCMC (catena) │
└──────────────────┴───────────────────┴────────────────┘
```

### 🌍 Intelligenza Multilingua

Il sistema **rileva automaticamente la lingua** del prompt e:
- Utilizza template di prompt nella lingua appropriata per tutti i 5 agenti
- Gli agenti rispondono sempre nella lingua rilevata (IT/EN/ES/DE/ZH/FR/RU)
- Parsing delle risposte con regex multilingua
- UI localizzata con 7 lingue supportate

### Spiegazione MCMC

**Perché MCMC?**
- Esplora sistematicamente lo spazio delle soluzioni invece di fermarsi alla prima risposta
- Accetta occasionalmente soluzioni peggiori (annealing) per evitare minimi locali
- Converge verso soluzioni di alta qualità attraverso raffinamenti iterativi

**Temperature Annealing:**
```
temp(0) = 0.95  (alta esplorazione)
temp(1) = 0.95 × 0.7 = 0.665
temp(2) = 0.95 × 0.7² = 0.465
temp(3) = 0.95 × 0.7³ = 0.326
...
temp(T) → bassa (alta exploitation)
```

**Criterio di Accettazione Metropolis-Hastings:**
- Se score_proposed > score_current: **accetta sempre** (α = 1)
- Se score_proposed < score_current: **accetta con probabilità** score_proposed/score_current
- Questo permette di "arrampicarsi sulle colline" ma anche di sfuggire ai minimi locali

---

## 🚀 Avvio Rapido

### Prerequisiti

- **Node.js** >= 18.0.0
- **npm** o **yarn**
- Una chiave API OpenAI (o OpenRouter, Azure OpenAI, ecc.)

### Installazione

```bash
# Clona il repository
git clone https://github.com/HELLvetIA/Prompt-Power-Sampling.git
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
# Modalità classica
npm run cli "Risolvi: se x+y=10 e x-y=2, trova x e y"

# Modalità MCMC
npm run cli "Prompt" -- --mode mcmc --steps 5

# Con lingua specifica
npm run cli "Solve: if x+y=10 and x-y=2, find x and y" -- --mode full
```

---

## 🏗 Architettura

### Struttura dei File

```
power-sampling-simple/
├── power-sampling.js    # Libreria core (framework-agnostic)
├── prompts.json         # Template di prompt multilingua (5 agenti × 7 lingue)
├── config.js            # Configurazione di default
├── config.browser.js    # Configurazione specifica per browser
├── translations.json    # Traduzioni UI (7 lingue)
├── cli.js               # Interfaccia da riga di comando
├── index.html           # Web UI (vanilla JS)
├── worker.js            # Proxy Cloudflare Workers
├── wrangler.toml        # Configurazione Cloudflare
├── .env                 # Variabili d'ambiente
├── .dev.vars            # Segreti del worker (locale)
├── package.json         # Dipendenze
└── README.md            # Documentazione
```

### Sistema a 5 Agenti

| Agente | Ruolo | Temperatura | Scopo | Lingue |
|--------|-------|-------------|-------|--------|
| **JUDGE** | Seleziona miglior candidato | 0.0 | Scegliere il ragionamento più coerente tra k campioni | 7 |
| **ANNOTATOR** | Marca span deboli | 0.6 | Identificare parti incerte con tag `<weak>` | 7 |
| **REWRITER** | Riscrive span deboli | 0.54 | Migliorare solo le sezioni marcate | 7 |
| **SOLVER** | Estrae soluzione | 0.0 | Estrazione deterministica della risposta finale | 7 |
| **SCORER** | Valuta qualità | 0.0 | Valutare il ragionamento (0-10) per MCMC | 7 |

**Tutte le lingue supportate:** IT, EN, ES, DE, ZH, FR, RU

---

## 📖 Utilizzo

### Web UI

1. Avvia il proxy worker: `npm run worker`
2. Avvia il server di sviluppo: `npm run dev`
3. Apri http://localhost:5173
4. **Seleziona la lingua** dal menu a tendina (🌐)
5. Inserisci il tuo prompt (nella lingua scelta)
6. Seleziona la modalità:
   - **Full**: Classico multi-sample + raffinamento
   - **MCMC**: Campionamento a catena Markov
   - **Multi-Sample Only**: Solo consenso k-campioni
   - **Annotate Only**: Solo annotazione + riscrittura
7. Regola i parametri (k, steps)
8. Clicca "Esegui Power Sampling"

**Output:**
- **Ragionamento**: Chain-of-thought completo
- **Soluzione**: Soluzione concisa estratta dall'agente SOLVER
- **Metadati**: Tempo, modalità, campioni, modello

### Utilizzo CLI

```bash
# Uso base (modalità classica)
npm run cli "Il tuo prompt qui"

# Modalità MCMC
npm run cli "Prompt" -- --mode mcmc --steps 5

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
| `--k` | 2 | Numero di campioni da generare |
| `--steps` | 1 | Iterazioni di raffinamento (o lunghezza catena MCMC) |
| `--mode` | full | Modalità: `full`, `mcmc`, `multi-sample`, `annotate` |
| `--json` | false | Output in formato JSON |
| `--verbose` | false | Mostra log dettagliati |

### Import come Libreria

```javascript
import PowerSampling from './power-sampling.js';

const ps = new PowerSampling({
  apiKey: 'tua-chiave-api',
  model: 'gpt-4o-mini',
  k: 2,
  steps: 1
});

// Modalità classica
const result = await ps.run("Il tuo prompt", { mode: 'full' });

// Modalità MCMC
const mcmcResult = await ps.run("Il tuo prompt", { mode: 'mcmc', steps: 5 });

console.log(result.result.reasoning);  // Chain-of-thought
console.log(result.result.solution);   // Soluzione concisa (dall'agente SOLVER)
console.log(result.metadata.time);     // Tempo di esecuzione (ms)

// Per MCMC
console.log(mcmcResult.result.chain);            // Intera catena MCMC
console.log(mcmcResult.result.metadata);         // Tasso accettazione, punteggi
```

**Funzioni di Convenienza:**

```javascript
import { multiSample, annotateWeakSpans, powerSampling, mcmcSampling } from './power-sampling.js';

// Solo consenso multi-sample
const samples = await multiSample("prompt", { k: 5 });

// Solo annotazione + riscrittura
const rewritten = await annotateWeakSpans("testo");

// Pipeline completa classica
const full = await powerSampling("prompt", { steps: 3 });

// Pipeline MCMC
const mcmc = await mcmcSampling("prompt", { steps: 5 });
```

**Rilevamento Lingua:**

```javascript
const ps = new PowerSampling({ apiKey: '...' });

// Rilevamento automatico
const langCode = await ps.detectLanguage("Risolvi questa equazione");
console.log(langCode); // "it"

// Il codice lingua viene memorizzato nella cache e riutilizzato
await ps.run("Prompt"); // Rileva una volta
await ps.run("Altro prompt"); // Riutilizza la lingua rilevata
```

---

## ⚙️ Configurazione

### Parametri (`config.js`)

```javascript
{
  provider: 'openai',         // Provider LLM
  model: 'gpt-4o-mini',       // Nome del modello
  k: 2,                       // Numero di campioni (ridotto per velocità)
  steps: 1,                   // Iterazioni di raffinamento (ridotto per velocità)
  blockTokens: 100,           // Token per blocco (ridotto per velocità)
  proxyURL: 'http://localhost:8787',  // Endpoint del proxy
  temperature: {
    sample: 0.9,              // Alta diversità per il sampling
    rewrite: 0.6,             // Bilanciato per la riscrittura
    judge: 0.0                // Deterministico per il giudizio
  },

  // Supporto Multilingua
  autoDetectLanguage: true,   // Rileva automaticamente la lingua
  defaultLanguage: 'en',      // Lingua di fallback

  // Parametri MCMC
  mcmc: {
    enabled: true,            // Abilita modalità MCMC
    initialTemp: 0.95,        // Temperatura iniziale
    tempDecay: 0.7,           // Fattore di decadimento (0.7 = -30% per step)
    acceptanceThreshold: 0.3  // Soglia minima di accettazione
  }
}
```

### Prompt (`prompts.json`)

Tutti i prompt utilizzano un sistema **template + lingue**:

```json
{
  "mark": {
    "template": "**IMPORTANT: Respond in {{language}} language.**\n\nIdentify weak reasoning spans...",
    "languages": {
      "it": "Versione italiana specifica",
      "en": "English specific version",
      "es": "Versión española específica",
      "de": "Deutsche spezifische Version",
      "zh": "中文特定版本",
      "fr": "Version française spécifique",
      "ru": "Русская специфическая версия"
    }
  },

  "scorer": {
    "template": "Evaluate reasoning quality 0-10...",
    "languages": { /* 7 lingue */ }
  }

  // Altri agenti: rewrite, judge, solver
  // Prompt di sistema: scorer_system, judge_system, annotator_system, rewriter_system, solver_system
}
```

**Interpolazione Variabili:**
- Usa `{{variabile}}` per valori dinamici
- Disponibili: `{{language}}`, `{{k}}`, `{{candidates}}`, `{{text}}`, `{{reasoning}}`, `{{blockTokens}}`

---

## 📚 Riferimento API

### Classe `PowerSampling`

#### Costruttore

```javascript
new PowerSampling(config)
```

**Parametri:**
- `config` (Object): Oggetto di configurazione (sovrascrive i default da `config.js`)

#### Metodi Principali

##### `run(prompt, options)`

Punto di ingresso principale per eseguire power sampling.

**Parametri:**
- `prompt` (String): Query o task dell'utente
- `options` (Object):
  - `mode` (String): `'full'`, `'mcmc'`, `'multi-sample'`, `'annotate'`
  - `k` (Number): Numero di campioni
  - `steps` (Number): Iterazioni di raffinamento (o lunghezza catena per MCMC)
  - `systemPrompt` (String): Prompt di sistema personalizzato

**Restituisce:** Promise che risolve a:
```javascript
{
  success: true,
  result: {
    text: "...",        // Output completo
    reasoning: "...",   // Chain-of-thought
    solution: "...",    // Soluzione concisa (dall'agente SOLVER)

    // Solo modalità MCMC
    chain: [...],       // Array di stati MCMC
    metadata: {
      bestIteration: 3,
      acceptanceRate: 0.6,
      initialScore: 7.2,
      finalScore: 8.5
    },

    // Solo modalità multi-sample
    candidates: [...],  // Tutti i k candidati
    judge: "...",       // Ragionamento del giudice

    // Solo modalità annotate
    annotated: "...",   // Testo con tag <weak>
  },
  metadata: {
    time: 12345,        // Tempo di esecuzione (ms)
    mode: "mcmc",
    language: "it",     // Lingua rilevata
    config: { k: 2, steps: 5, model: "gpt-4o-mini" }
  }
}
```

#### Metodi Core

##### `detectLanguage(prompt)`

Rileva automaticamente la lingua del prompt.

**Restituisce:** Promise → String (codice lingua ISO 639-1: "it", "en", "es", "de", "zh", "fr", "ru")

**Esempio:**
```javascript
const lang = await ps.detectLanguage("Risolvi questa equazione");
console.log(lang); // "it"
```

##### `multiSampleConsensus(baseMessages, options)`

Genera k candidati e seleziona il migliore tramite agente JUDGE.

**Parametri:**
- `baseMessages` (Array): Messaggi di contesto
- `options` (Object): `{ k, temperature, language }`

**Restituisce:** Promise → `{ best, candidates, judge }`

##### `annotateAndRewrite(draft, options)`

Marca span deboli con agente ANNOTATOR e li riscrive con agente REWRITER.

**Parametri:**
- `draft` (String): Testo da annotare
- `options` (Object): `{ temperature, language }`

**Restituisce:** Promise → `{ final, annotated, notes }`

##### `scoreReasoning(text, language)`

Valuta la qualità del ragionamento usando l'agente SCORER (0-10).

**Parametri:**
- `text` (String): Testo da valutare
- `language` (String): Codice lingua (default: "en")

**Restituisce:** Promise → `{ score, reason, fullResponse }`

**Esempio:**
```javascript
const evaluation = await ps.scoreReasoning("Testo di ragionamento", "it");
console.log(evaluation.score);  // 8.5
console.log(evaluation.reason); // "Logica chiara con buone deduzioni"
```

##### `mcmcChainSampling(baseMessages, options)`

Esegue il campionamento MCMC con temperature annealing e Metropolis-Hastings.

**Parametri:**
- `baseMessages` (Array): Messaggi di contesto
- `options` (Object): `{ k, steps, language, blockTokens }`

**Restituisce:** Promise → `{ text, score, chain, metadata }`

**Struttura della Catena:**
```javascript
chain: [
  {
    iteration: 0,
    state: "Testo stato iniziale",
    score: 7.2,
    accepted: true,
    temperature: 0.95
  },
  {
    iteration: 1,
    state: "Testo stato proposto",
    score: 8.0,
    scoreProposed: 8.0,
    accepted: true,
    acceptanceProb: 1.0,
    temperature: 0.665
  },
  // ...
]
```

##### `blockwisePowerSampling(baseMessages, options)`

Pipeline completa classica: multi-sample → raffinamento iterativo.

##### `solverAgent(question, reasoning)`

Estrae soluzione concisa e deterministica dal ragionamento completo usando l'agente SOLVER.

**Parametri:**
- `question` (String): Domanda originale
- `reasoning` (String): Chain-of-thought completo

**Restituisce:** Promise → String (soluzione concisa)

---

## 💰 Stima Costi

### Modalità Classica `full` (k=2, steps=1)

**~7-8 chiamate API LLM:**
1. Multi-sample: 2 candidati
2. Agente JUDGE: 1 chiamata
3. Per step (×1):
   - Continuazione: 1 chiamata
   - Agente ANNOTATOR: 1 chiamata
   - Agente REWRITER: 1 chiamata
4. Agente SOLVER: 1 chiamata

**Con `gpt-4o-mini`:**
- **Costo stimato per query: $0.005 - $0.015**

### Modalità MCMC `mcmc` (k=2, steps=5)

**~27-30 chiamate API LLM:**
1. Multi-sample iniziale: 2 candidati
2. Agente JUDGE: 1 chiamata
3. Agente SCORER iniziale: 1 chiamata
4. Per iterazione MCMC (×5):
   - Continuazione: 1 chiamata
   - Agente ANNOTATOR: 1 chiamata
   - Agente REWRITER: 1 chiamata
   - Agente SCORER: 1 chiamata
5. Agente SOLVER: 1 chiamata

**Con `gpt-4o-mini`:**
- **Costo stimato per query: $0.03 - $0.08**

### Strategie di Riduzione Costi

| Strategia | Risparmio | Trade-off |
|-----------|-----------|-----------|
| `k=2` invece di 3 | -14% chiamate (classica) | Meno diversità iniziale |
| `steps=1` invece di 2 | -30% chiamate (classica) | Meno raffinamento |
| `steps=3` invece di 5 (MCMC) | -40% chiamate (MCMC) | Catena più corta |
| `mode=multi-sample` | -75% chiamate | Solo consenso, nessun raffinamento |
| Usa modello più economico | -50-90% costo | La qualità può variare |

### Confronto Modalità

| Modalità | Chiamate | Costo (gpt-4o-mini) | Tempo | Qualità |
|----------|----------|---------------------|-------|---------|
| `multi-sample` | 3-4 | $0.003-0.01 | ~5s | Buona |
| `full` (k=2, steps=1) | 7-8 | $0.005-0.015 | ~8-12s | Molto Buona |
| `full` (k=3, steps=2) | 11-13 | $0.01-0.05 | ~20-30s | Eccellente |
| `mcmc` (k=2, steps=3) | 17-19 | $0.02-0.05 | ~25-35s | Eccellente |
| `mcmc` (k=2, steps=5) | 27-30 | $0.03-0.08 | ~40-60s | Superiore |

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

### Lingua Non Rilevata Correttamente

Se il sistema non rileva la lingua del prompt:
1. Assicurati che `config.autoDetectLanguage = true`
2. Controlla che la lingua sia supportata (IT/EN/ES/DE/ZH/FR/RU)
3. Prova a specificare manualmente la lingua: `ps.detectedLanguage = 'it'`
4. Verifica che `prompts.json` contenga tutte le traduzioni per quella lingua

### Modalità MCMC Troppo Lenta

Se MCMC impiega troppo tempo:
1. Riduci `steps`: da 5 a 3 (-40% tempo)
2. Riduci `k`: da 3 a 2 (-14% tempo)
3. Riduci `blockTokens`: da 200 a 100 (-30% tempo)
4. Usa un modello più veloce: `gpt-3.5-turbo` invece di `gpt-4o-mini`

### Punteggi SCORER Sempre Bassi

Se l'agente SCORER valuta sempre male:
1. Controlla che i prompt `scorer` siano nella lingua corretta
2. Verifica che la temperatura sia 0.0 per SCORER (determinismo)
3. Controlla il `fullResponse` per vedere il ragionamento completo dello SCORER
4. Prova ad aggiustare i criteri di valutazione in `prompts.json`

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
git clone https://github.com/HELLvetIA/Prompt-Power-Sampling.git
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
- Aggiungere più lingue (PT, JA, KO, AR, ecc.)
- Migliorare il design della Web UI
- Aggiungere più esempi e casi d'uso
- Ottimizzare l'algoritmo MCMC (adaptive temperature, early stopping)
- Aggiungere visualizzazione della catena MCMC nella UI

---

## 📝 Licenza

Questo progetto è rilasciato sotto licenza **MIT** - vedi il file [LICENSE](LICENSE) per i dettagli.

---

## 🙏 Ringraziamenti

- Ispirato da ricerche sulle tecniche di ragionamento training-free
- Tecniche MCMC adattate da Markov Chain Monte Carlo e simulated annealing
- Costruito con [OpenAI API](https://platform.openai.com/)
- Alimentato da [Cloudflare Workers](https://workers.cloudflare.com/)
- UI costruita con [Vite](https://vitejs.dev/)

---

## 📧 Contatti

Per domande, problemi o suggerimenti:

- **GitHub Issues**: [Crea un issue](https://github.com/HELLvetIA/Prompt-Power-Sampling/issues)
- **Discussioni**: [Unisciti alla discussione](https://github.com/HELLvetIA/Prompt-Power-Sampling/discussions)

---

## 🌟 Storia delle Stelle

Se trovi questo progetto utile, considera di dargli una stella su GitHub!

---

**Realizzato con ❤️ per la Open Source Community**
