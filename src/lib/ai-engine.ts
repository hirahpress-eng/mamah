/**
 * Multi-Engine AI Abstraction Layer for Mamah
 *
 * Provides a unified chat completion interface across 4 AI engines:
 *   1. Z.ai (z-ai-web-dev-sdk) — default on z.ai (dev), built-in
 *   2. Gemini 2.5 Flash (Google Generative AI) — default on Vercel (production)
 *   3. Groq (llama-3.3-70b-versatile) — fast inference via Groq.com API
 *   4. Cloudflare (Llama 3.1 70B) — open-source model via CF Workers AI
 *
 * IMPORTANT: This file imports z-ai-web-dev-sdk and MUST ONLY be used
 * from server-side code (API routes). Client components should import
 * types/config from ai-engine-config.ts instead.
 *
 * PRODUCTION (Vercel) BEHAVIOUR:
 *   - All SDK fallbacks are DISABLED (internal-api.z.ai is unreachable from Vercel)
 *   - Only direct public API calls are used (Gemini, Groq, Cloudflare)
 *   - Default engine: gemini (requires GEMINI_API_KEY)
 *
 * DEVELOPMENT (z.ai) BEHAVIOUR:
 *   - Z.ai SDK is used as default (fast internal API)
 *   - Direct API calls tried first, SDK as fallback
 *
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

// On Vercel (production): SDK calls to internal-api.z.ai time out.
// Only use direct public APIs on production.
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

export const DEFAULT_ENGINE: AIEngineId = IS_PRODUCTION ? 'gemini' : 'zai';

/** Fallback order when the selected engine fails.
 *  On Vercel (production): gemini only (only engine with valid API key).
 *  On z.ai (development): zai first (internal API fast), then gemini, grok, cloudflare.
 */
const FALLBACK_ORDER: AIEngineId[] = IS_PRODUCTION
  ? ['gemini']
  : ['zai', 'gemini', 'grok', 'cloudflare'];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a fetch with an AbortController timeout (default 45s) */
function fetchWithTimeout(
  url: string,
  options: RequestInit & { timeoutMs?: number },
): Promise<Response> {
  const { timeoutMs = 45000, ...fetchOptions } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...fetchOptions, signal: controller.signal }).finally(() =>
    clearTimeout(timer),
  );
}

/** Extract retry-after seconds from Gemini error messages */
function parseGeminiRetrySeconds(errorMessage: string): number {
  const match = errorMessage.match(/retry in ([\d.]+)s/);
  if (match) {
    const seconds = parseFloat(match[1]);
    if (seconds > 0 && seconds < 120) return Math.ceil(seconds) + 2;
  }
  return 0;
}

// ---------------------------------------------------------------------------
// Per-engine execution helpers
// ---------------------------------------------------------------------------

// Cache ZAI instance to avoid repeated SDK initialization (dev only)
let cachedZAI: InstanceType<typeof ZAI> | null = null;

// Default config — same values used by the z.ai platform
const DEFAULT_ZAI_CONFIG = {
  baseUrl: process.env.ZAI_BASE_URL || 'https://internal-api.z.ai/v1',
  apiKey: process.env.ZAI_API_KEY || 'Z.ai',
  chatId: process.env.ZAI_CHAT_ID || '',
  userId: process.env.ZAI_USER_ID || '',
  token: process.env.ZAI_TOKEN || '',
};

async function getZAI() {
  if (!cachedZAI) {
    if (process.env.Z_AI_CONFIG) {
      try {
        const envConfig = JSON.parse(process.env.Z_AI_CONFIG);
        cachedZAI = new ZAI(envConfig);
      } catch {
        cachedZAI = await ZAI.create();
      }
    } else {
      try {
        cachedZAI = await ZAI.create();
      } catch {
        cachedZAI = new ZAI(DEFAULT_ZAI_CONFIG);
      }
    }
  }
  return cachedZAI;
}

// ─── Z.ai Engine ────────────────────────────────────────────────────────

async function executeZAI(
  messages: ChatMessage[],
  options?: { temperature?: number; maxTokens?: number },
): Promise<string> {
  // On production: Z.ai SDK calls internal-api.z.ai which is unreachable.
  // Fail immediately instead of hanging for 30s+.
  if (IS_PRODUCTION) {
    throw new Error('Z.ai SDK unavailable on production (internal API unreachable)');
  }

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

// ─── Gemini Engine ──────────────────────────────────────────────────────

async function executeGemini(
  messages: ChatMessage[],
  options?: { temperature?: number; maxTokens?: number },
): Promise<string> {
  if (!process.env.GEMINI_API_KEY) {
    if (IS_PRODUCTION) {
      throw new Error('GEMINI_API_KEY not configured');
    }
    // Dev fallback: try via SDK
    try {
      const zai = await getZAI();
      if (!zai) throw new Error('Gemini SDK init failed');
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
    } catch (sdkErr: any) {
      throw new Error('Gemini tidak tersedia: konfigurasi API tidak ditemukan');
    }
  }

  // Direct Google Generative AI API
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
  throw new Error('Gemini returned empty response');
}

// ─── Groq Engine ────────────────────────────────────────────────────────

async function executeGrok(
  messages: ChatMessage[],
  options?: { temperature?: number; maxTokens?: number },
): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (apiKey) {
    const baseUrl = process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1';
    const response = await fetchWithTimeout(`${baseUrl}/chat/completions`, {
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
      timeoutMs: 30000,
    });

    if (response.ok) {
      const data = await response.json();
      if (data.choices?.[0]?.message?.content) return data.choices[0].message.content;
      throw new Error('Groq returned empty content');
    }
    const errText = await response.text().catch(() => '');
    throw new Error(`Groq API ${response.status}: ${errText.substring(0, 200)}`);
  }

  // No GROQ_API_KEY
  if (IS_PRODUCTION) {
    throw new Error('GROQ_API_KEY not configured');
  }
  // Dev fallback: try via SDK
  try {
    const zai = await getZAI();
    if (!zai) throw new Error('Groq SDK init failed');
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
  } catch (sdkErr: any) {
    throw new Error(`Groq: no API key and SDK failed: ${sdkErr?.message?.substring(0, 100)}`);
  }
}

// ─── Cloudflare Engine ──────────────────────────────────────────────────

async function executeCloudflare(
  messages: ChatMessage[],
  options?: { temperature?: number; maxTokens?: number },
): Promise<string> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;

  if (accountId && apiToken) {
    const model = process.env.CLOUDFLARE_AI_MODEL || '@cf/meta/llama-3.1-8b-instruct';
    const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`;

    const response = await fetchWithTimeout(url, {
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
      timeoutMs: 30000,
    });

    if (response.ok) {
      const data = await response.json();
      if (data.result?.response) return data.result.response;
      throw new Error('Cloudflare returned empty response');
    }
    const errText = await response.text().catch(() => '');
    throw new Error(`Cloudflare API ${response.status}: ${errText.substring(0, 200)}`);
  }

  // No CF env vars
  if (IS_PRODUCTION) {
    throw new Error('CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_API_TOKEN not configured');
  }
  // Dev fallback: try via SDK with Llama model
  try {
    const zai = await getZAI();
    if (!zai) throw new Error('Cloudflare SDK init failed');
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
  } catch (sdkErr: any) {
    throw new Error(`Cloudflare: no API keys and SDK failed: ${sdkErr?.message?.substring(0, 100)}`);
  }
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
 * engines in the configured fallback order.
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
        break;
      } catch (error: any) {
        const msg = error?.message || '';

        // Check for rate limiting (429)
        if (msg.includes('429') || msg.includes('Too Many Requests') || msg.includes('rate limit') || msg.includes('rate-limit')) {
          consecutive429++;

          let backoffMs: number;
          const geminiRetry = parseGeminiRetrySeconds(msg);

          if (geminiRetry > 0) {
            backoffMs = geminiRetry * 1000;
          } else {
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

  if (IS_PRODUCTION) {
    return 'Maaf, mesin AI sedang tidak tersedia. Pastikan GEMINI_API_KEY sudah dikonfigurasi di Environment Variables Vercel. Silakan coba lagi dalam beberapa menit.';
  }
  return 'Semua mesin AI sedang tidak tersedia. Silakan coba lagi nanti.';
}

/**
 * Convenience wrapper for article generation.
 *
 * Constructs a system + user message pair and delegates to `chatCompletion`.
 */
export const UNAVAILABLE_PATTERNS = [
  /all ai engines are currently unavailable/i,
  /engines are currently unavailable/i,
  /api key not valid/i,
  /try again later/i,
];

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