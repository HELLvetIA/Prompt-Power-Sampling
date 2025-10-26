# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Power Sampling Simple** è un'implementazione minimalista e training-free di Power Sampling per LLM reasoning. A differenza dell'implementazione fullstack precedente, questa versione:

- **Elimina completamente il backend** - usa direttamente SDK OpenAI dal client
- **6 file totali** invece di 20+
- **Framework-agnostic** - il core è utilizzabile ovunque (CLI, Web, Node.js)
- **Zero build step richiesto** - funziona immediatamente con Vite dev server

## Architecture

### Single-Tier Architecture

```
power-sampling.js (Core Library)
    ↓
OpenAI SDK (Direct API calls)
    ↓
LLM Provider (OpenAI, Azure, etc.)
```

**No backend proxy, no React framework dependency, no complex build pipeline.**

### File Structure

```
power-sampling-simple/
├── power-sampling.js    # Core library: multi-sample, annotate, rewrite logic
├── config.js           # Configuration with defaults
├── prompts.json        # Configurable prompt templates
├── cli.js              # Command-line interface
├── index.html          # Web UI (vanilla JS + Vite)
├── package.json        # Only 1 dependency: openai SDK
├── .env.example        # Environment variables template
└── CLAUDE.md           # This file
```

## Development Commands

### Quick Start

```bash
# Install dependencies (only OpenAI SDK)
npm install

# Setup environment
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY

# Run via CLI
npm run cli "Your prompt here"

# Run Web UI
npm run dev
# Opens on http://localhost:5173
```

### All Available Commands

```bash
# CLI with options
npm run cli "prompt" -- --k 5 --steps 3 --mode multi-sample --verbose

# Development server (Web UI)
npm run dev

# Production build
npm run build

# Preview production build
npm run preview
```

## Core Architecture

### PowerSampling Class (power-sampling.js)

**Framework-agnostic class** that implements the full RWS pipeline:

```javascript
class PowerSampling {
  constructor(config)              // Initialize with API key, model, parameters
  async loadPrompts()              // Load prompts from prompts.json
  async callLLM(messages, options) // Normalized LLM interface

  // Core methods
  async multiSampleConsensus(baseMessages, options)
  async annotateAndRewrite(draft, options)
  async blockwisePowerSampling(baseMessages, options)

  // Main entry point
  async run(prompt, options)
}
```

**Key Design Decisions:**

1. **Constructor config override**: Default values from `config.js` can be overridden at instantiation
2. **Prompt externalization**: Templates loaded from `prompts.json` for easy experimentation
3. **Mode selection**: `full` | `multi-sample` | `annotate` allows using individual steps
4. **Metadata return**: Every `run()` returns `{ success, result, metadata }` with timing info

### Prompt Templates (prompts.json)

**Configurable without code changes:**

- `mark` - How to annotate weak reasoning spans with `<weak>...</weak>`
- `rewrite` - How to rewrite only weak spans
- `judge` - How to select best candidate from k samples
- System prompts for each role (judge, annotator, rewriter)

**Variable interpolation** using `{{variable}}` syntax (e.g., `{{k}}`, `{{candidates}}`).

### Configuration (config.js)

**Single source of truth** for all parameters:

```javascript
{
  provider: 'openai',
  model: 'gpt-4o-mini',
  k: 3,                    // number of samples
  steps: 2,                // refinement iterations
  blockTokens: 200,        // continuation length
  temperature: {
    sample: 0.9,           // high diversity
    rewrite: 0.6,          // balanced accuracy
    judge: 0.0             // deterministic selection
  }
}
```

## Three Usage Modes

### 1. CLI (cli.js)

Command-line tool with argument parsing:

```bash
node cli.js "prompt" --k 5 --steps 3 --mode multi-sample --json --verbose
```

**Features:**
- Help system (`--help`)
- JSON output mode
- Verbose logging
- Progress indicators

### 2. Web UI (index.html)

**Vanilla JavaScript** implementation using ES modules:

- No React, no build step required
- Direct import of `power-sampling.js` and `config.js`
- Inline `<script type="module">` for simplicity
- CSS-in-HTML for zero external dependencies

**UI Controls:**
- Textarea for prompt input
- Dropdowns for mode selection
- Number inputs for k and steps
- Real-time result display with metadata

### 3. Library Import

```javascript
import PowerSampling from './power-sampling.js';
import { multiSample, annotateWeakSpans, powerSampling } from './power-sampling.js';

// Full control
const ps = new PowerSampling({ apiKey: '...', k: 5 });
const result = await ps.run("prompt");

// Convenience functions
const samples = await multiSample("prompt", { k: 5 });
const rewritten = await annotateWeakSpans("text");
const full = await powerSampling("prompt", { steps: 3 });
```

## RWS Flow Implementation

### 1. Multi-Sample Consensus

```javascript
async multiSampleConsensus(baseMessages, { k, temperature })
```

**Steps:**
1. Call LLM with `n=k` to generate k diverse candidates (temp=0.9)
2. Format candidates as "C1, C2, ..., Ck"
3. Call judge LLM with consensus prompt (temp=0.0)
4. Parse "BEST: CX" response
5. Return best candidate + all candidates + judge reasoning

### 2. Annotate and Rewrite

```javascript
async annotateAndRewrite(draft, { temperature })
```

**Steps:**
1. Call LLM with mark prompt → annotated text with `<weak>...</weak>` tags
2. Check if any weak spans exist
3. If yes: call LLM with rewrite prompt → final text without tags
4. If no: return original draft
5. Return `{ final, annotated, notes }`

### 3. Blockwise Power Sampling

```javascript
async blockwisePowerSampling(baseMessages, { steps, blockTokens, k })
```

**Full pipeline:**
1. Initial multi-sample consensus → best candidate
2. For each step (0 to steps-1):
   - Continue reasoning (~blockTokens more)
   - Annotate weak spans
   - Rewrite weak spans
   - Update current text
3. Return final refined text

## Key Differences from Original Template

| Aspect | Original (rws-fullstack) | New (power-sampling-simple) |
|--------|--------------------------|------------------------------|
| **Backend** | FastAPI Python server | None (direct SDK calls) |
| **Frontend** | React + Vite | Vanilla JS + Vite |
| **Files** | 20+ | 6 |
| **Dependencies** | 12+ (Python + Node) | 1 (openai SDK) |
| **Setup time** | 10-15 min | 30 sec |
| **Complexity** | High (backend + frontend) | Low (single tier) |
| **Deployment** | Backend + Frontend hosting | Static hosting only |

## Environment Variables

**Only one required:**

```
OPENAI_API_KEY=sk-...
```

**Optional:**

```
OPENAI_BASE_URL=https://...  # For Azure OpenAI or custom endpoints
OPENAI_MODEL=gpt-4o-mini     # Override default model
```

**Important:** Since there's no backend proxy, in production you should:
1. Use a serverless function (Vercel Edge, Cloudflare Workers) as proxy
2. Or run CLI locally only
3. Or implement browser-based encryption for API keys

## Cost Estimation

Per `full` mode run with default config (k=3, steps=2):

**~10-15 LLM calls:**
- 3 initial samples
- 1 judge
- 2 × (continuation + annotation + rewrite) = 6 calls

**With gpt-4o-mini:**
- Input: ~$0.15/1M tokens
- Output: ~$0.60/1M tokens
- **Estimated cost per query: $0.01-0.05**

**Cost reduction strategies:**
- Use `k=2` (-33% calls)
- Use `steps=1` (-50% calls)
- Use `mode=multi-sample` only (~4 calls, -60%)

## Testing

### Manual Testing

```bash
# Test CLI
npm run cli "Test prompt" --verbose

# Test specific modes
npm run cli "Test" --mode multi-sample
npm run cli "Test" --mode annotate

# Test with different parameters
npm run cli "Test" --k 5 --steps 3
```

### Library Testing

```javascript
import PowerSampling from './power-sampling.js';

const ps = new PowerSampling({
  apiKey: process.env.OPENAI_API_KEY,
  k: 2,
  steps: 1
});

const result = await ps.run("Test prompt", { mode: 'full' });
console.assert(result.success === true);
console.assert(result.result.text.length > 0);
console.assert(result.metadata.time > 0);
```

## Troubleshooting

### "Module not found" error

Ensure `package.json` has:
```json
{
  "type": "module"
}
```

### API key not loaded

On Windows, environment variables from `.env` are not auto-loaded. Options:
1. Use `cross-env`: `npm install -D cross-env`
2. Or load manually in code: `import dotenv from 'dotenv'; dotenv.config();`
3. Or set system environment variable

### CORS errors in browser

This happens if trying to call OpenAI API directly from browser. Solutions:
1. Use Vite dev server (`npm run dev`) which can proxy requests
2. Add proxy configuration to `vite.config.js`
3. Or use a serverless backend proxy

## Extension Points

### Adding New LLM Providers

Extend `callLLM()` method in `power-sampling.js`:

```javascript
async callLLM(messages, options) {
  if (this.config.provider === 'openai') {
    // Existing OpenAI implementation
  } else if (this.config.provider === 'anthropic') {
    // Add Anthropic SDK call here
    // Must return normalized { choices: [{ content }] }
  }
}
```

### Customizing Prompts

Edit `prompts.json` directly - no code changes needed:

```json
{
  "mark": "Your custom annotation instructions...",
  "rewrite": "Your custom rewrite instructions...",
  "judge": "Your custom judging criteria..."
}
```

### Adding New Modes

Add case in `run()` method:

```javascript
case 'your-mode':
  // Your custom pipeline
  result = await yourCustomLogic(baseMessages, options);
  break;
```

## Important Notes

- **No API key security**: Direct SDK calls expose keys in client code - only for development/local use
- **Cost awareness**: Each `full` run = 10-15 API calls - monitor usage
- **Temperature tuning**: High temp (0.9) for diversity, low (0.0-0.6) for accuracy
- **Prompt engineering**: Most improvements come from better prompts, not code changes
