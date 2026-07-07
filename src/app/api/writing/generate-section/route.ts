import { generateWithEngine, type AIEngineId } from '@/lib/ai-engine';
import { formatBibliography } from '@/lib/bibliography-formatter';
import { countWords } from '@/lib/count-words';
import type { RealReference } from '@/lib/reference-search';
import type { Reference } from '@/lib/types';

export const maxDuration = 300;

// ─── Types ──────────────────────────────────────────────────────────────────

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatRefList(refs: Reference[], max = 30): string {
  const sorted = [...refs]
    .sort((a, b) => (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0))
    .slice(0, max);
  return sorted
    .map((r, i) => {
      const parts = [`[${i + 1}] ${r.authors} (${r.year}). ${r.title}`];
      if (r.journal) parts.push(`*${r.journal}*`);
      if (r.abstract && i < 15) parts.push(`Abstract: ${r.abstract.substring(0, 150)}`);
      return parts.join(', ');
    })
    .join('\n');
}

const FALLBACK_PATTERN = /all ai engines are currently unavailable/i;

async function generateWithRetry(
  engineId: AIEngineId,
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number,
): Promise<string> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    const result = (await generateWithEngine(engineId, systemPrompt, userPrompt, {
      temperature: 0.7,
      maxTokens,
    })) || '';

    if (result && !FALLBACK_PATTERN.test(result) && countWords(result) >= 20) {
      return result;
    }
    if (attempt < 3) {
      const delay = [12000, 25000][attempt - 1] || 50000;
      console.log(`[cicil-gen] Insufficient output, retrying in ${delay / 1000}s...`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  return '';
}

// ─── POST: Generate section synchronously ────────────────────────────────────

export async function POST(request: Request) {
  try {
    const body = await request.json();
    // Accept both 'stepLabel' and 'label' / 'chapterLabel' for flexibility
    const rawStepLabel = body.stepLabel || body.label || body.chapterLabel || 'Unknown';
    const rawEngineId = body.engineId || body.engine || 'zai';
    const {
      stepId,
      title,
      keywords,
      references,
      systemPrompt,
      promptFocus,
      targetWords = 1000,
      previousContent = '',
      isReferenceStep = false,
    } = body as {
      stepId: string;
      title: string;
      keywords: string[];
      references: Reference[];
      systemPrompt: string;
      promptFocus: string;
      targetWords?: number;
      previousContent?: string;
      isReferenceStep?: boolean;
    };

    if (!stepId || !title || !systemPrompt || !promptFocus) {
      return Response.json(
        { success: false, error: 'Missing required fields: stepId, title, systemPrompt, promptFocus' },
        { status: 400 },
      );
    }

    console.log(`[cicil-gen] Starting: ${rawStepLabel}`);

    // For reference steps, format bibliography instead of AI generation
    if (isReferenceStep) {
      try {
        const selectedRefs: RealReference[] = references
          .filter((r) => r.isSelected)
          .map((r) => ({
            id: r.id,
            title: r.title,
            authors: r.authors,
            year: String(r.year),
            abstract: r.abstract || '',
            doi: r.doi || '',
            journal: r.journal || '',
            volume: r.volume || '',
            issue: r.issue || '',
            pages: r.pages || '',
            source: r.source || 'Unknown',
            pdfUrl: r.pdfUrl || '',
            relevanceScore: r.relevanceScore ?? 0,
            refType: r.refType || 'Journal Article',
            isSelected: r.isSelected,
          }));
        const content = formatBibliography(selectedRefs);
        return Response.json({
          success: true,
          result: { content, wordCount: 0, stepId },
        });
      } catch (e) {
        console.warn('[cicil-gen] Bibliography format failed, falling back to AI');
      }
    }

    const refList = formatRefList(references);
    const prevCtx = previousContent
      ? `\n\n## PREVIOUSLY GENERATED CONTENT (for continuity)\n\n${previousContent.substring(0, 3000)}...\n`
      : '';

    const userPrompt = `## DOCUMENT CONTEXT
Title: "${title}"
Keywords: ${keywords.join(', ')}
Mode: ${rawStepLabel}
Target Words: ${targetWords} (MAXIMUM — do NOT exceed this limit)

## AVAILABLE REFERENCES (use ONLY these)
${refList}
${prevCtx}
## YOUR TASK
${promptFocus}

IMPORTANT: Write MAXIMUM ${targetWords} words. Be concise but comprehensive. Do NOT exceed the word limit.`;

    const maxTokens = Math.min(Math.round((targetWords || 1000) * 1.8), 16000);

    const content = await generateWithRetry(
      rawEngineId as AIEngineId,
      systemPrompt,
      userPrompt,
      maxTokens,
    );

    if (!content || content.trim().length === 0) {
      return Response.json(
        { success: false, error: `Failed to generate "${rawStepLabel}" after 3 attempts` },
        { status: 500 },
      );
    }

    const wordCount = countWords(content);

    console.log(`[cicil-gen] Done: ${rawStepLabel}, ${wordCount} words`);

    return Response.json({
      success: true,
      result: { content, wordCount, stepId },
    });
  } catch (error: any) {
    console.error('[cicil-gen] POST error:', error);
    return Response.json({ success: false, error: error?.message || 'Internal server error' }, { status: 500 });
  }
}
