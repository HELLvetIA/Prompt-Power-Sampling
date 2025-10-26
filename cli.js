#!/usr/bin/env node

/**
 * Power Sampling CLI
 *
 * Usage:
 *   node cli.js "your prompt here"
 *   node cli.js "your prompt" --k 5 --steps 3 --mode multi-sample
 */

import PowerSampling from './power-sampling.js';
import config from './config.js';

// Parse CLI arguments
function parseArgs() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
Power Sampling CLI

Usage:
  node cli.js "your prompt here" [options]

Options:
  --k <number>           Numero di campioni (default: 3)
  --steps <number>       Numero di iterazioni (default: 2)
  --mode <string>        Modalità: full | multi-sample | annotate (default: full)
  --model <string>       Modello LLM da usare (default: gpt-4o-mini)
  --verbose              Output dettagliato
  --json                 Output in formato JSON
  --help, -h             Mostra questo messaggio

Esempi:
  node cli.js "Risolvi: se x+y=10 e x-y=2, trova x e y"
  node cli.js "Spiega la relatività" --k 5 --mode multi-sample
  node cli.js "Analizza questo testo" --steps 3 --verbose
    `);
    process.exit(0);
  }

  const prompt = args[0];
  const options = {};

  for (let i = 1; i < args.length; i += 2) {
    const flag = args[i];
    const value = args[i + 1];

    switch (flag) {
      case '--k':
        options.k = parseInt(value);
        break;
      case '--steps':
        options.steps = parseInt(value);
        break;
      case '--mode':
        options.mode = value;
        break;
      case '--model':
        options.model = value;
        break;
      case '--verbose':
        options.verbose = true;
        i--; // No value for this flag
        break;
      case '--json':
        options.jsonOutput = true;
        i--; // No value for this flag
        break;
    }
  }

  return { prompt, options };
}

// Main CLI function
async function main() {
  const { prompt, options } = parseArgs();

  if (!prompt) {
    console.error('❌ Errore: Devi fornire un prompt!');
    console.log('Usa --help per vedere le istruzioni.');
    process.exit(1);
  }

  // Crea istanza PowerSampling
  const ps = new PowerSampling({ ...config, ...options });

  // Log configurazione se verbose
  if (options.verbose) {
    console.log('⚙️  Configurazione:');
    console.log(`   Modello: ${ps.config.model}`);
    console.log(`   Modalità: ${options.mode || 'full'}`);
    console.log(`   Campioni (k): ${ps.config.k}`);
    console.log(`   Steps: ${ps.config.steps}`);
    console.log('');
  }

  console.log('🚀 Avvio Power Sampling...\n');

  try {
    const result = await ps.run(prompt, options);

    if (result.success) {
      if (options.jsonOutput) {
        // Output JSON
        console.log(JSON.stringify(result, null, 2));
      } else {
        // Output human-readable
        console.log('✅ RISULTATO:\n');
        console.log(result.result.text);
        console.log('\n' + '─'.repeat(60));
        console.log(`⏱️  Tempo: ${(result.metadata.time / 1000).toFixed(2)}s`);
        console.log(`🎯 Modalità: ${result.metadata.mode}`);
        console.log(`📊 Configurazione: k=${result.metadata.config.k}, steps=${result.metadata.config.steps}`);

        if (options.verbose && result.result.candidates) {
          console.log('\n📋 TUTTI I CANDIDATI:');
          result.result.candidates.forEach((c, i) => {
            console.log(`\n--- C${i+1} ---`);
            console.log(c);
          });
        }
      }
    } else {
      console.error('❌ ERRORE:', result.error);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ ERRORE:', error.message);
    if (options.verbose) {
      console.error(error);
    }
    process.exit(1);
  }
}

// Run
main();
