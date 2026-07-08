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
    const { keywords, engineId: rawEngineId } = body as { keywords?: string[]; engineId?: string };
    const engineId: AIEngineId = AI_ENGINES.some((e) => e.id === rawEngineId) ? (rawEngineId as AIEngineId) : DEFAULT_ENGINE;

    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Keywords array is required' },
        { status: 400 },
      );
    }

    const validKeywords = keywords.filter((k) => typeof k === 'string' && k.trim().length > 0);

    if (validKeywords.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one non-empty keyword is required' },
        { status: 400 },
      );
    }

    const systemPrompt = 'You are an expert academic research assistant specialised in identifying research gaps and formulating novel research titles that meet the highest international publication standards.';

    const userPrompt = `You are an expert academic research professor. Based on the following research keywords, generate exactly 5 professional, well-structured scientific article titles.

IMPORTANT REQUIREMENTS:
- Each title must reflect a clear research gap and novelty
- Titles should be suitable for high-impact peer-reviewed journals
- Use formal British English academic language
- Titles should be diverse in scope, methodology, and perspective
- Each title should be specific enough to indicate a clear research contribution

Keywords: ${validKeywords.join(', ')}

Return ONLY a JSON array of exactly 5 strings, with no additional text, explanation, or formatting.
Example: ["Title 1", "Title 2", "Title 3", "Title 4", "Title 5"]`;

    const result = await generateWithEngine(engineId, systemPrompt, userPrompt, {
      temperature: 0.7,
      maxTokens: 2048,
    });

    let titles: string[];
    try {
      const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      titles = JSON.parse(cleaned);
      if (!Array.isArray(titles)) titles = [titles];
      titles = titles.slice(0, 5).map(String);
    } catch {
      titles = result
        .split('\n')
        .map((line: string) => line.replace(/^\d+[\.\)]\s*/, '').replace(/^["']|["']$/g, '').trim())
        .filter((line: string) => line.length > 10)
        .slice(0, 5);
    }

    if (titles.length === 0) {
      titles = [
        `A Comprehensive Study of ${validKeywords[0]}: Trends and Future Directions`,
        `${validKeywords[0]} in Context: An Integrative Review`,
        `Exploring the Relationship Between ${validKeywords.join(' and ')}: A Systematic Approach`,
        `Advances in ${validKeywords[0]}: Implications for Research and Practice`,
        `The Role of ${validKeywords[0]} in Shaping ${validKeywords.length > 1 ? validKeywords[1] : 'Modern Practice'}: A Critical Analysis`,
      ];
    }

    return NextResponse.json({ success: true, titles });
  } catch (error) {
    console.error('Error generating titles:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate titles. Please try again.' },
      { status: 500 },
    );
  }
}