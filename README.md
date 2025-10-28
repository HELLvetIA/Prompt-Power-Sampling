# Power Sampling - Training-Free LLM Reasoning

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)

> **[🇮🇹 Leggi in Italiano](./README.it.md)**

**Power Sampling** is a minimal, framework-agnostic implementation of training-free reasoning for Large Language Models (LLMs) using multi-sampling, self-critique, selective rewriting, and **MCMC-inspired chain sampling** techniques.

Unlike traditional approaches requiring model fine-tuning or complex architectures, Power Sampling achieves improved reasoning quality through pure prompt engineering and a **5-agent system** (Judge, Annotator, Rewriter, Solver, Scorer).

---

## 🎯 Features

- **🚀 Training-Free**: No model fine-tuning required - works with any OpenAI-compatible API
- **🎭 Multi-Agent System**: 5 specialized agents (Judge, Annotator, Rewriter, Solver, Scorer)
- **🔬 MCMC Chain Sampling**: Markov Chain Monte Carlo with temperature annealing and Metropolis-Hastings acceptance
- **🌍 Multilingual Support**: Automatic language detection - responds in 7 languages (IT, EN, ES, DE, ZH, FR, RU)
- **📦 Minimal Dependencies**: Only 2 dependencies (OpenAI SDK for CLI, Vite for web UI)
- **🔒 Secure by Default**: API keys protected via Cloudflare Workers proxy
- **🌐 Framework-Agnostic**: Core library works in Node.js, browser, CLI, or any environment
- **⚙️ Highly Configurable**: JSON-based prompt templates and parameters
- **🎨 Dual Interface**: Command-line tool + beautiful web UI

---

## 📋 Table of Contents

- [How It Works](#-how-it-works)
- [Quick Start](#-quick-start)
- [Architecture](#-architecture)
- [Usage](#-usage)
- [Configuration](#-configuration)
- [API Reference](#-api-reference)
- [Cost Estimation](#-cost-estimation)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🧠 How It Works

Power Sampling implements a **Reasoning with Sampling (RWS)** pipeline with a 5-agent system and two operational modes:

### Mode 1: Classic Power Sampling (Default)

#### 1️⃣ Multi-Sample Consensus
- Generate **k diverse candidates** (default: 2) with high temperature (0.9)
- **JUDGE agent** selects the best candidate based on logical coherence

#### 2️⃣ Iterative Refinement (Blockwise)
- Continue reasoning in blocks (~100 tokens each)
- **ANNOTATOR agent** marks uncertain spans with `<weak>...</weak>` tags
- **REWRITER agent** rewrites only weak spans, preserving strong reasoning

#### 3️⃣ Solution Extraction
- **SOLVER agent** reads the complete chain-of-thought
- Extracts a single, concise, deterministic solution (temperature 0.0)

### Mode 2: MCMC Chain Sampling (Advanced)

#### 1️⃣ Initial Sampling
- Generate k candidates with high temperature (0.95)
- Select best as initial state X₀
- **SCORER agent** evaluates quality (0-10 scale)

#### 2️⃣ MCMC Iterations with Temperature Annealing
For each step t = 1, 2, ..., T:
- **Temperature annealing**: `temp(t) = 0.95 × (0.7^t)` (simulated annealing)
- **PROPOSE**: Continue reasoning with annealed temperature
- **REFINE**: Annotate and rewrite weak spans
- **SCORE**: Evaluate proposed state quality
- **ACCEPT/REJECT**: Metropolis-Hastings criterion
  - If `score_new > score_old` → Always accept
  - Else accept with probability `score_new / score_old`

#### 3️⃣ Best State Selection
- Select best state from chain (highest score)
- **SOLVER agent** extracts final solution

### 🌍 Multilingual Intelligence

**Automatic Language Detection**: The system detects the language of your prompt and responds in the same language across all agents.

**Supported Languages**:
- 🇮🇹 Italian (Italiano)
- 🇬🇧 English
- 🇪🇸 Spanish (Español)
- 🇩🇪 German (Deutsch)
- 🇨🇳 Chinese (中文)
- 🇫🇷 French (Français)
- 🇷🇺 Russian (Русский)

All prompts, agents, and system messages are dynamically translated to maintain consistency.

### Flow Diagram (Classic Mode)

```
User Prompt → Language Detection
    ↓
Multi-Sample (k=2, temp=0.9)
    ↓
JUDGE Agent (temp=0.0) → Best Candidate
    ↓
[Repeat for 'steps' iterations]
│   Continue Reasoning (~100 tokens)
│   ↓
│   ANNOTATOR Agent (temp=0.6) → Mark <weak> spans
│   ↓
│   REWRITER Agent (temp=0.54) → Rewrite weak spans only
└── Final Reasoning
    ↓
SOLVER Agent (temp=0.0) → Extract Solution
    ↓
┌─────────────────┬──────────────────┐
│   Reasoning     │    Solution      │
│ (Full CoT)      │  (Concise)       │
└─────────────────┴──────────────────┘
```

### Flow Diagram (MCMC Mode)

```
User Prompt → Language Detection
    ↓
Initial Multi-Sample (k=2, temp=0.95)
    ↓
SCORER Agent → Initial Score (e.g., 7.0/10)
    ↓
[MCMC Chain: Repeat for T iterations]
│   temp(t) = 0.95 × (0.7^t)  ← Temperature Annealing
│   ↓
│   PROPOSE: Continue with temp(t)
│   ↓
│   REFINE: Annotate + Rewrite weak spans
│   ↓
│   SCORER Agent → New Score (e.g., 7.5/10)
│   ↓
│   Metropolis-Hastings Decision:
│   • If score_new > score_old → ✅ ACCEPT
│   • Else → Accept with prob = score_new/score_old
└── Best State from Chain
    ↓
SOLVER Agent (temp=0.0) → Extract Solution
    ↓
┌─────────────────┬──────────────────┬─────────────┐
│   Reasoning     │    Solution      │   Metadata  │
│ (Best from      │  (Concise)       │ (Score,     │
│  chain)         │                  │  Chain)     │
└─────────────────┴──────────────────┴─────────────┘
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** >= 18.0.0
- **npm** or **yarn**
- An OpenAI API key (or OpenRouter, Azure OpenAI, etc.)

### Installation

```bash
# Clone the repository
git clone https://github.com/HELLvetIA/Prompt-Power-Sampling.git
cd Prompt-Power-Sampling/power-sampling-simple

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
# Edit .env and add your API keys
```

### Configure `.env`

```bash
# For Node.js (CLI)
OPENAI_API_KEY=your-openai-api-key
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o-mini

# For Browser (Vite requires VITE_ prefix)
VITE_OPENAI_API_KEY=your-openai-api-key
VITE_OPENAI_BASE_URL=https://api.openai.com/v1
VITE_OPENAI_MODEL=gpt-4o-mini
```

### Start Cloudflare Workers Proxy (Recommended)

For secure local development without exposing API keys in browser:

```bash
# Create .dev.vars file
cp .dev.vars.example .dev.vars
# Edit .dev.vars with your API key

# Start proxy on localhost:8787
npm run worker
```

### Run the Application

**Option 1: Web UI**

```bash
npm run dev
# Open http://localhost:5173
```

**Option 2: Command Line**

```bash
npm run cli "Solve: if x+y=10 and x-y=2, find x and y"

# Try MCMC mode
npm run cli "Solve: x+y=10, x-y=2" -- --mode mcmc --verbose
```

---

## 🏗 Architecture

### File Structure

```
power-sampling-simple/
├── power-sampling.js    # Core library (framework-agnostic)
├── prompts.json         # Multilingual prompt templates (5 agents × 7 languages)
├── config.js            # Default configuration
├── config.browser.js    # Browser-specific config
├── cli.js               # Command-line interface
├── index.html           # Web UI (vanilla JS)
├── translations.json    # UI translations (7 languages)
├── worker.js            # Cloudflare Workers proxy
├── wrangler.toml        # Cloudflare config
├── .env                 # Environment variables
├── .dev.vars            # Worker secrets (local)
├── package.json         # Dependencies
└── README.md            # This file
```

### Multi-Agent System

| Agent | Role | Temperature | Purpose |
|-------|------|-------------|---------|
| **JUDGE** | Select best candidate | 0.0 | Choose most coherent reasoning from k samples |
| **ANNOTATOR** | Mark weak spans | 0.6 | Identify uncertain parts with `<weak>` tags |
| **REWRITER** | Rewrite weak spans | 0.54 | Improve only marked sections |
| **SOLVER** | Extract solution | 0.0 | Deterministic final answer extraction |
| **SCORER** ⭐ NEW | Evaluate quality | 0.0 | Rate reasoning quality (0-10) for MCMC |

---

## 📖 Usage

### Web UI

1. Start the worker proxy: `npm run worker`
2. Start the dev server: `npm run dev`
3. Open http://localhost:5173
4. **Select language** from dropdown (optional - auto-detected from prompt)
5. Enter your prompt **in any supported language**
6. Select mode:
   - **Full**: Classic multi-sample + refinement
   - **MCMC**: Chain sampling with acceptance/rejection ⭐ NEW
   - **Multi-Sample**: Only consensus selection
   - **Annotate**: Only annotation + rewrite
7. Adjust parameters (k, steps)
8. Click "Run Power Sampling"

**Output:**
- **Reasoning**: Complete chain-of-thought reasoning (in your language)
- **Solution**: Concise solution extracted by SOLVER agent (in your language)
- **Metadata**: Time, mode, language, scores (MCMC mode only)

### CLI Usage

```bash
# Basic usage
npm run cli "Your prompt here"

# With options
npm run cli "Prompt" -- --k 5 --steps 3 --mode full --verbose

# MCMC mode (NEW)
npm run cli "Prompt" -- --mode mcmc --k 2 --steps 3 --verbose

# JSON output
npm run cli "Prompt" -- --json

# Help
npm run cli -- --help
```

**CLI Options:**

| Option | Default | Description |
|--------|---------|-------------|
| `--k` | 2 | Number of samples to generate |
| `--steps` | 1 | Refinement/MCMC iterations |
| `--mode` | full | Mode: `full`, `mcmc`, `multi-sample`, `annotate` |
| `--json` | false | Output as JSON |
| `--verbose` | false | Show detailed logs (including MCMC chain) |

### Library Import

```javascript
import PowerSampling from './power-sampling.js';

const ps = new PowerSampling({
  apiKey: 'your-api-key',
  model: 'gpt-4o-mini',
  k: 2,
  steps: 1
});

// Classic mode
const result = await ps.run("Your prompt", { mode: 'full' });

console.log(result.metadata.language);     // Detected language (e.g., 'it')
console.log(result.result.reasoning);      // Chain-of-thought
console.log(result.result.solution);       // Concise solution
console.log(result.metadata.time);         // Execution time (ms)

// MCMC mode (NEW)
const mcmcResult = await ps.run("Your prompt", { mode: 'mcmc' });

console.log(mcmcResult.result.score);              // Best score (0-10)
console.log(mcmcResult.result.mcmcMetadata);       // Chain metadata
console.log(mcmcResult.result.chain);              // Full chain history
```

**Convenience Functions:**

```javascript
import { multiSample, annotateWeakSpans, powerSampling } from './power-sampling.js';

// Only multi-sample consensus
const samples = await multiSample("prompt", { k: 5 });

// Only annotate + rewrite
const rewritten = await annotateWeakSpans("text");

// Full pipeline
const full = await powerSampling("prompt", { steps: 3 });
```

---

## ⚙️ Configuration

### Parameters (`config.js`)

```javascript
{
  provider: 'openai',         // LLM provider
  model: 'gpt-4o-mini',       // Model name
  k: 2,                       // Number of samples (reduced for speed)
  steps: 1,                   // Refinement iterations (reduced for speed)
  blockTokens: 100,           // Tokens per continuation block (reduced for speed)
  proxyURL: 'http://localhost:8787',  // Proxy endpoint

  temperature: {
    sample: 0.9,              // High diversity for sampling
    rewrite: 0.6,             // Balanced for rewriting
    judge: 0.0                // Deterministic for judging
  },

  // Multilingual (NEW)
  autoDetectLanguage: true,   // Auto-detect prompt language
  defaultLanguage: 'en',      // Fallback language

  // MCMC Parameters (NEW)
  mcmc: {
    enabled: true,            // Enable MCMC mode
    initialTemp: 0.95,        // Initial temperature (high exploration)
    tempDecay: 0.7,           // Exponential decay factor
    acceptanceThreshold: 0.3  // Reference threshold
  }
}
```

### Prompts (`prompts.json`)

All prompts support **7 languages** with automatic selection based on detected language:

```json
{
  "mark": {
    "template": "...",
    "languages": {
      "it": "Annotator prompt in Italian",
      "en": "Annotator prompt in English",
      "es": "Annotator prompt in Spanish",
      "de": "Annotator prompt in German",
      "zh": "Annotator prompt in Chinese",
      "fr": "Annotator prompt in French",
      "ru": "Annotator prompt in Russian"
    }
  },
  "rewrite": { "template": "...", "languages": {...} },
  "judge": { "template": "...", "languages": {...} },
  "solver": { "template": "...", "languages": {...} },
  "scorer": { "template": "...", "languages": {...} }  // NEW
}
```

**Variable Interpolation:**
- Use `{{variable}}` for dynamic values
- Available: `{{k}}`, `{{candidates}}`, `{{question}}`, `{{reasoning}}`, `{{blockTokens}}`, `{{language}}`, `{{text}}`

---

## 📚 API Reference

### `PowerSampling` Class

#### Constructor

```javascript
new PowerSampling(config)
```

**Parameters:**
- `config` (Object): Configuration object (overrides defaults from `config.js`)

#### Methods

##### `run(prompt, options)`

Main entry point for running power sampling.

**Parameters:**
- `prompt` (String): User query or task (in any supported language)
- `options` (Object):
  - `mode` (String): `'full'`, `'mcmc'`, `'multi-sample'`, `'annotate'`
  - `k` (Number): Number of samples
  - `steps` (Number): Refinement/MCMC iterations
  - `systemPrompt` (String): Custom system prompt

**Returns:** Promise resolving to:
```javascript
{
  success: true,
  result: {
    text: "...",        // Full output
    reasoning: "...",   // Chain-of-thought
    solution: "...",    // Concise solution (from SOLVER agent)

    // MCMC mode only:
    score: 8.5,         // Best score from chain
    chain: [...],       // Full chain history
    mcmcMetadata: {
      bestIteration: 2,
      acceptanceRate: 0.67,
      initialScore: 7.0,
      finalScore: 8.5
    },

    // Other modes:
    candidates: [...],  // (multi-sample mode only)
    judge: "...",       // (multi-sample mode only)
    annotated: "...",   // (annotate mode only)
  },
  metadata: {
    time: 12345,        // Execution time (ms)
    mode: "mcmc",
    language: "it",     // Detected language (NEW)
    config: { k: 2, steps: 1, model: "..." }
  }
}
```

##### `detectLanguage(prompt)` ⭐ NEW

Automatically detect language from prompt.

**Returns:** Promise resolving to language code (`'it'`, `'en'`, `'es'`, etc.)

##### `scoreReasoning(text, language)` ⭐ NEW

Evaluate reasoning quality using SCORER agent (0-10 scale).

**Returns:** Promise resolving to:
```javascript
{
  score: 7.5,           // Quality score [0-10]
  reason: "...",        // Brief explanation
  fullResponse: "..."   // Complete SCORER output
}
```

##### `mcmcChainSampling(baseMessages, options)` ⭐ NEW

MCMC chain sampling with temperature annealing and Metropolis-Hastings.

**Returns:** Promise resolving to:
```javascript
{
  text: "...",          // Best state from chain
  score: 8.5,           // Best score
  chain: [...],         // Full chain history
  metadata: {...}       // MCMC metadata
}
```

##### `multiSampleConsensus(baseMessages, options)`

Generate k candidates and select best via JUDGE agent.

##### `annotateAndRewrite(draft, options)`

Mark weak spans with ANNOTATOR agent and rewrite them with REWRITER agent.

##### `blockwisePowerSampling(baseMessages, options)`

Full pipeline: multi-sample → iterative refinement.

##### `solverAgent(question, reasoning, language)`

Extract concise, deterministic solution from complete reasoning using SOLVER agent.

---

## 💰 Cost Estimation

### Per `full` mode run (default: k=2, steps=1)

**~7-9 LLM API calls:**
1. Language detection: 1 call
2. Multi-sample: 2 candidates
3. JUDGE agent: 1 call
4. Per step (×1):
   - Continuation: 1 call
   - ANNOTATOR agent: 1 call
   - REWRITER agent: 1 call
5. SOLVER agent: 1 call

### Per `mcmc` mode run (default: k=2, steps=3)

**~12-15 LLM API calls:**
1. Language detection: 1 call
2. Multi-sample: 2 candidates
3. SCORER agent (initial): 1 call
4. Per MCMC iteration (×3):
   - Continuation: 1 call
   - ANNOTATOR agent: 1 call
   - REWRITER agent: 1 call
   - SCORER agent: 1 call
5. SOLVER agent: 1 call

**With `gpt-4o-mini` (OpenAI pricing):**
- Input: ~$0.15 per 1M tokens
- Output: ~$0.60 per 1M tokens
- **Estimated cost per query:**
  - `full` mode: **$0.005 - $0.02**
  - `mcmc` mode: **$0.01 - $0.03**

### Cost Reduction Strategies

| Strategy | Savings | Trade-off |
|----------|---------|-----------|
| `k=1` | -50% samples | No diversity |
| `steps=1` | -67% calls (mcmc) | Less refinement |
| `mode=multi-sample` | -70% calls | No refinement, no SOLVER |
| Use cheaper model | -50-90% cost | Quality may vary |
| Disable language detection | -1 call | Manual language setting |

---

## 🔬 MCMC Mode Explained

### What is MCMC?

**Markov Chain Monte Carlo** is a sampling technique that:
- Creates a **chain** of states instead of independent samples
- Uses **guided exploration** with temperature annealing
- **Accepts/rejects** proposals based on quality scores
- Tends to **converge** to high-quality solutions

### Temperature Annealing Schedule

| Step | Temperature | Behavior |
|------|-------------|----------|
| 0 | 0.95 | High exploration, diverse candidates |
| 1 | 0.665 | Moderate exploration |
| 2 | 0.465 | Refinement phase |
| 3 | 0.326 | Convergence |
| 4+ | <0.23 | Precision fine-tuning |

Formula: `temp(t) = 0.95 × (0.7^t)`

### Metropolis-Hastings Acceptance

```
acceptance_prob = min(1, score_new / score_old)

Examples:
• score_old=6.0, score_new=8.0 → prob=1.00 (100%) → Always accept
• score_old=8.0, score_new=6.0 → prob=0.75 (75%)  → Sometimes accept
• score_old=9.0, score_new=4.5 → prob=0.50 (50%)  → Rarely accept
```

**Benefit**: Allows occasional "downhill" moves to escape local optima.

### When to Use MCMC Mode

✅ **Use MCMC when:**
- You need **highest quality** reasoning
- You have complex, multi-step problems
- You want to explore the solution space systematically
- You need chain history and quality scores

❌ **Use classic mode when:**
- Speed is more important than optimal quality
- Simple, straightforward questions
- Budget constraints (MCMC costs ~30% more)

---

## 🔒 Security Best Practices

### Development
- Use Cloudflare Workers proxy (`npm run worker`) to keep API keys server-side
- Never commit `.env` or `.dev.vars` to version control
- Add `.env` and `.dev.vars` to `.gitignore`

### Production
- Deploy worker to Cloudflare: `npm run worker:deploy`
- Set environment variables in Cloudflare dashboard
- Update `proxyURL` in config to production URL
- Enable rate limiting and authentication on proxy

### Alternative Proxies
- **Cloudflare Workers**: Recommended for this project (included)
- **Vercel Edge Functions**: Serverless proxy on Vercel
- **Express.js**: Traditional Node.js server

---

## 🛠 Troubleshooting

### Module Not Found Error

Ensure `package.json` has:
```json
{
  "type": "module"
}
```

### API Key Not Loaded (CLI)

On Windows, `.env` files may not auto-load. Solutions:
1. Use `cross-env`: `npm install -D cross-env`
2. Or manually load: Add `import 'dotenv/config';` at top of CLI code
3. Or set system environment variable

### CORS Errors in Browser

Direct API calls from browser are blocked by CORS. Solutions:
1. Use Cloudflare Workers proxy (recommended) - **included in this project**
2. Add proxy to `vite.config.js`
3. Use a backend proxy

### Language Detection Not Working

If responses are in wrong language:
1. Ensure `autoDetectLanguage: true` in `config.js`
2. Check prompt is clear (minimum 10-20 characters)
3. Manually set language: `ps.detectedLanguage = 'it'`
4. Check console logs with `verbose: true`

### MCMC Mode Too Slow

Reduce iterations:
```javascript
await ps.run(prompt, { mode: 'mcmc', steps: 1, k: 2 });
```

Or use classic mode for faster results.

---

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Setup

```bash
git clone https://github.com/HELLvetIA/Prompt-Power-Sampling.git
cd Prompt-Power-Sampling/power-sampling-simple
npm install
cp .env.example .env
cp .dev.vars.example .dev.vars
# Edit .env and .dev.vars with your API keys
npm run worker    # Terminal 1
npm run dev       # Terminal 2
```

### Ideas for Contributions

- Add support for other LLM providers (Anthropic, Google, etc.)
- Improve prompt templates in `prompts.json`
- Add more languages beyond the current 7
- Add streaming support for real-time output
- Implement result caching
- Visualize MCMC chain in web UI
- Add more MCMC algorithms (Gibbs sampling, etc.)
- Improve SCORER agent criteria
- Add more examples and use cases

---

## 📝 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- Inspired by research on training-free reasoning techniques and MCMC sampling
- Built with [OpenAI API](https://platform.openai.com/)
- Powered by [Cloudflare Workers](https://workers.cloudflare.com/)
- UI built with [Vite](https://vitejs.dev/)

---

## 📧 Contact

For questions, issues, or suggestions:

- **GitHub Issues**: [Create an issue](https://github.com/HELLvetIA/Prompt-Power-Sampling/issues)
- **Discussions**: [Join the discussion](https://github.com/HELLvetIA/Prompt-Power-Sampling/discussions)

---

## 🌟 Star History

If you find this project useful, please consider giving it a star on GitHub!

---

**Made with ❤️ for the Open Source Community**
