/**
 * Multi-Engine AI Abstraction Layer for Mamah
 *
 * Provides a unified chat completion interface across 3 AI engines:
 *   1. Z.ai (z-ai-web-dev-sdk) — default, built-in
 *   2. Gemini 2.5 Flash (Google Generative AI)
 *   3. Grok (xAI) — OpenAI-compatible API
 *
 * IMPORTANT: This file imports z-ai-web-dev-sdk and MUST ONLY be used
 * from server-side code (API routes). Client components should import
 * types/config from ai-engine-config.ts instead.
 *
 * Fallback order: zai → gemini → grok
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

export const DEFAULT_ENGINE: AIEngineId = 'zai';

/** Fallback order when the selected engine fails */
const FALLBACK_ORDER: AIEngineId[] = ['zai', 'gemini', 'grok'];

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
let cachedZAI: Awaited<ReturnType<typeof ZAI.create>> | null = null;

async function getZAI() {
  if (!cachedZAI) {
    cachedZAI = await ZAI.create();
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
  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    generationConfig: {
      temperature: options?.temperature ?? 0.7,
      maxOutputTokens: options?.maxTokens ?? 8192,
    },
  });

  // Gemini systemInstruction is NOT supported with this API key (400 error even for short text).
  // ALWAYS merge system message into user message to avoid the error.
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

  if (!effectiveUserContent) throw new Error('No user message provided for Gemini');

  const chat = model.startChat({ history: chatHistory });
  const result = await chat.sendMessage(effectiveUserContent);
  return result.response.text();
}

async function executeGrok(
  messages: ChatMessage[],
  options?: { temperature?: number; maxTokens?: number },
): Promise<string> {
  const baseUrl = process.env.GROK_BASE_URL || 'https://api.x.ai/v1';

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.GROK_API_KEY}`,
    },
    body: JSON.stringify({
      model: process.env.GROK_MODEL || 'grok-3',
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 8000,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Grok API error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
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
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Send a chat completion request to the specified AI engine.
 *
 * If the engine fails, it automatically falls back through the remaining
 * engines in this order: zai → gemini → grok.
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