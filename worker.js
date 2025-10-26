/**
 * Cloudflare Worker - Proxy API per Power Sampling
 *
 * Deploy con: npx wrangler deploy
 * Gratuito: 100k richieste/giorno
 */

export default {
  async fetch(request, env) {
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Solo POST /api/proxy
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    try {
      const body = await request.json();

      // Chiama LLM provider
      const response = await fetch(`${env.OPENAI_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: body.model || env.OPENAI_MODEL,
          messages: body.messages,
          n: body.n || 1,
          temperature: body.temperature || 0.7,
        }),
      });

      const data = await response.json();

      // Normalizza risposta
      const choices = (data.choices || []).map(c => ({
        content: c.message?.content || c.text || ''
      }));

      return new Response(JSON.stringify({ choices }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  },
};
