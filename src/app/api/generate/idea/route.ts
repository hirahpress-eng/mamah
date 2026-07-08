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
    const { idea, engineId: rawEngineId } = body as { idea?: string; engineId?: string };
    const engineId: AIEngineId = AI_ENGINES.some((e) => e.id === rawEngineId) ? (rawEngineId as AIEngineId) : DEFAULT_ENGINE;

    if (!idea || typeof idea !== 'string' || idea.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'A valid idea string is required' },
        { status: 400 },
      );
    }

    const systemPrompt = 'You are an expert academic research assistant specialised in research ideation, gap analysis, and title formulation for high-impact publications.';

    const userPrompt = `Analyse this research idea and return JSON:
{"keywords": ["kw1","kw2","kw3","kw4","kw5"], "titles": ["T1","T2","T3","T4","T5"]}

Idea: "${idea.trim()}"

Return ONLY the JSON, nothing else.`;

    let result = '';
    try {
      result = await generateWithEngine(engineId, systemPrompt, userPrompt, {
        temperature: 0.7,
        maxTokens: 2048,
      });
    } catch {
      return NextResponse.json({
        success: false,
        isFallback: true,
        error: 'All AI engines are currently unavailable. Please try again later.',
        keywords: [],
        titles: [],
      }, { status: 503 });
    }

    if (!result || result.includes('All AI engines are currently unavailable')) {
      return NextResponse.json({
        success: false,
        isFallback: true,
        error: 'All AI engines are currently unavailable. Please try again later.',
        keywords: [],
        titles: [],
      }, { status: 503 });
    }

    let keywords: string[] = [];
    let titles: string[] = [];

    try {
      const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed.keywords)) keywords = parsed.keywords.slice(0, 5).map(String);
      if (Array.isArray(parsed.titles)) titles = parsed.titles.slice(0, 5).map(String);
    } catch {
      const lines = result.split('\n').map((l: string) => l.trim()).filter((l: string) => l.length > 0);
      keywords = lines.filter((l: string) => /^[-*•\d]/.test(l) || l.toLowerCase().includes('keyword'))
        .map((l: string) => l.replace(/^[-*•\d\.\)]+\s*/, '').replace(/^["']|["']$/g, '').trim())
        .filter((l: string) => l.length > 1).slice(0, 5);
      titles = lines.filter((l: string) => l.length > 15 && !l.toLowerCase().includes('keyword') && !l.toLowerCase().includes('title'))
        .map((l: string) => l.replace(/^[-*•\d\.\)]+\s*/, '').replace(/^["']|["']$/g, '').trim())
        .filter((l: string) => l.length > 10).slice(0, 5);
    }

    let isFallback = false;

    if (keywords.length === 0) { keywords = ['Research Methodology', 'Data Analysis', 'Systematic Review', 'Empirical Study', 'Literature Analysis']; isFallback = true; }
    if (titles.length === 0) { titles = ['A Comprehensive Investigation into Current Research Trends', 'Exploring Novel Approaches in the Field: A Systematic Review', 'Insights and Implications for Future Research Directions', 'Advancing the Understanding Through Integrated Analysis', 'Critical Examination of Methodologies and Outcomes']; isFallback = true; }

    return NextResponse.json({ success: true, keywords, titles, ...(isFallback ? { isFallback: true, warning: 'AI response could not be fully parsed. Results may not accurately reflect your idea.' } : {}) });
  } catch (error) {
    console.error('[generate/idea] Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to analyze idea' }, { status: 500 });
  }
}