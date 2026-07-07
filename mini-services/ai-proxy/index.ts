/**
 * AI Proxy Service — bridges Vercel app to z.ai SDK
 *
 * Vercel can't reach internal-api.z.ai (private IPs).
 * This service runs on z.ai network and exposes a public-compatible API.
 *
 * Endpoint: POST /chat/completions
 * Body: { model: string, messages: Array<{role,content}>, temperature?, max_tokens? }
 * Response: { choices: [{ message: { content: string } }] }
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import ZAI from 'z-ai-web-dev-sdk';

const app = new Hono();

// CORS — allow Vercel domains
app.use('*', cors({
  origin: ['https://my-project-puce-phi-13.vercel.app', 'http://localhost:3000'],
  allowMethods: ['POST', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// ZAI SDK config
const ZAI_CONFIG = {
  baseUrl: 'https://internal-api.z.ai/v1',
  apiKey: 'Z.ai',
  chatId: 'chat-25294527-e9a0-464d-8fa1-fd96b55b5553',
  userId: '2fe71c9b-9e4d-4011-b6fc-28d5b620d875',
  token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiMmZlNzFjOWItOWU0ZC00MDExLWI2ZmMtMjhkNWI2MjBkODc1IiwiY2hhdF9pZCI6ImNoYXQtMjUyOTQ1MjctZTlhMC00NjRkLThmYTEtZmQ5NmI1NWI1NTUzIiwicGxhdGZvcm0iOiJ6YWkifQ.EhizH5G9FdN9mwa4d3BW5dfguy_9zRxpmyXxQi9K3M8',
};

// Cache ZAI instance
let zaiInstance: InstanceType<typeof ZAI> | null = null;
async function getZAI(): Promise<InstanceType<typeof ZAI>> {
  if (!zaiInstance) {
    try {
      zaiInstance = await ZAI.create();
    } catch {
      zaiInstance = new ZAI(ZAI_CONFIG);
    }
  }
  return zaiInstance;
}

// Health check
app.get('/health', (c) => c.json({ status: 'ok', engine: 'z.ai-proxy' }));

// Main chat completions endpoint — OpenAI-compatible format
app.post('/chat/completions', async (c) => {
  try {
    const body = await c.req.json();
    const { model, messages, temperature, max_tokens } = body as {
      model?: string;
      messages: Array<{ role: string; content: string }>;
      temperature?: number;
      max_tokens?: number;
    };

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return c.json({ error: 'messages array is required' }, 400);
    }

    const zai = await getZAI();
    const completion = await zai.chat.completions.create({
      model: model || 'gemini-2.5-flash',
      messages: messages.map((m) => ({
        role: m.role as 'user' | 'assistant' | 'system',
        content: m.content,
      })),
      temperature: temperature ?? 0.7,
      max_tokens: max_tokens ?? 8192,
    });

    const content = completion.choices[0]?.message?.content || '';
    return c.json({
      id: `proxy-${Date.now()}`,
      object: 'chat.completion',
      choices: [{
        index: 0,
        message: { role: 'assistant', content },
        finish_reason: 'stop',
      }],
      usage: {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: content.length,
      },
    });
  } catch (error: any) {
    console.error('[ai-proxy] Error:', error?.message?.substring(0, 200));
    return c.json({ error: error?.message || 'Internal server error' }, 500);
  }
});

const PORT = 3002;
console.log(`[ai-proxy] Starting on port ${PORT}...`);
export default app;

// Auto-start when run directly (not imported)
if (typeof Bun !== 'undefined') {
  Bun.serve({
    port: PORT,
    fetch: app.fetch,
  });
  console.log(`[ai-proxy] ✅ Ready on http://localhost:${PORT}`);
}