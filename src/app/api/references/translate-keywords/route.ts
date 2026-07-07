import { generateWithEngine, DEFAULT_ENGINE } from '@/lib/ai-engine';
import type { AIEngineId } from '@/lib/ai-engine';

// ---------------------------------------------------------------------------
// System Prompt
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are an expert academic multilingual query translator. Translate the following research keywords AND research title into 5 major research languages and generate equivalent academic search terms for each language.

The 5 target languages are the world's top research nations:
1. English (en) — International academic standard, most Scopus Q1 journals
2. Chinese/Mandarin (zh) — China, #1 Scopus-indexed research output globally
3. Spanish (es) — Spain, Latin America, rapidly growing Scopus Q1-Q4 presence
4. German (de) — Germany, top 3 global research output, strong Q1 presence
5. French (fr) — France, major research nation, extensive academic publishing

CRITICAL INSTRUCTIONS:
- For each language, translate BOTH the keywords AND the research title
- Provide 2-3 equivalent academic terms per keyword per language (synonyms researchers in that language use)
- Include domain-specific abbreviations used in that language's research
- Title translations should be natural academic phrasing, not literal word-for-word
- Keywords should use standard terminology from that language's academic literature

Return structured JSON:
{
  "languages": {
    "en": {
      "name": "English",
      "keywordQueries": ["keyword1 AND keyword2", "alternative terms...", "synonym AND keyword2"],
      "titleTranslation": "Natural English academic title variant"
    },
    "zh": {
      "name": "Chinese",
      "keywordQueries": ["翻译词1 AND 翻译词2", "学术同义词1 OR 翻译词2", ...],
      "titleTranslation": "自然中文学术标题翻译"
    },
    "es": {
      "name": "Spanish",
      "keywordQueries": ["traducción1 AND traducción2", "término académico1 OR traducción2", ...],
      "titleTranslation": "Traducción natural del título académico en español"
    },
    "de": {
      "name": "German",
      "keywordQueries": ["Übersetzung1 AND Übersetzung2", "akademischer Begriff1 OR Übersetzung2", ...],
      "titleTranslation": "Natürliche deutsche akademische Titelübersetzung"
    },
    "fr": {
      "name": "French",
      "keywordQueries": ["traduction1 AND traduction2", "terme académique1 OR traduction2", ...],
      "titleTranslation": "Traduction naturelle du titre académique en français"
    }
  },
  "booleanSuggestions": {
    "and": "keyword1 AND keyword2 AND keyword3",
    "or": "keyword1 OR keyword2 OR keyword3",
    "combined": "(keyword1 OR synonym1) AND (keyword2 OR synonym2)"
  }
}

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
// POST: Translate keywords synchronously (Vercel-compatible, no in-memory jobs)
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { keywords, title = '', engineId = DEFAULT_ENGINE } = body as {
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

    const researchTitle = typeof title === 'string' ? title.trim() : '';

    console.log(`[translate-keywords] Starting: ${validKeywords.length} keywords, title="${researchTitle.slice(0, 60)}"`);

    const userPrompt = `Research Title: ${researchTitle}\n\nKeywords to translate:\n${validKeywords.map((k, i) => `${i + 1}. ${k}`).join('\n')}\n\nTranslate the research title and all keywords into the 5 target languages (English, Chinese, Spanish, German, French). Generate equivalent academic search terms with Boolean operators for each language.`;

    const rawResult = (await generateWithEngine(engineId, SYSTEM_PROMPT, userPrompt, {
      temperature: 0.2,
      maxTokens: 8192,
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
      console.warn('[translate-keywords] AI unavailable, returning fallback');
      return Response.json({
        success: true,
        languages: {
          en: { name: 'English', keywordQueries: validKeywords.map(k => k).join(' AND '), titleTranslation: researchTitle || 'Untitled' },
          zh: { name: 'Chinese', keywordQueries: validKeywords.map(k => k).join(' AND '), titleTranslation: researchTitle || 'Untitled' },
          es: { name: 'Spanish', keywordQueries: validKeywords.map(k => k).join(' AND '), titleTranslation: researchTitle || 'Untitled' },
          de: { name: 'German', keywordQueries: validKeywords.map(k => k).join(' AND '), titleTranslation: researchTitle || 'Untitled' },
          fr: { name: 'French', keywordQueries: validKeywords.map(k => k).join(' AND '), titleTranslation: researchTitle || 'Untitled' },
        },
      });
    }

    const parsed = extractJson(rawResult);

    if (!parsed) {
      console.error(`[translate-keywords] JSON parse failed. Raw: ${rawResult.slice(0, 500)}`);
      return Response.json({
        success: false,
        error: 'Failed to parse translation response as JSON',
      }, { status: 500 });
    }

    // Validate minimum structure
    if (!parsed.languages || typeof parsed.languages !== 'object') {
      return Response.json({
        success: false,
        error: 'Translation response missing required "languages" object',
      }, { status: 500 });
    }

    console.log(`[translate-keywords] Complete: ${Object.keys(parsed.languages as object).length} languages`);

    return Response.json({
      success: true,
      ...parsed,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('[translate-keywords] POST error:', error);
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