/**
 * POST /api/bot/strategy
 * ─────────────────────
 * One-shot AI-powered search strategy generator.  Given a research topic,
 * returns an optimised set of keywords and search criteria to maximise
 * academic database coverage.
 *
 * Uses z-ai-web-dev-sdk for the LLM call (server-side only).
 */

import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import ZAI from 'z-ai-web-dev-sdk';

// ── Types ──────────────────────────────────────────────────────────────────────

interface StrategyCriteria {
  yearFrom: number;
  yearTo: number;
  openAccessOnly: boolean;
  minCitations: number;
  preferredJournals: string[];
  languages: string[];
}

interface StrategyResponse {
  success: boolean;
  keywords: string[];
  criteria: StrategyCriteria;
  error?: string;
}

// ── Robust JSON extraction ────────────────────────────────────────────────────

function extractJson(raw: string): Record<string, unknown> | null {
  // Try direct parse first
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // Fall through to extraction
  }

  // Try finding a JSON object in the text
  const match = raw.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      return JSON.parse(match[0]) as Record<string, unknown>;
    } catch {
      // Fall through
    }
  }

  // Try cleaning markdown fences
  const cleaned = raw
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim();
  try {
    return JSON.parse(cleaned) as Record<string, unknown>;
  } catch {
    // Fall through
  }

  return null;
}

function safeStringArray(value: unknown, fallback: string[]): string[] {
  if (Array.isArray(value)) {
    return value
      .filter((v) => typeof v === 'string' && v.trim().length > 0)
      .map((v) => (v as string).trim());
  }
  return fallback;
}

function safeNumber(value: unknown, fallback: number): number {
  if (typeof value === 'number' && isFinite(value)) return value;
  return fallback;
}

function safeBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') return value;
  return fallback;
}

// ── POST handler ──────────────────────────────────────────────────────────────

export const maxDuration = 300;
export async function POST(request: NextRequest) {
  // Rate limit check
  const { allowed, retryAfter } = rateLimit(request, RATE_LIMITS.search);
  if (!allowed) {
    return NextResponse.json(
      { success: false, error: 'Terlalu banyak permintaan. Coba lagi dalam ' + retryAfter + ' detik.' },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } }
    );
  }
  try {
    // ── Parse & validate ───────────────────────────────────────────────
    const body = (await request.json()) as { topic?: string };

    if (!body.topic || typeof body.topic !== 'string' || body.topic.trim().length === 0) {
      return Response.json(
        { success: false, error: 'A non-empty "topic" string is required' },
        { status: 400 },
      );
    }

    const topic = body.topic.trim();

    // ── Call LLM ───────────────────────────────────────────────────────
    const zai = await ZAI.create();

    const systemPrompt = `You are an expert academic research strategist with deep knowledge of information retrieval, bibliometrics, and academic database querying (Scopus, Web of Science, PubMed, Semantic Scholar, OpenAlex). You produce precise, actionable search strategies that maximise recall and precision.`;

    const userPrompt = `Given the following research topic, produce an optimal search strategy as a JSON object with exactly two fields:

1. "keywords" — An array of 8–12 search keywords and key phrases. Requirements:
   - Mix single words ("machine learning") with multi-word phrases ("transformer architecture")
   - Include broader terms, narrower terms, synonyms, and related concepts
   - Use standardised academic terminology
   - Order by expected search impact (most important first)

2. "criteria" — An object with these fields:
   - "yearFrom": Recommended start publication year (number, e.g. 2018)
   - "yearTo": Current year (number, e.g. ${new Date().getFullYear()})
   - "openAccessOnly": Whether open-access-only filtering is reasonable (boolean)
   - "minCitations": Minimum citation count threshold (number, 0–50)
   - "preferredJournals": Array of 3–5 relevant top-tier journal names, or empty array
   - "languages": Array of ISO 639-1 language codes, e.g. ["en"] or ["en","de","fr"]

Research topic: "${topic}"

Return ONLY a valid JSON object. No explanation, no markdown fencing, no extra text.`;

    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'assistant', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      thinking: { type: 'disabled' },
    });

    const raw = completion.choices[0]?.message?.content ?? '';
    const parsed = extractJson(raw);

    if (!parsed) {
      console.error('[API /bot/strategy] Failed to parse AI response:', raw.slice(0, 500));
      return Response.json(
        {
          success: false,
          error: 'Failed to generate a valid strategy. The AI response could not be parsed.',
        },
        { status: 500 },
      );
    }

    // ── Build response ─────────────────────────────────────────────────
    const currentYear = new Date().getFullYear();

    const keywords = safeStringArray(parsed.keywords, topic.split(/\s+/).slice(0, 8));
    const criteriaRaw = (parsed.criteria ?? {}) as Record<string, unknown>;

    const criteria: StrategyCriteria = {
      yearFrom: Math.max(1990, Math.min(safeNumber(criteriaRaw.yearFrom, currentYear - 10), currentYear)),
      yearTo: Math.max(2000, Math.min(safeNumber(criteriaRaw.yearTo, currentYear), currentYear + 1)),
      openAccessOnly: safeBoolean(criteriaRaw.openAccessOnly, false),
      minCitations: Math.max(0, Math.min(safeNumber(criteriaRaw.minCitations, 0), 200)),
      preferredJournals: safeStringArray(criteriaRaw.preferredJournals, []),
      languages: safeStringArray(criteriaRaw.languages, ['en']),
    };

    const response: StrategyResponse = {
      success: true,
      keywords,
      criteria,
    };

    console.log(
      `[API /bot/strategy] Generated ${keywords.length} keywords for topic: "${topic}"`,
    );

    return Response.json(response);
  } catch (error) {
    console.error('[API /bot/strategy] Error:', error);

    return Response.json(
      {
        success: false,
        error:
          process.env.NODE_ENV === 'production'
            ? 'Gagal membuat strategi pencarian. Silakan coba lagi.'
            : error instanceof Error
              ? error.message
              : 'Failed to generate search strategy. Please try again.',
      },
      { status: 500 },
    );
  }
}
