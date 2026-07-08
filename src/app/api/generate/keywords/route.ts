import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { generateWithEngine, DEFAULT_ENGINE, type AIEngineId } from '@/lib/ai-engine';
import { AI_ENGINES } from '@/lib/ai-engine-config';

export const maxDuration = 300;
export async function POST(request: NextRequest) {
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
    const { title, engineId: rawEngineId } = body as { title?: string; engineId?: string };
    const engineId: AIEngineId = AI_ENGINES.some((e) => e.id === rawEngineId) ? (rawEngineId as AIEngineId) : DEFAULT_ENGINE;

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'A valid title string is required' },
        { status: 400 },
      );
    }

    const systemPrompt = 'You are an expert academic research assistant specialised in keyword extraction and research taxonomy.';

    const userPrompt = `You are an expert academic research professor. Based on the following scientific article title, extract exactly 5 highly relevant academic keywords or key phrases. The keywords should represent the core research topics, theoretical frameworks, and methodological concepts.

IMPORTANT REQUIREMENTS:
- Keywords should be suitable for academic database indexing (Scopus, Web of Science)
- Use standardised academic terminology
- Each keyword should be 1-4 words
- Keywords should cover both thematic and methodological aspects

Title: "${title.trim()}"

Return ONLY a JSON array of exactly 5 strings, with no additional text, explanation, or formatting.
Example: ["keyword 1", "keyword 2", "keyword 3", "keyword 4", "keyword 5"]`;

    const result = await generateWithEngine(engineId, systemPrompt, userPrompt, {
      temperature: 0.7,
      maxTokens: 1024,
    });

    let keywords: string[];
    try {
      const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      keywords = JSON.parse(cleaned);
      if (!Array.isArray(keywords)) keywords = [keywords];
      keywords = keywords.slice(0, 5).map(String);
    } catch {
      keywords = result
        .split('\n')
        .map((line: string) => line.replace(/^[-*•]\s*/, '').replace(/^\d+[\.\)]\s*/, '').replace(/^["']|["']$/g, '').trim())
        .filter((line: string) => line.length > 2)
        .slice(0, 5);
    }

    if (keywords.length === 0) {
      keywords = title
        .split(/[\s:;\-,]+/)
        .filter((w) => w.length > 4)
        .slice(0, 5);
    }

    return NextResponse.json({ success: true, keywords });
  } catch (error) {
    console.error('Error generating keywords:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate keywords. Please try again.' },
      { status: 500 },
    );
  }
}