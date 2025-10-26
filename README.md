# Power Sampling - Training-Free LLM Reasoning

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)

> **[🇮🇹 Leggi in Italiano](./README.it.md)**

**Power Sampling** is a minimal, framework-agnostic implementation of training-free reasoning for Large Language Models (LLMs) using multi-sampling, self-critique, and selective rewriting techniques.

Unlike traditional approaches requiring model fine-tuning or complex architectures, Power Sampling achieves improved reasoning quality through pure prompt engineering and a **4-agent system** (Judge, Annotator, Rewriter, Solver).

---

## 🎯 Features

- **🚀 Training-Free**: No model fine-tuning required - works with any OpenAI-compatible API
- **🎭 Multi-Agent System**: 4 specialized agents (Judge, Annotator, Rewriter, Solver)
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

Power Sampling implements a **Reasoning with Sampling (RWS)** pipeline with a 4-agent system:

### 1️⃣ Multi-Sample Consensus
- Generate **k diverse candidates** (default: 3) with high temperature (0.9)
- **JUDGE agent** selects the best candidate based on logical coherence

### 2️⃣ Iterative Refinement (Blockwise)
- Continue reasoning in blocks (~200 tokens each)
- **ANNOTATOR agent** marks uncertain spans with `<weak>...</weak>` tags
- **REWRITER agent** rewrites only weak spans, preserving strong reasoning

### 3️⃣ Solution Extraction
- **SOLVER agent** reads the complete chain-of-thought
- Extracts a single, concise, deterministic solution (temperature 0.0)

### Flow Diagram

```
User Prompt
    ↓
Multi-Sample (k=3, temp=0.9)
    ↓
JUDGE Agent (temp=0.0) → Best Candidate
    ↓
[Repeat for 'steps' iterations]
│   Continue Reasoning (~200 tokens)
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

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** >= 18.0.0
- **npm** or **yarn**
- An OpenAI API key (or OpenRouter, Azure OpenAI, etc.)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/power-sampling-simple.git
cd power-sampling-simple

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
```

---

## 🏗 Architecture

### File Structure

```
power-sampling-simple/
├── power-sampling.js    # Core library (framework-agnostic)
├── prompts.json         # Configurable prompt templates (4 agents)
├── config.js            # Default configuration
├── config.browser.js    # Browser-specific config
├── cli.js               # Command-line interface
├── index.html           # Web UI (vanilla JS)
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

---

## 📖 Usage

### Web UI

1. Start the worker proxy: `npm run worker`
2. Start the dev server: `npm run dev`
3. Open http://localhost:5173
4. Enter your prompt
5. Select mode (Full / Multi-Sample / Annotate)
6. Adjust parameters (k, steps)
7. Click "Esegui Power Sampling"

**Output:**
- **Ragionamento**: Complete chain-of-thought reasoning
- **Soluzione**: Concise solution extracted by SOLVER agent

### CLI Usage

```bash
# Basic usage
npm run cli "Your prompt here"

# With options
npm run cli "Prompt" -- --k 5 --steps 3 --mode full --verbose

# JSON output
npm run cli "Prompt" -- --json

# Help
npm run cli -- --help
```

**CLI Options:**

| Option | Default | Description |
|--------|---------|-------------|
| `--k` | 3 | Number of samples to generate |
| `--steps` | 2 | Refinement iterations |
| `--mode` | full | Mode: `full`, `multi-sample`, `annotate` |
| `--json` | false | Output as JSON |
| `--verbose` | false | Show detailed logs |

### Library Import

```javascript
import PowerSampling from './power-sampling.js';

const ps = new PowerSampling({
  apiKey: 'your-api-key',
  model: 'gpt-4o-mini',
  k: 3,
  steps: 2
});

const result = await ps.run("Your prompt", { mode: 'full' });

console.log(result.result.reasoning);  // Chain-of-thought
console.log(result.result.solution);   // Concise solution (from SOLVER agent)
console.log(result.metadata.time);     // Execution time (ms)
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
  k: 3,                       // Number of samples
  steps: 2,                   // Refinement iterations
  blockTokens: 200,           // Tokens per continuation block
  proxyURL: 'http://localhost:8787',  // Proxy endpoint
  temperature: {
    sample: 0.9,              // High diversity for sampling
    rewrite: 0.6,             // Balanced for rewriting
    judge: 0.0                // Deterministic for judging
  }
}
```

### Prompts (`prompts.json`)

All prompts are fully customizable without code changes. The system uses **4 specialized agents**:

```json
{
  "mark": "Annotator prompt: how to identify weak spans",
  "rewrite": "Rewriter prompt: how to rewrite weak spans only",
  "judge": "Judge prompt: how to select best candidate",
  "solver": "Solver prompt: how to extract concise solution",

  "system_default": "Default system prompt with reasoning format",
  "judge_system": "Judge agent system prompt",
  "annotator_system": "Annotator agent system prompt",
  "rewriter_system": "Rewriter agent system prompt",
  "solver_system": "Solver agent system prompt"
}
```

**Variable Interpolation:**
- Use `{{variable}}` for dynamic values
- Available: `{{k}}`, `{{candidates}}`, `{{question}}`, `{{reasoning}}`, `{{blockTokens}}`

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
- `prompt` (String): User query or task
- `options` (Object):
  - `mode` (String): `'full'`, `'multi-sample'`, `'annotate'`
  - `k` (Number): Number of samples
  - `steps` (Number): Refinement iterations
  - `systemPrompt` (String): Custom system prompt

**Returns:** Promise resolving to:
```javascript
{
  success: true,
  result: {
    text: "...",        // Full output
    reasoning: "...",   // Chain-of-thought
    solution: "...",    // Concise solution (from SOLVER agent)
    candidates: [...],  // (multi-sample mode only)
    judge: "...",       // (multi-sample mode only)
    annotated: "...",   // (annotate mode only)
  },
  metadata: {
    time: 12345,        // Execution time (ms)
    mode: "full",
    config: { k: 3, steps: 2, model: "..." }
  }
}
```

##### `multiSampleConsensus(baseMessages, options)`

Generate k candidates and select best via JUDGE agent.

##### `annotateAndRewrite(draft, options)`

Mark weak spans with ANNOTATOR agent and rewrite them with REWRITER agent.

##### `blockwisePowerSampling(baseMessages, options)`

Full pipeline: multi-sample → iterative refinement.

##### `solverAgent(question, reasoning)`

Extract concise, deterministic solution from complete reasoning using SOLVER agent.

---

## 💰 Cost Estimation

### Per `full` mode run (default: k=3, steps=2)

**~11-13 LLM API calls:**
1. Multi-sample: 3 candidates
2. JUDGE agent: 1 call
3. Per step (×2):
   - Continuation: 1 call
   - ANNOTATOR agent: 1 call
   - REWRITER agent: 1 call
4. SOLVER agent: 1 call

**With `gpt-4o-mini` (OpenAI pricing):**
- Input: ~$0.15 per 1M tokens
- Output: ~$0.60 per 1M tokens
- **Estimated cost per query: $0.01 - $0.05**

### Cost Reduction Strategies

| Strategy | Savings | Trade-off |
|----------|---------|-----------|
| `k=2` | -33% calls | Less diversity |
| `steps=1` | -30% calls | Less refinement |
| `mode=multi-sample` | -60% calls | No refinement, no SOLVER |
| Use cheaper model | -50-90% cost | Quality may vary |

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

### Worker Not Starting

```bash
# Check if wrangler is installed
npm list wrangler

# Reinstall if needed
npm install -D wrangler

# Check .dev.vars exists
ls -la .dev.vars

# Try with verbose logging
npx wrangler dev --port 8787 --log-level debug
```

### SOLVER Agent Not Working

If the solution field shows "Nessuna soluzione separata disponibile":
1. Check that `prompts.json` contains `solver` and `solver_system` prompts
2. Verify the proxy is running (`npm run worker`)
3. Check browser console (F12) for errors
4. Ensure temperature is set to 0.0 for SOLVER agent

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
git clone https://github.com/yourusername/power-sampling-simple.git
cd power-sampling-simple
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
- Add streaming support for real-time output
- Implement result caching
- Add metrics and confidence scores
- Improve Web UI design
- Add more examples and use cases

---

## 📝 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- Inspired by research on training-free reasoning techniques
- Built with [OpenAI API](https://platform.openai.com/)
- Powered by [Cloudflare Workers](https://workers.cloudflare.com/)
- UI built with [Vite](https://vitejs.dev/)

---

## 📧 Contact

For questions, issues, or suggestions:

- **GitHub Issues**: [Create an issue](https://github.com/yourusername/power-sampling-simple/issues)
- **Discussions**: [Join the discussion](https://github.com/yourusername/power-sampling-simple/discussions)

---

## 🌟 Star History

If you find this project useful, please consider giving it a star on GitHub!

---

**Made with ❤️ for the Open Source Community**
