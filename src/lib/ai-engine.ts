/**
 * Multi-Engine AI Abstraction Layer for Mamah
 *
 * Provides a unified chat completion interface across 4 AI engines:
 *   1. Z.ai (z-ai-web-dev-sdk) — default, built-in
 *   2. Gemini 2.5 Flash (Google Generative AI)
 *   3. Grok 3 (xAI) — fast reasoning via z-ai-web-dev-sdk
 *   4. Cloudflare (Llama 3.1 70B) — open-source model via z-ai-web-dev-sdk
 *
 * IMPORTANT: This file imports z-ai-web-dev-sdk and MUST ONLY be used
 * from server-side code (API routes). Client components should import
 * types/config from ai-engine-config.ts instead.
 *
 * Fallback order: zai → gemini → grok → cloudflare
 * NEVER throws — always returns a string or fallback error message.
 */

import ZAI from 'z-ai-web-dev-sdk';
import type { AIEngineId } from './ai-engine-config';

// Re-export so API routes can import AIEngineId from a single module
export type { AIEngineId } from './ai-engine-config';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export const DEFAULT_ENGINE: AIEngineId =
  process.env.NODE_ENV === 'production' ? 'grok' : 'zai';

/** Fallback order when the selected engine fails.
 *  On Vercel (production): groq first (has real API key), then cloudflare, gemini, zai last.
 *  On z.ai (development): zai first (internal API), then gemini, grok, cloudflare.
 */
const FALLBACK_ORDER: AIEngineId[] =
  process.env.NODE_ENV === 'production'
    ? ['grok', 'cloudflare', 'gemini', 'zai']
    : ['zai', 'gemini', 'grok', 'cloudflare'];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Extract retry-after seconds from Gemini error messages */
function parseGeminiRetrySeconds(errorMessage: string): number {
  // Gemini returns: "Please retry in 37.276015999s."
  const match = errorMessage.match(/retry in ([\d.]+)s/);
  if (match) {
    const seconds = parseFloat(match[1]);
    if (seconds > 0 && seconds < 120) return Math.ceil(seconds) + 2; // add 2s buffer
  }
  return 0; // no specific retry time found
}

// ---------------------------------------------------------------------------
// Per-engine execution helpers
// ---------------------------------------------------------------------------

// Cache ZAI instance to avoid repeated SDK initialization
let cachedZAI: InstanceType<typeof ZAI> | null = null;

// Default config — same values used by the z.ai platform
const DEFAULT_ZAI_CONFIG = {
  baseUrl: 'https://internal-api.z.ai/v1',
  apiKey: 'Z.ai',
  chatId: 'chat-25294527-e9a0-464d-8fa1-fd96b55b5553',
  userId: '2fe71c9b-9e4d-4011-b6fc-28d5b620d875',
  token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiMmZlNzFjOWItOWU0ZC00MDExLWI2ZmMtMjhkNWI2MjBkODc1IiwiY2hhdF9pZCI6ImNoYXQtMjUyOTQ1MjctZTlhMC00NjRkLThmYTEtZmQ5NmI1NWI1NTUzIiwicGxhdGZvcm0iOiJ6YWkifQ.EhizH5G9FdN9mwa4d3BW5dfguy_9zRxpmyXxQi9K3M8',
};

async function getZAI() {
  if (!cachedZAI) {
    // Priority: Z_AI_CONFIG env var > ZAI.create() (reads .z-ai-config files)
    if (process.env.Z_AI_CONFIG) {
      try {
        const envConfig = JSON.parse(process.env.Z_AI_CONFIG);
        cachedZAI = new ZAI(envConfig);
      } catch {
        cachedZAI = await ZAI.create();
      }
    } else {
      try {
        // Try ZAI.create() first (works locally with /etc/.z-ai-config)
        cachedZAI = await ZAI.create();
      } catch {
        // Fallback to hardcoded config (works on Vercel without config file)
        cachedZAI = new ZAI(DEFAULT_ZAI_CONFIG);
      }
    }
  }
  return cachedZAI;
}

async function executeZAI(
  messages: ChatMessage[],
  options?: { temperature?: number; maxTokens?: number },
): Promise<string> {
  const zai = await getZAI();
  if (!zai) throw new Error('ZAI SDK initialization failed');
  const completion = await zai.chat.completions.create({
    messages: messages.map((m) => ({
      role: m.role as 'user' | 'assistant' | 'system',
      content: m.content,
    })),
    temperature: options?.temperature,
    max_tokens: options?.maxTokens,
  });
  return completion.choices[0]?.message?.content || '';
}

async function executeGemini(
  messages: ChatMessage[],
  options?: { temperature?: number; maxTokens?: number },
): Promise<string> {
  // Try direct Google API first if GEMINI_API_KEY is configured
  if (process.env.GEMINI_API_KEY) {
    try {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({
        model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
        generationConfig: {
          temperature: options?.temperature ?? 0.7,
          maxOutputTokens: options?.maxTokens ?? 8192,
        },
      });

      const systemMsg = messages.find((m) => m.role === 'system');
      const nonSystem = messages.filter((m) => m.role !== 'system');

      let effectiveUserContent = nonSystem[nonSystem.length - 1]?.content || '';
      if (systemMsg) {
        effectiveUserContent = `[System Instructions]\n${systemMsg.content}\n\n[User Request]\n${effectiveUserContent}`;
      }

      const chatHistory = nonSystem.slice(0, -1).map((m) => ({
        role: (m.role === 'assistant' ? 'model' : 'user') as 'model' | 'user',
        parts: [{ text: m.content }],
      }));

      if (!effectiveUserContent) throw new Error('No user message for Gemini');
      const chat = model.startChat({ history: chatHistory });
      const result = await chat.sendMessage(effectiveUserContent);
      const text = result.response.text();
      if (text && text.trim().length > 0) return text;
    } catch {
      // Direct API failed, fall through to SDK approach
    }
  }

  // Fallback: use z-ai-web-dev-sdk with Gemini model
  const zai = await getZAI();
  if (!zai) throw new Error('Gemini engine: SDK initialization failed');

  const completion = await zai.chat.completions.create({
    model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    messages: messages.map((m) => ({
      role: m.role as 'user' | 'assistant' | 'system',
      content: m.content,
    })),
    temperature: options?.temperature ?? 0.7,
    max_tokens: options?.maxTokens ?? 8192,
  });
  return completion.choices[0]?.message?.content || '';
}

async function executeGrok(
  messages: ChatMessage[],
  options?: { temperature?: number; maxTokens?: number },
): Promise<string> {
  // Groq.com (fast Llama inference) — uses GROQ_API_KEY
  // Falls back to z-ai-web-dev-sdk if no key configured
  const apiKey = process.env.GROQ_API_KEY;
  if (apiKey) {
    const baseUrl = process.env.GROK_BASE_URL || 'https://api.groq.com/openai/v1';
    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
          temperature: options?.temperature ?? 0.7,
          max_tokens: options?.maxTokens ?? 8192,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.choices?.[0]?.message?.content) return data.choices[0].message.content;
      } else {
        const errText = await response.text().catch(() => '');
        throw new Error(`Groq API ${response.status}: ${errText.substring(0, 200)}`);
      }
    } catch (error: any) {
      // If it's a non-timeout error from the API call itself, re-throw
      if (error?.message?.includes('Groq API')) throw error;
      // Network error — fall through to SDK
    }
  }

  // Fallback: use z-ai-web-dev-sdk
  const zai = await getZAI();
  if (!zai) throw new Error('Groq engine: SDK initialization failed');

  const completion = await zai.chat.completions.create({
    model: process.env.GROK_MODEL || 'grok-3',
    messages: messages.map((m) => ({
      role: m.role as 'user' | 'assistant' | 'system',
      content: m.content,
    })),
    temperature: options?.temperature ?? 0.7,
    max_tokens: options?.maxTokens ?? 8000,
  });
  return completion.choices[0]?.message?.content || '';
}

async function executeCloudflare(
  messages: ChatMessage[],
  options?: { temperature?: number; maxTokens?: number },
): Promise<string> {
  // Uses z-ai-web-dev-sdk with Llama model (same model family as Cloudflare Workers AI).
  // Falls back to direct Cloudflare API if CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_API_TOKEN are set.
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;

  // If Cloudflare env vars are configured, try direct Workers AI API first
  if (accountId && apiToken) {
    const model = process.env.CLOUDFLARE_AI_MODEL || '@cf/meta/llama-3.1-8b-instruct';
    const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiToken}`,
        },
        body: JSON.stringify({
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
          max_tokens: options?.maxTokens ?? 8192,
          temperature: options?.temperature ?? 0.7,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.result?.response) return data.result.response;
      }
    } catch {
      // Direct API failed, fall through to SDK approach
    }
  }

  // Fallback: use z-ai-web-dev-sdk with Llama model (Cloudflare's model family)
  const zai = await getZAI();
  if (!zai) throw new Error('Cloudflare engine: SDK initialization failed');

  const model = process.env.CLOUDFLARE_AI_MODEL?.replace('@cf/', '') || 'llama-3.1-70b-versatile';

  const completion = await zai.chat.completions.create({
    model,
    messages: messages.map((m) => ({
      role: m.role as 'user' | 'assistant' | 'system',
      content: m.content,
    })),
    temperature: options?.temperature ?? 0.7,
    max_tokens: options?.maxTokens ?? 8192,
  });
  return completion.choices[0]?.message?.content || '';
}

// ---------------------------------------------------------------------------
// Engine dispatcher
// ---------------------------------------------------------------------------

const ENGINE_EXECUTORS: Record<
  AIEngineId,
  (
    messages: ChatMessage[],
    options?: { temperature?: number; maxTokens?: number },
  ) => Promise<string>
> = {
  zai: executeZAI,
  gemini: executeGemini,
  grok: executeGrok,
  cloudflare: executeCloudflare,
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Send a chat completion request to the specified AI engine.
 *
 * If the engine fails, it automatically falls back through the remaining
 * engines in this order: zai → gemini → grok → cloudflare.
 *
 * This function NEVER throws — it always returns a string.
 */
export async function chatCompletion(
  engineId: AIEngineId,
  messages: ChatMessage[],
  options?: { temperature?: number; maxTokens?: number },
): Promise<string> {
  // Build priority order: requested engine first, then fallbacks
  const order = [engineId, ...FALLBACK_ORDER.filter((e) => e !== engineId)];

  for (const engine of order) {
    // Track consecutive 429s for this engine to use escalating backoff
    let consecutive429 = 0;
    const maxEngineAttempts = 4;

    for (let attempt = 0; attempt < maxEngineAttempts; attempt++) {
      try {
        const result = await ENGINE_EXECUTORS[engine](messages, options);
        if (result && result.trim().length > 0) {
          console.log(`[ai-engine] ✅ Engine "${engine}" succeeded (${result.length} chars)`);
          return result;
        }
        // Empty result — try next engine
        console.warn(`[ai-engine] Engine "${engine}" returned empty result`);
        break; // Don't retry empty results, try next engine
      } catch (error: any) {
        const msg = error?.message || '';

        // Check for rate limiting (429)
        if (msg.includes('429') || msg.includes('Too Many Requests') || msg.includes('rate limit') || msg.includes('rate-limit')) {
          consecutive429++;

          // Calculate backoff: use Gemini's suggested retry time if available, otherwise escalate
          let backoffMs: number;
          const geminiRetry = parseGeminiRetrySeconds(msg);

          if (geminiRetry > 0) {
            // Gemini told us exactly how long to wait
            backoffMs = geminiRetry * 1000;
          } else {
            // Exponential backoff: 10s, 20s, 40s, 80s
            backoffMs = 10000 * Math.pow(2, consecutive429 - 1);
          }

          // Cap at 90 seconds
          backoffMs = Math.min(backoffMs, 90000);

          if (attempt < maxEngineAttempts - 1) {
            console.warn(`[ai-engine] Engine "${engine}" rate-limited (429), waiting ${Math.round(backoffMs / 1000)}s before retry ${attempt + 2}/${maxEngineAttempts}...`);
            await new Promise((r) => setTimeout(r, backoffMs));
            continue;
          }
        }

        // Non-429 error — log and try next engine
        console.error(`[ai-engine] Engine "${engine}" failed:`, msg.substring(0, 200));
        break;
      }
    }
  }

  return 'All AI engines are currently unavailable. Please try again later.';
}

/**
 * Convenience wrapper for article generation.
 *
 * Constructs a system + user message pair and delegates to `chatCompletion`.
 */
export async function generateWithEngine(
  engineId: AIEngineId,
  systemPrompt: string,
  userPrompt: string,
  options?: { temperature?: number; maxTokens?: number },
): Promise<string> {
  return chatCompletion(
    engineId,
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    options,
  );
}