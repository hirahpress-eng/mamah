import { generateWithEngine, DEFAULT_ENGINE } from '@/lib/ai-engine';
import type { AIEngineId } from '@/lib/ai-engine';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ReferenceInput {
  title: string;
  abstract?: string;
  year: string | number;
  authors: string;
}

// ---------------------------------------------------------------------------
// System Prompt
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are a senior academic theorist with expertise in identifying theoretical frameworks across all disciplines. Analyze the following set of academic references and identify the theoretical landscape.

For EACH reference, identify if it contributes to:
1. **Grand Theory** (also called macro theory, foundational theory) — Broad, abstract theories that explain wide-ranging phenomena (e.g., Constructivism, Positivism, Critical Theory, Systems Theory, Grounded Theory)
2. **Middle-Range Theory** — Theories that bridge grand theories and empirical research, more specific in scope (e.g., Technology Acceptance Model, Self-Determination Theory, Social Cognitive Theory)
3. **Applied Theory / Framework** — Specific models or frameworks applied to particular contexts or domains

Return structured JSON:
{
  "grandTheories": [
    { "name": "Theory Name", "description": "Brief description", "sourceReferences": ["Author (Year)", ...], "frequency": 5 }
  ],
  "middleRangeTheories": [
    { "name": "Theory Name", "description": "Brief description", "sourceReferences": ["Author (Year)", ...], "frequency": 3 }
  ],
  "appliedTheories": [
    { "name": "Framework/Model Name", "description": "Brief description", "sourceReferences": ["Author (Year)", ...], "frequency": 2 }
  ],
  "theoreticalGaps": [
    "Gap 1 description",
    "Gap 2 description"
  ],
  "dominantParadigm": "e.g., Interpretivism, Positivism, Pragmatism",
  "theoreticalMaturity": "Emerging / Developing / Mature / Well-Established",
  "recommendation": "Brief recommendation for theoretical framework selection"
}

Return ONLY valid JSON. No markdown fences. Be thorough and specific. Every theory identified must be grounded in the actual references provided.`;

// ---------------------------------------------------------------------------
// Robust JSON extraction
// ---------------------------------------------------------------------------

function extractJson(raw: string): Record<string, unknown> | null {
  // Try direct parse first
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // Fall through
  }

  // Strip markdown code fences if present
  const cleaned = raw.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
  try {
    const parsed = JSON.parse(cleaned);
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // Fall through
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

  return null;
}

// ---------------------------------------------------------------------------
// Build formatted reference list for prompt
// ---------------------------------------------------------------------------

function buildReferencesText(references: ReferenceInput[]): string {
  return references
    .map((ref, i) => {
      const parts = [
        `${i + 1}. Title: ${ref.title}`,
        `   Authors: ${ref.authors}`,
        `   Year: ${ref.year}`,
      ];
      if (ref.abstract && ref.abstract.trim().length > 0) {
        parts.push(`   Abstract: ${ref.abstract.trim()}`);
      }
      return parts.join('\n');
    })
    .join('\n\n');
}

// ---------------------------------------------------------------------------
// POST: Detect theories (synchronous)
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { references, engineId = DEFAULT_ENGINE } = body as {
      references?: ReferenceInput[];
      engineId?: AIEngineId;
    };

    if (!references || !Array.isArray(references) || references.length === 0) {
      return Response.json(
        { success: false, error: 'References array is required' },
        { status: 400 },
      );
    }

    if (references.length < 5) {
      return Response.json(
        { success: false, error: 'At least 5 references are required for theory detection' },
        { status: 400 },
      );
    }

    // Validate each reference has at least a title and authors
    const validReferences = references.filter(
      (ref) =>
        typeof ref.title === 'string' &&
        ref.title.trim().length > 0 &&
        typeof ref.authors === 'string' &&
        ref.authors.trim().length > 0,
    );

    if (validReferences.length < 5) {
      return Response.json(
        { success: false, error: 'At least 5 references with valid title and authors are required' },
        { status: 400 },
      );
    }

    console.log(`[detect-theories] Starting synchronous analysis: ${validReferences.length} references`);

    const referencesText = buildReferencesText(validReferences);

    const userPrompt = `Analyze the following ${references.length} academic references and identify the theoretical landscape:\n\n${referencesText}`;

    const rawResult = (await generateWithEngine(engineId, SYSTEM_PROMPT, userPrompt, {
      temperature: 0.3,
      maxTokens: 16000,
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
      console.warn('[detect-theories] AI unavailable, returning empty result');
      return Response.json({
        success: false,
        error: isUnavailable ? 'AI engines are currently unavailable. Please try again later.' : 'AI engine returned empty response',
      }, { status: 503 });
    }

    const parsed = extractJson(rawResult);

    if (!parsed) {
      console.error(`[detect-theories] JSON parse failed. Raw: ${rawResult.slice(0, 500)}`);
      return Response.json(
        { success: false, error: 'Failed to parse theory detection response as JSON' },
        { status: 500 },
      );
    }

    // Validate minimum structure
    const hasTheories =
      (Array.isArray(parsed.grandTheories) && parsed.grandTheories.length > 0) ||
      (Array.isArray(parsed.middleRangeTheories) && parsed.middleRangeTheories.length > 0) ||
      (Array.isArray(parsed.appliedTheories) && parsed.appliedTheories.length > 0);

    if (!hasTheories && !parsed.dominantParadigm) {
      return Response.json(
        { success: false, error: 'Theory detection response missing required theory arrays and paradigm' },
        { status: 500 },
      );
    }

    const grandCount = Array.isArray(parsed.grandTheories) ? parsed.grandTheories.length : 0;
    const middleCount = Array.isArray(parsed.middleRangeTheories) ? parsed.middleRangeTheories.length : 0;
    const appliedCount = Array.isArray(parsed.appliedTheories) ? parsed.appliedTheories.length : 0;

    console.log(`[detect-theories] Complete: ${grandCount} grand, ${middleCount} middle-range, ${appliedCount} applied theories`);

    return Response.json({ success: true, ...parsed });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('[detect-theories] POST error:', error);
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