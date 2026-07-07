import { generateWithEngine } from '@/lib/ai-engine';
import type { AIEngineId } from '@/lib/ai-engine';

// ---------------------------------------------------------------------------
// System Prompt
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are an expert academic Boolean search query generator. Your job is to take research keywords and a research title, then generate the most effective Boolean search queries for academic databases (Scopus, Semantic Scholar, OpenAlex, etc.).

RULES:
1. Generate queries that maximize relevance and recall
2. Use standard Boolean operators: AND, OR, NOT, "", (), *
3. Include synonym expansion — researchers use different terms for the same concept
4. Generate title variants that rephrase the research title for broader matching
5. Expand keywords with related academic terms, abbreviations, and domain-specific synonyms

Return structured JSON:
{
  "booleanQueries": {
    "and": [
      "keyword1 AND keyword2 AND keyword3",
      "synonym1 AND synonym2 AND keyword3"
    ],
    "or": [
      "keyword1 OR synonym1 OR abbreviation1",
      "keyword2 OR related_term2 OR variant2"
    ],
    "combined": [
      "(keyword1 OR synonym1) AND (keyword2 OR synonym2) AND keyword3",
      "(\\"exact phrase 1\\" OR \\"exact phrase 2\\") AND keyword3",
      "keyword1 AND keyword2 NOT (excluded_term1 OR excluded_term2)"
    ]
  },
  "titleVariants": [
    "Rephrased title variant 1 for broader search",
    "Rephrased title variant 2",
    "Alternative phrasing of the research title"
  ],
  "expandedKeywords": [
    "additional_keyword_1",
    "additional_keyword_2",
    "abbreviation_or_acronym",
    "related_domain_term"
  ]
}

Generate 2-4 AND queries, 2-3 OR queries, 3-5 combined queries, 2-3 title variants, and 4-8 expanded keywords.
Return ONLY valid JSON. No markdown fences.`;

// ---------------------------------------------------------------------------
// Robust JSON extraction
// ---------------------------------------------------------------------------

function extractJson(raw: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // Fall through
  }

  const cleaned = raw.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
  try {
    const parsed = JSON.parse(cleaned);
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // Fall through
  }

  const match = raw.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      return JSON.parse(match[0]) as Record<string, unknown>;
    } catch {
      // Fall through
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// POST: Generate Boolean queries synchronously (Vercel-compatible)
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { keywords, title, engineId = 'zai' } = body as {
      keywords?: string[];
      title?: string;
      engineId?: AIEngineId;
    };

    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      return Response.json(
        { success: false, error: 'Keywords array is required' },
        { status: 400 },
      );
    }

    const validKeywords = keywords.filter((k) => typeof k === 'string' && k.trim().length > 0);
    if (validKeywords.length === 0) {
      return Response.json(
        { success: false, error: 'At least one non-empty keyword is required' },
        { status: 400 },
      );
    }

    const researchTitle = typeof title === 'string' ? title.trim() : 'Untitled Research';

    console.log(`[generate-boolean] Starting: ${validKeywords.length} keywords`);

    const userPrompt = `Research Title: ${researchTitle}\n\nKeywords:\n${validKeywords.map((k, i) => `${i + 1}. ${k}`).join('\n')}\n\nGenerate the most effective Boolean search queries for finding relevant academic references across multiple databases.`;

    const rawResult = (await generateWithEngine(engineId, SYSTEM_PROMPT, userPrompt, {
      temperature: 0.2,
      maxTokens: 4096,
    })) || '';

    // Detect AI engine fallback
    const UNAVAILABLE_PATTERNS = [
      /all ai engines are currently unavailable/i,
      /engines are currently unavailable/i,
      /api key not valid/i,
      /try again later/i,
    ];
    const isUnavailable = UNAVAILABLE_PATTERNS.some(p => p.test(rawResult));

    if (isUnavailable || !rawResult || rawResult.trim().length === 0) {
      console.warn('[generate-boolean] AI unavailable, returning fallback');
      const andQuery = validKeywords.join(' AND ');
      const orParts = validKeywords.flatMap(k => [k, k]);
      return Response.json({
        success: true,
        booleanQueries: {
          and: [andQuery],
          or: [orParts.join(' OR ')],
          combined: [andQuery],
        },
        titleVariants: [researchTitle],
        expandedKeywords: validKeywords,
      });
    }

    const parsed = extractJson(rawResult);

    if (!parsed) {
      console.error(`[generate-boolean] JSON parse failed. Raw: ${rawResult.slice(0, 500)}`);
      return Response.json({
        success: false,
        error: 'Failed to parse Boolean generation response as JSON',
      }, { status: 500 });
    }

    // Validate structure
    const bq = parsed.booleanQueries as Record<string, unknown> | undefined;
    if (!bq || typeof bq !== 'object') {
      return Response.json({
        success: false,
        error: 'Response missing booleanQueries object',
      }, { status: 500 });
    }

    console.log(`[generate-boolean] Complete`);

    return Response.json({
      success: true,
      ...parsed,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('[generate-boolean] POST error:', error);
    return Response.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// GET: No-op — synchronous mode, no polling needed
// ---------------------------------------------------------------------------

export async function GET() {
  return Response.json({
    success: true,
    message: 'This endpoint now works synchronously via POST. No polling needed.',
  });
}