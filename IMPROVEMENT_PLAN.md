# Piano di Miglioramento: MCMC-like Sampling + Supporto Multilingua

## 📋 Executive Summary

Questo documento presenta un piano dettagliato per migliorare il sistema Power Sampling implementando:

1. **MCMC-inspired sampling** con sharpened distributions
2. **Supporto multilingua automatico** basato sulla lingua del prompt
3. **Prompt engineering avanzato** per agenti più efficaci

## 🎯 Obiettivi

### 1. MCMC-like Sampling (Markov Chain Monte Carlo)

**Problema attuale:**
- I k samples vengono generati indipendentemente (parallel sampling)
- Non c'è "esplorazione guidata" dello spazio delle soluzioni
- La temperatura è fissa per ogni fase
- Non c'è meccanismo di acceptance/rejection

**Soluzione MCMC-inspired:**
- Implementare **chain sampling** dove ogni sample dipende dal precedente
- Usare **temperature sharpening** (simulated annealing): alta iniziale → bassa finale
- Implementare **Metropolis-Hastings acceptance** per accettare/rifiutare samples
- Usare **scoring function** per valutare qualità dei samples

### 2. Supporto Multilingua

**Problema attuale:**
- Prompts hard-coded in italiano/inglese
- Agenti rispondono in lingua diversa dal prompt utente
- Nessun rilevamento automatico della lingua

**Soluzione:**
- **Language detection** automatica dal prompt utente
- **Prompts template-based** con placeholder per la lingua
- **Istruzioni esplicite** agli agenti per rispettare la lingua

## 🔬 Architettura MCMC-like Sampling

### Fase 1: Initial Sampling (High Temperature)

```
Temperature: 0.95 (molto alta per esplorazione)
Samples: k independent chains

Sample 1 → Score 1
Sample 2 → Score 2
Sample 3 → Score 3

Select best as "current state" X₀
```

### Fase 2: MCMC Chain Iterations

Per ogni step t = 1, 2, ..., T:

```python
# Pseudo-code dell'algoritmo MCMC

1. PROPOSE (Continuation with annealing temperature):
   temperature_t = 0.95 * (0.7 ** t)  # Exponential decay
   X_proposed = continue(X_current, temp=temperature_t)

2. ANNOTATE (Identify weaknesses):
   weaknesses = annotate(X_proposed)

3. REFINE (Rewrite weak spans):
   X_refined = rewrite(X_proposed, weaknesses)

4. SCORE (Quality evaluation):
   score_proposed = quality_score(X_refined)
   score_current = quality_score(X_current)

5. ACCEPT/REJECT (Metropolis-Hastings):
   acceptance_prob = min(1, score_proposed / score_current)

   if random() < acceptance_prob:
       X_current = X_refined  # ACCEPT
   else:
       X_current = X_current  # REJECT (keep current)

6. REPEAT for next iteration
```

### Fase 3: Final Selection

```
Dopo T iterazioni:
- Abbiamo una catena di stati accettati
- Selezioniamo il miglior stato finale (highest score)
- Applichiamo SOLVER agent per estrarre soluzione deterministica
```

## 📊 Sharpened Temperature Schedule

| Step | Temperature | Scopo |
|------|-------------|-------|
| 0 (initial) | 0.95 | Esplorazione ampia |
| 1 | 0.67 | Esplorazione moderata |
| 2 | 0.47 | Raffinamento |
| 3 | 0.33 | Convergenza |
| 4+ | 0.23 | Precisione finale |

**Formula**: `temp(t) = 0.95 * (0.7^t)`

## 🔍 Quality Scoring Function

Implementare un agente **SCORER** che valuta:

```
Score = weighted_sum(
  logical_coherence: 0.4,
  correctness: 0.3,
  completeness: 0.2,
  clarity: 0.1
)

Output: score ∈ [0, 10]
```

Il SCORER usa temperatura 0.0 (deterministico) e restituisce:
- Score numerico (0-10)
- Breve motivazione (1-2 righe)

## 🌍 Supporto Multilingua

### Language Detection

Aggiungere funzione `detectLanguage(prompt)`:

```javascript
async detectLanguage(prompt) {
  const response = await this.callLLM([{
    role: 'system',
    content: 'Detect language. Reply with ISO code only: en/it/es/de/zh/fr/ru'
  }, {
    role: 'user',
    content: prompt.substring(0, 200)  // First 200 chars
  }], { temperature: 0.0, max_tokens: 5 });

  return response.choices[0].content.trim().toLowerCase();
}
```

### Multilingual Prompt Templates

Modificare tutti i prompts con:

```json
{
  "mark": {
    "instruction": "Analyze the DRAFT. Mark uncertain spans with <weak>...</weak>.\n\n**IMPORTANT: Respond in {{language}} language.**\n\nDRAFT:\n{{draft}}\n\nReturn:\nANNOTATED TEXT (with <weak>)\nNOTES (brief bullet points)",

    "languages": {
      "it": "Analizza la BOZZA. Segna span incerti con <weak>...",
      "en": "Analyze the DRAFT. Mark uncertain spans with <weak>...",
      "es": "Analiza el BORRADOR. Marca tramos inciertos con <weak>...",
      "de": "Analysiere den ENTWURF. Markiere unsichere Abschnitte mit <weak>...",
      "zh": "分析草稿。用<weak>...</weak>标记不确定的部分。",
      "fr": "Analysez le BROUILLON. Marquez les passages incertains avec <weak>...",
      "ru": "Проанализируйте ЧЕРНОВИК. Отметьте неопределенные участки с <weak>..."
    }
  }
}
```

### System Prompt Multilingua

```json
{
  "system_default": {
    "base": "You are a structured reasoning assistant.\n\n**CRITICAL: Always respond in {{language}} language.**\n\nUse this format:\n\nREASONING:\n[Your chain-of-thought here]\n\nSOLUTION:\n[Final answer only]",

    "language_instruction": {
      "it": "**IMPORTANTE: Rispondi SEMPRE in italiano.**",
      "en": "**IMPORTANT: Always respond in English.**",
      "es": "**IMPORTANTE: Responde SIEMPRE en español.**",
      "de": "**WICHTIG: Antworte IMMER auf Deutsch.**",
      "zh": "**重要：始终用中文回答。**",
      "fr": "**IMPORTANT : Répondez TOUJOURS en français.**",
      "ru": "**ВАЖНО: Всегда отвечайте на русском языке.**"
    }
  }
}
```

## 🛠️ Modifiche Necessarie al Codice

### 1. power-sampling.js

#### Aggiungere metodi MCMC:

```javascript
// Nuovo metodo: rilevamento lingua
async detectLanguage(prompt) { ... }

// Nuovo metodo: scoring
async scoreReasoning(text, language) { ... }

// Nuovo metodo: MCMC chain sampling
async mcmcChainSampling(baseMessages, options) {
  const k = options.k || this.config.k;
  const T = options.steps || this.config.steps;
  const language = await this.detectLanguage(baseMessages[1].content);

  // 1. Initial sampling (high temp)
  const initialSamples = await this.multiSampleConsensus(
    baseMessages,
    { k, temperature: 0.95, language }
  );

  let X_current = initialSamples.best;
  let score_current = await this.scoreReasoning(X_current, language);

  // 2. MCMC iterations
  for (let t = 1; t <= T; t++) {
    const temp_t = 0.95 * Math.pow(0.7, t);  // Temperature annealing

    // Propose
    const X_proposed = await this.continueSampling(X_current, temp_t, language);

    // Refine
    const { final } = await this.annotateAndRewrite(X_proposed, { language });

    // Score
    const score_proposed = await this.scoreReasoning(final, language);

    // Accept/Reject (Metropolis-Hastings)
    const acceptance_prob = Math.min(1, score_proposed / score_current);

    if (Math.random() < acceptance_prob) {
      X_current = final;
      score_current = score_proposed;
      console.log(`Step ${t}: ACCEPTED (score ${score_proposed})`);
    } else {
      console.log(`Step ${t}: REJECTED (keeping score ${score_current})`);
    }
  }

  return X_current;
}
```

#### Modificare metodi esistenti:

```javascript
// multiSampleConsensus: aggiungere parametro language
async multiSampleConsensus(baseMessages, options = {}) {
  const language = options.language || 'en';
  // ... inject language in prompts
}

// annotateAndRewrite: aggiungere parametro language
async annotateAndRewrite(draft, options = {}) {
  const language = options.language || 'en';
  // ... use language-specific prompts
}
```

### 2. prompts.json

Ristrutturare completamente come mostrato sopra:

```json
{
  "mark": {
    "template": "...",
    "languages": { ... }
  },

  "rewrite": {
    "template": "...",
    "languages": { ... }
  },

  "judge": {
    "template": "...",
    "languages": { ... }
  },

  "scorer": {
    "template": "Evaluate the reasoning quality on a scale of 0-10.\n\nCriteria:\n- Logical coherence (40%)\n- Correctness (30%)\n- Completeness (20%)\n- Clarity (10%)\n\n**Respond in {{language}}**\n\nREASONING:\n{{text}}\n\nOutput format:\nSCORE: X.X\nREASON: [1-2 sentences]",

    "languages": {
      "it": "Valuta la qualità del ragionamento su scala 0-10...",
      "en": "Evaluate the reasoning quality on a scale of 0-10...",
      // ... altre lingue
    }
  },

  "scorer_system": {
    "base": "You are a SCORER agent. Evaluate reasoning quality objectively and consistently. **Always respond in {{language}}.**"
  }
}
```

### 3. config.js

Aggiungere nuove opzioni:

```javascript
{
  // ... existing config

  // MCMC Parameters
  mcmc: {
    enabled: true,                    // Usa MCMC invece di sampling classico
    initialTemp: 0.95,                // Temperatura iniziale alta
    tempDecay: 0.7,                   // Fattore di decay esponenziale
    acceptanceThreshold: 0.3          // Soglia minima per acceptance
  },

  // Multilingual
  autoDetectLanguage: true,           // Rileva automaticamente la lingua
  defaultLanguage: 'en',              // Lingua di fallback

  // Scoring
  scoringEnabled: true,               // Usa scoring per accept/reject
  scoringModel: 'gpt-4o-mini'        // Modello per scoring (può essere diverso)
}
```

## 📈 Vantaggi Attesi

### MCMC Sampling

| Aspetto | Prima | Dopo MCMC |
|---------|-------|-----------|
| **Esplorazione** | k samples indipendenti | Catena guidata con annealing |
| **Qualità** | Basata su judge singolo | Score continuo + acceptance |
| **Convergenza** | Non garantita | Tende a soluzioni ottimali |
| **Diversità** | Alta ma non guidata | Alta iniziale → focalizzata |
| **Robustezza** | Dipende da k | Dipende da T e acceptance |

### Supporto Multilingua

| Aspetto | Prima | Dopo |
|---------|-------|------|
| **Lingua output** | Mista (it/en) | Uguale all'input |
| **User experience** | Confusa | Coerente |
| **Internazionalità** | Limitata | Pieno supporto 7 lingue |
| **Prompt clarity** | Hard-coded | Template-based |

## 🎯 Metriche di Successo

Dopo l'implementazione, misurare:

1. **Accuracy**: % di risposte corrette su benchmark
2. **Consistency**: % di risposte identiche su ripetizioni
3. **Speed**: Tempo medio di elaborazione
4. **Language adherence**: % di risposte nella lingua corretta
5. **User satisfaction**: Rating medio utenti

## 📝 Piano di Implementazione

### Fase 1: Supporto Multilingua (Priorità ALTA)
- [ ] Implementare `detectLanguage()`
- [ ] Ristrutturare `prompts.json` con template multilingua
- [ ] Aggiungere parametro `language` a tutti i metodi
- [ ] Testare con prompts in 7 lingue

**Tempo stimato**: 2-3 ore
**Complessità**: Media

### Fase 2: MCMC Core (Priorità ALTA)
- [ ] Implementare `scoreReasoning()` agent
- [ ] Implementare `mcmcChainSampling()` method
- [ ] Aggiungere temperature annealing schedule
- [ ] Implementare Metropolis-Hastings acceptance

**Tempo stimato**: 3-4 ore
**Complessità**: Alta

### Fase 3: Testing & Tuning (Priorità MEDIA)
- [ ] Testare MCMC con diversi parametri (k, T, decay)
- [ ] Confrontare MCMC vs sampling classico
- [ ] Ottimizzare scoring function weights
- [ ] A/B testing su dataset di test

**Tempo stimato**: 2-3 ore
**Complessità**: Media

### Fase 4: UI Updates (Priorità BASSA)
- [ ] Aggiungere toggle "MCMC Mode" in UI
- [ ] Mostrare chain steps in UI (opzionale)
- [ ] Visualizzare acceptance rate e scores
- [ ] Aggiungere slider per temperatura iniziale

**Tempo stimato**: 1-2 ore
**Complessità**: Bassa

## 🚨 Rischi e Mitigazioni

### Rischio 1: MCMC più lento del sampling classico
**Mitigazione**:
- Configurazione MCMC opzionale (flag `mcmc.enabled`)
- Mantenere modalità classica come fallback
- Ottimizzare con k=1 + T iterazioni invece di k=3

### Rischio 2: Language detection fallisce
**Mitigazione**:
- Fallback a lingua default (config.defaultLanguage)
- Cache del risultato per evitare chiamate ripetute
- Opzione manuale per forzare lingua

### Rischio 3: Scoring inconsistente
**Mitigazione**:
- Usare temperatura 0.0 per scorer (deterministico)
- Prompt molto specifico con criteri numerici
- Fallback a judge classico se score parsing fallisce

## 🔄 Alternative Considerate

### Alternative a MCMC:

1. **Beam Search**:
   - Pro: Più semplice, più veloce
   - Contro: Non esplora bene, può stuck in local optima

2. **Genetic Algorithm**:
   - Pro: Buona esplorazione, parallelizzabile
   - Contro: Complesso, richiede crossover/mutation logic

3. **Simple Temperature Annealing**:
   - Pro: Molto semplice
   - Contro: Manca meccanismo di acceptance/rejection

**Scelta MCMC**: Migliore bilancio tra esplorazione guidata e semplicità implementativa.

## 📚 Riferimenti Teorici

1. **Metropolis-Hastings Algorithm**:
   - Paper originale: Metropolis et al. (1953)
   - Applicazione a LLM: "Reasoning via Planning with LLMs" (2024)

2. **Simulated Annealing**:
   - Kirkpatrick et al. (1983)
   - Temperature scheduling in optimization

3. **Monte Carlo Tree Search (MCTS)**:
   - Inspirazione per tree-based reasoning
   - UCT algorithm per exploration/exploitation

4. **Self-Consistency Decoding**:
   - Wang et al. (2022) - "Self-Consistency Improves Chain of Thought"
   - Base teorica per multi-sample consensus

## ✅ Checklist Pre-Implementazione

Prima di iniziare a scrivere codice:

- [ ] Review completo di questo piano
- [ ] Approvazione dell'approccio MCMC
- [ ] Decisione su parametri default (k, T, decay)
- [ ] Scelta lingue da supportare (conferma 7 lingue)
- [ ] Setup test cases per validazione
- [ ] Decisione su backward compatibility

## 🎬 Prossimi Passi

Una volta approvato il piano:

1. **Creare branch git** `feature/mcmc-multilang`
2. **Implementare Fase 1** (Multilingua) - testing
3. **Implementare Fase 2** (MCMC) - testing
4. **Confronto benchmark** MCMC vs classico
5. **Merge to main** se risultati positivi

---

**Documento preparato da**: HELLvetIA
**Data**: 2025-10-28
**Versione**: 1.0
