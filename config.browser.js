/**
 * Power Sampling Configuration for Browser/Vite
 *
 * Usa import.meta.env invece di process.env per compatibilità browser
 */

export default {
  // LLM Provider Configuration
  provider: 'openai',
  model: import.meta.env.VITE_OPENAI_MODEL || 'gpt-4o-mini',
  baseURL: import.meta.env.VITE_OPENAI_BASE_URL,

  // API Key
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,

  // Power Sampling Parameters
  k: 3,
  steps: 2,
  blockTokens: 200,

  // Temperature Settings
  temperature: {
    sample: 0.9,
    rewrite: 0.6,
    judge: 0.0
  },

  // Advanced Options
  maxRetries: 3,
  timeout: 60000,

  // Debug & Logging
  verbose: false,
  logCosts: true
};
