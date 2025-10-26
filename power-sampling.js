/**
 * Power Sampling - Core Library
 * Framework-agnostic implementation of training-free reasoning with sampling
 *
 * @author Generated for RWS Project
 * @license MIT
 */

// Carica dotenv solo in ambiente Node.js (CLI)
if (typeof process !== 'undefined' && process.versions?.node) {
  await import('dotenv/config');
}

// File system imports solo per Node.js
let fs, fileURLToPath, dirname, join;
if (typeof process !== 'undefined' && process.versions?.node) {
  const fsModule = await import('fs');
  fs = fsModule.promises;
  const urlModule = await import('url');
  fileURLToPath = urlModule.fileURLToPath;
  const pathModule = await import('path');
  dirname = pathModule.dirname;
  join = pathModule.join;
}

// __dirname solo in Node.js
let __filename, __dirname;
if (typeof process !== 'undefined' && process.versions?.node) {
  __filename = fileURLToPath(import.meta.url);
  __dirname = dirname(__filename);
}

/**
 * Main PowerSampling class
 */
export class PowerSampling {
  constructor(config = {}) {
    this.config = {
      provider: config.provider || 'openai',
      apiKey: config.apiKey || process.env.OPENAI_API_KEY,
      model: config.model || 'gpt-4o-mini',
      k: config.k || 3,
      steps: config.steps || 2,
      blockTokens: config.blockTokens || 200,
      temperature: {
        sample: config.temperature?.sample || 0.9,
        rewrite: config.temperature?.rewrite || 0.6,
        judge: config.temperature?.judge || 0.0,
      },
      ...config
    };

    // Proxy URL (locale o produzione)
    this.proxyURL = this.config.proxyURL || 'http://localhost:8787';

    // Load prompts
    this.prompts = null;
  }

  /**
   * Parse response to separate reasoning and solution
   */
  parseReasoningSolution(text) {
    const reasoningMatch = text.match(/RAGIONAMENTO:\s*([\s\S]*?)(?=SOLUZIONE:|$)/i);
    const solutionMatch = text.match(/SOLUZIONE:\s*([\s\S]*?)$/i);

    return {
      reasoning: reasoningMatch ? reasoningMatch[1].trim() : text,
      solution: solutionMatch ? solutionMatch[1].trim() : '',
      fullText: text
    };
  }

  /**
   * SOLVER agent - Extract deterministic solution from reasoning
   */
  async solverAgent(originalQuestion, reasoning) {
    await this.loadPrompts();

    const solverPrompt = this.prompts.solver
      .replace(/\{\{question\}\}/g, originalQuestion)
      .replace(/\{\{reasoning\}\}/g, reasoning);

    const messages = [
      { role: 'system', content: this.prompts.solver_system || 'You are a SOLVER agent.' },
      { role: 'user', content: solverPrompt }
    ];

    const response = await this.callLLM(messages, {
      n: 1,
      temperature: 0.0 // Temperatura zero per massima determinismo
    });

    return response.choices[0].content.trim();
  }

  /**
   * Load prompt templates from JSON file
   */
  async loadPrompts() {
    if (!this.prompts) {
      try {
        // In Node.js, carica da file
        if (typeof process !== 'undefined' && process.versions?.node && fs && join && __dirname) {
          const promptsPath = join(__dirname, 'prompts.json');
          const data = await fs.readFile(promptsPath, 'utf-8');
          this.prompts = JSON.parse(data);
        } else {
          // In browser, prova a fare fetch
          const response = await fetch('./prompts.json');
          if (response.ok) {
            this.prompts = await response.json();
          } else {
            throw new Error('Prompts file not found');
          }
        }
      } catch (error) {
        // Fallback to default prompts
        this.prompts = {
          mark: `Analizza la BOZZA. Segna gli span incerti con <weak>...</weak> e spiega in 1 riga perché.
Restituisci:
TESTO ANNOTATO (con <weak>)
NOTE (punti elenco brevi)`,
          rewrite: `Riscrivi SOLO i segmenti <weak>...</weak> mantenendo coerenza.
Restituisci il TESTO COMPLETO FINALE senza <weak> e senza commenti.`,
          judge: `Hai {{k}} CANDIDATI (C1..C{{k}}). Scegli il migliore.
{{candidates}}
Regole: coerenza logica, correttezza, assenza di contraddizioni.
Output:
BEST: CX
MOTIVO: (max 3 righe)`
        };
      }
    }
    return this.prompts;
  }

  /**
   * Call LLM via proxy
   */
  async callLLM(messages, options = {}) {
    const n = options.n || 1;
    const temperature = options.temperature ?? 0.7;

    try {
      const response = await fetch(this.proxyURL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.config.model,
          messages,
          n,
          temperature
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Proxy returned ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      return data; // Già nel formato { choices: [{ content }] }
    } catch (error) {
      throw new Error(`LLM call failed: ${error.message}`);
    }
  }

  /**
   * Step 1: Multi-sample generation with consensus selection
   */
  async multiSampleConsensus(baseMessages, options = {}) {
    const k = options.k || this.config.k;
    const temperature = options.temperature || this.config.temperature.sample;

    // Generate k candidates
    const response = await this.callLLM(baseMessages, { n: k, temperature });
    const candidates = response.choices.map(c => c.content);

    // Judge selection
    await this.loadPrompts();
    const candidatesText = candidates
      .map((c, i) => `C${i + 1}:\n${c}`)
      .join('\n\n');

    const judgePrompt = this.prompts.judge
      .replace(/\{\{k\}\}/g, k)
      .replace(/\{\{candidates\}\}/g, candidatesText);

    const judgeMessages = [
      { role: 'system', content: 'Sei un giudice di qualità del ragionamento.' },
      { role: 'user', content: judgePrompt }
    ];

    const judgeResponse = await this.callLLM(judgeMessages, {
      n: 1,
      temperature: this.config.temperature.judge
    });

    const judgeContent = judgeResponse.choices[0].content;
    const bestMatch = /BEST:\s*C(\d+)/i.exec(judgeContent);
    const bestIdx = bestMatch ? parseInt(bestMatch[1], 10) - 1 : 0;
    const safeIdx = Math.max(0, Math.min(bestIdx, candidates.length - 1));

    return {
      best: candidates[safeIdx],
      all: candidates,
      judge: judgeContent
    };
  }

  /**
   * Step 2: Annotate weak spans and rewrite them
   */
  async annotateAndRewrite(draft, options = {}) {
    const temperature = options.temperature || this.config.temperature.rewrite;
    await this.loadPrompts();

    // Annotation phase
    const markMessages = [
      { role: 'system', content: 'Sei un analista critico. Rispetta il formato richiesto.' },
      { role: 'user', content: `BOZZA:\n${draft}\n\n${this.prompts.mark}` }
    ];

    const markResponse = await this.callLLM(markMessages, { n: 1, temperature });
    const annotated = markResponse.choices[0].content;

    // Check if there are weak spans
    if (!annotated.includes('<weak>')) {
      return {
        final: draft,
        annotated,
        notes: 'Nessuno span debole identificato.'
      };
    }

    // Rewrite phase
    const rewriteMessages = [
      { role: 'system', content: 'Sei un editor. Modifica SOLO gli span <weak> preservando il resto.' },
      { role: 'user', content: `TESTO ANNOTATO:\n${annotated}\n\n${this.prompts.rewrite}` }
    ];

    const rewriteResponse = await this.callLLM(rewriteMessages, {
      n: 1,
      temperature: temperature * 0.9 // Slightly lower for stability
    });

    return {
      final: rewriteResponse.choices[0].content,
      annotated
    };
  }

  /**
   * Step 3: Blockwise power sampling (full pipeline)
   */
  async blockwisePowerSampling(baseMessages, options = {}) {
    const steps = options.steps || this.config.steps;
    const blockTokens = options.blockTokens || this.config.blockTokens;
    const k = options.k || this.config.k;

    // Initial multi-sample
    const { best } = await this.multiSampleConsensus(baseMessages, { k });
    let current = best;

    // Iterative refinement
    for (let t = 0; t < steps; t++) {
      // Continue reasoning
      const contMessages = [
        ...baseMessages,
        { role: 'assistant', content: current },
        {
          role: 'user',
          content: `Continua il ragionamento per circa ${blockTokens} token, fermati a fine frase.`
        }
      ];

      const contResponse = await this.callLLM(contMessages, {
        n: 1,
        temperature: this.config.temperature.sample * 0.9
      });

      current = current + '\n' + contResponse.choices[0].content;

      // Annotate and rewrite
      const { final } = await this.annotateAndRewrite(current);
      current = final;
    }

    return current;
  }

  /**
   * Main entry point - run power sampling on a prompt
   */
  async run(prompt, options = {}) {
    const systemPrompt = options.systemPrompt || 'Sei un assistente che ragiona in modo strutturato.';
    const mode = options.mode || 'full'; // 'full' | 'multi-sample' | 'annotate'

    const baseMessages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt }
    ];

    const startTime = Date.now();
    let result;

    try {
      switch (mode) {
        case 'multi-sample':
          const consensus = await this.multiSampleConsensus(baseMessages, options);
          result = {
            text: consensus.best,
            candidates: consensus.all,
            judge: consensus.judge
          };
          break;

        case 'annotate':
          const initial = await this.callLLM(baseMessages, { n: 1 });
          const rewrite = await this.annotateAndRewrite(initial.choices[0].content, options);
          result = {
            text: rewrite.final,
            annotated: rewrite.annotated,
            notes: rewrite.notes
          };
          break;

        case 'full':
        default:
          const final = await this.blockwisePowerSampling(baseMessages, options);
          const parsed = this.parseReasoningSolution(final);

          // Use SOLVER agent to extract deterministic solution
          const solverSolution = await this.solverAgent(
            prompt,
            parsed.reasoning || final
          );

          result = {
            text: final,
            reasoning: parsed.reasoning,
            solution: solverSolution  // Soluzione dal SOLVER agent
          };
          break;
      }

      const endTime = Date.now();

      return {
        success: true,
        result,
        metadata: {
          time: endTime - startTime,
          mode,
          config: {
            k: options.k || this.config.k,
            steps: options.steps || this.config.steps,
            model: this.config.model
          }
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        metadata: {
          time: Date.now() - startTime
        }
      };
    }
  }
}

// Utility functions for standalone usage
export async function multiSample(prompt, options = {}) {
  const ps = new PowerSampling(options);
  return ps.run(prompt, { ...options, mode: 'multi-sample' });
}

export async function annotateWeakSpans(text, options = {}) {
  const ps = new PowerSampling(options);
  return ps.annotateAndRewrite(text, options);
}

export async function powerSampling(prompt, options = {}) {
  const ps = new PowerSampling(options);
  return ps.run(prompt, { ...options, mode: 'full' });
}

// Default export
export default PowerSampling;
