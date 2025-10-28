/**
 * Power Sampling Configuration
 *
 * Puoi modificare questi valori o sovrascriverli quando istanzi PowerSampling
 */

export default {
  // LLM Provider Configuration
  provider: 'openai',              // 'openai' | 'anthropic' | 'google' (solo openai implementato per ora)
  model: process.env.OPENAI_MODEL || 'gpt-4o-mini',  // Modello da utilizzare
  baseURL: process.env.OPENAI_BASE_URL,              // Opzionale: custom endpoint (es. Azure OpenAI, OpenRouter)

  // API Key (meglio usare .env, questo è fallback)
  apiKey: process.env.OPENAI_API_KEY,

  // Power Sampling Parameters (ottimizzati per velocità)
  k: 2,                            // Numero di campioni da generare in multi-sampling (ridotto per velocità)
  steps: 1,                        // Numero di iterazioni di refinement (ridotto per velocità)
  blockTokens: 100,                // Numero approssimativo di token per blocco di continuazione (ridotto per velocità)

  // Temperature Settings
  temperature: {
    sample: 0.9,                   // Alta per diversità nei campioni iniziali
    rewrite: 0.6,                  // Media per riscritture accurate
    judge: 0.0                     // Bassa (deterministica) per selezione
  },

  // Advanced Options
  maxRetries: 3,                   // Retry su errori di rete
  timeout: 60000,                  // Timeout in ms per chiamate LLM

  // Debug & Logging
  verbose: false,                  // Log dettagliato delle operazioni
  logCosts: true,                  // Mostra stima costi per chiamata

  // Multilingual Support
  autoDetectLanguage: true,        // Rileva automaticamente la lingua del prompt
  defaultLanguage: 'en'            // Lingua di fallback se detection fallisce
};
