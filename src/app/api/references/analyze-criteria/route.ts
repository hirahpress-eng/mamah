import { NextResponse } from 'next/server';
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { generateWithEngine, DEFAULT_ENGINE, UNAVAILABLE_PATTERNS } from '@/lib/ai-engine';
import type { AIEngineId } from '@/lib/ai-engine';
import { extractJson } from '@/lib/extract-json';

// ---------------------------------------------------------------------------
// System Prompt
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are an expert academic reference curator and research methodology specialist. Your task is to analyze a list of found academic references against a research title and determine which references should be INCLUDED (highly relevant) and which should be EXCLUDED (irrelevant/off-topic).

INCLUSION CRITERIA — A reference should be included if:
- Directly discusses the research topic or closely related sub-topics
- Uses the same or similar methodology
- Provides theoretical framework relevant to the research
- Published in reputable journals/conferences
- Provides empirical data or literature review relevant to the research question
- Cited by other relevant works (if known)
- Published within reasonable time range (last 10-15 years, unless seminal)

EXCLUSION CRITERIA — A reference should be excluded if:
- Off-topic (discusses unrelated subject matter)
- Only tangentially related (mentioning the keyword once in passing)
- Low-quality source (predatory journal, no peer review)
- Outdated without being seminal/classic work
- Duplicate or redundant with a better-quality included reference
- Language barrier that makes it unusable (if the research requires specific language sources)
- Wrong methodology entirely (e.g., qualitative vs quantitative mismatch where critical)
- Book chapter/thesis that duplicates published journal content

CRITICAL: Return structured JSON with:
- "include": array of SPECIFIC inclusion criteria phrases (e.g., "must discuss problem-based learning", "must involve mathematics education", "must be empirical study")
- "exclude": array of SPECIFIC exclusion criteria phrases (e.g., "exclude non-education research", "exclude studies before 2015 unless seminal", "exclude non-peer-reviewed sources")
- "reasoning": a brief 2-3 sentence explanation of your analysis

Return ONLY valid JSON. No markdown fences, no extra text.`;

// ---------------------------------------------------------------------------
// POST: Analyze criteria (synchronous)
// ---------------------------------------------------------------------------

export const maxDuration = 300;
export async function POST(request: Request) {
  // Rate limit check
  const { allowed, retryAfter } = rateLimit(request, RATE_LIMITS.generation);
  if (!allowed) {
    return NextResponse.json(
      { success: false, error: 'Terlalu banyak permintaan. Coba lagi dalam ' + retryAfter + ' detik.' },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } }
    );
  }
  try {
    const body = await request.json();
    const { title, keywords, references, engineId = DEFAULT_ENGINE } = body as {
      title?: string;
      keywords?: string[];
      references?: Array<{ id: string; title: string; abstract?: string; year?: number | string; journal?: string; source?: string }>;
      engineId?: AIEngineId;
    };

    if (!title || typeof title !== 'string') {
      return Response.json(
        { success: false, error: 'Research title is required' },
        { status: 400 },
      );
    }

    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      return Response.json(
        { success: false, error: 'Keywords array is required' },
        { status: 400 },
      );
    }

    if (!references || !Array.isArray(references) || references.length === 0) {
      return Response.json(
        { success: false, error: 'References array is required' },
        { status: 400 },
      );
    }

    console.log(`[analyze-criteria] Starting synchronous analysis: ${references.length} refs, title="${title.slice(0, 60)}"`);

    // Build a summary of the references for the AI
    const refSummaries = references.slice(0, 80).map((r, i) => {
      const parts = [`${i + 1}. "${r.title}"`];
      if (r.year) parts.push(`Year: ${r.year}`);
      if (r.journal) parts.push(`Journal: ${r.journal}`);
      if (r.source) parts.push(`Source: ${r.source}`);
      if (r.abstract) parts.push(`Abstract: ${r.abstract.slice(0, 200)}`);
      return parts.join(' | ');
    });

    const userPrompt = `RESEARCH TITLE: "${title}"

RESEARCH KEYWORDS: ${keywords.join(', ')}

FOUND REFERENCES (${references.length} total):
${refSummaries.join('\n\n')}

Based on the research title "${title}" and keywords, analyze these ${references.length} references. Generate specific INCLUSION and EXCLUSION criteria that would properly filter this list for maximum relevance to the research topic.

Return JSON with "include" (array of inclusion criteria), "exclude" (array of exclusion criteria), and "reasoning" (brief explanation).`;

    const rawResult = (await generateWithEngine(engineId, SYSTEM_PROMPT, userPrompt, {
      temperature: 0.2,
      maxTokens: 4096,
    })) || '';

    const isUnavailable = UNAVAILABLE_PATTERNS.some(p => p.test(rawResult));

    if (isUnavailable || !rawResult || rawResult.trim().length === 0) {
      console.warn('[analyze-criteria] AI unavailable, returning error');
      return Response.json({
        success: false,
        error: isUnavailable ? 'AI engines are currently unavailable. Please try again later.' : 'AI engine returned empty response',
      }, { status: 503 });
    }

    const parsed = extractJson(rawResult);

    if (!parsed) {
      console.error(`[analyze-criteria] JSON parse failed. Raw: ${rawResult.slice(0, 500)}`);
      return Response.json(
        { success: false, error: 'Failed to parse criteria response' },
        { status: 500 },
      );
    }

    const include = Array.isArray(parsed.include) ? (parsed.include as string[]).filter(Boolean) : [];
    const exclude = Array.isArray(parsed.exclude) ? (parsed.exclude as string[]).filter(Boolean) : [];
    const reasoning = typeof parsed.reasoning === 'string' ? parsed.reasoning : '';

    console.log(`[analyze-criteria] Complete: ${include.length} include, ${exclude.length} exclude criteria`);

    return Response.json({ success: true, include, exclude, reasoning });
  } catch (error: unknown) {
    const message = process.env.NODE_ENV === 'production' ? 'Terjadi kesalahan internal' : (error instanceof Error ? error.message : 'Internal server error');
    console.error('[analyze-criteria] POST error:', error);
    return Response.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// GET: Synchronous endpoint indicator
// ---------------------------------------------------------------------------

export async function GET() {
  return Response.json({ success: true, message: 'Synchronous endpoint. Use POST.' });
}