import { generateWithEngine, type AIEngineId } from '@/lib/ai-engine';
import { formatBibliography } from '@/lib/bibliography-formatter';
import type { RealReference } from '@/lib/reference-search';

// ─── Types ──────────────────────────────────────────────────────────────────

interface Reference {
  id: string;
  authors: string;
  title: string;
  year: number | string;
  journal?: string;
  doi?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  refType: string;
  isSelected: boolean;
  abstract?: string;
  keywords?: string[];
  relevanceScore?: number;
  source?: string;
  pdfUrl?: string;
  citation_count?: number;
}

interface GenerationJob {
  id: string;
  status: 'running' | 'done' | 'error';
  statusMessage: string;
  result?: {
    content: string;
    wordCount: number;
    stepId: string;
  };
  error?: string;
  createdAt: number;
}

// ─── In-Memory Job Store ───────────────────────────────────────────────────

const jobs = new Map<string, GenerationJob>();

// Cleanup old jobs every 10 minutes
setInterval(() => {
  const now = Date.now();
  const ids = [...jobs.keys()];
  if (ids.length > 50) {
    ids.sort((a, b) => (jobs.get(a)?.createdAt ?? 0) - (jobs.get(b)?.createdAt ?? 0));
    for (let i = 0; i < ids.length - 30; i++) jobs.delete(ids[i]);
  }
  for (const [id, job] of jobs) {
    if (now - job.createdAt > 30 * 60_000) jobs.delete(id);
  }
}, 600_000);

// ─── Helpers ────────────────────────────────────────────────────────────────

function countWords(text: string): number {
  return text.split(/\s+/).filter((w) => w.length > 0).length;
}

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
  onStatus?: (msg: string) => void,
): Promise<string> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    onStatus?.(`Attempt ${attempt}/3...`);
    const result = (await generateWithEngine(engineId, systemPrompt, userPrompt, {
      temperature: 0.7,
      maxTokens,
    })) || '';

    if (result && !FALLBACK_PATTERN.test(result) && countWords(result) >= 20) {
      return result;
    }
    if (attempt < 3) {
      const delay = [12000, 25000][attempt - 1] || 50000;
      onStatus?.(`Insufficient output, retrying in ${delay / 1000}s...`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  return '';
}

// ─── Background Worker ─────────────────────────────────────────────────────

function runJob(
  jobId: string,
  stepId: string,
  stepLabel: string,
  title: string,
  keywords: string[],
  references: Reference[],
  engineId: AIEngineId,
  systemPrompt: string,
  promptFocus: string,
  targetWords: number,
  previousContent: string,
  isReferenceStep: boolean,
) {
  const job = jobs.get(jobId)!;

  (async () => {
    try {
      job.statusMessage = `Preparing to generate: ${stepLabel}...`;

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
          job.status = 'done';
          job.result = { content, wordCount: 0, stepId };
          return;
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
Mode: ${stepLabel}
Target Words: ${targetWords} (MAXIMUM — do NOT exceed this limit)

## AVAILABLE REFERENCES (use ONLY these)
${refList}
${prevCtx}
## YOUR TASK
${promptFocus}

IMPORTANT: Write MAXIMUM ${targetWords} words. Be concise but comprehensive. Do NOT exceed the word limit.`;

      const maxTokens = Math.min(Math.round((targetWords || 1000) * 1.8), 16000);

      const content = await generateWithRetry(
        engineId,
        systemPrompt,
        userPrompt,
        maxTokens,
        (msg) => { job.statusMessage = msg; },
      );

      if (!content || content.trim().length === 0) {
        job.status = 'error';
        job.error = `Failed to generate "${stepLabel}" after 3 attempts`;
        return;
      }

      const wordCount = countWords(content);
      job.status = 'done';
      job.result = { content, wordCount, stepId };
    } catch (error: any) {
      console.error(`[cicil-gen] Job ${jobId} error:`, error);
      job.status = 'error';
      job.error = error?.message || 'Internal server error';
    }
  })();
}

// ─── POST: Start generation job ────────────────────────────────────────────

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

    const jobId = `cicil_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    jobs.set(jobId, {
      id: jobId,
      status: 'running',
      statusMessage: `Starting: ${rawStepLabel}...`,
      createdAt: Date.now(),
    });

    console.log(`[cicil-gen] Job ${jobId} started: ${rawStepLabel}`);

    runJob(jobId, stepId, rawStepLabel, title, keywords, references, rawEngineId as AIEngineId, systemPrompt, promptFocus, targetWords, previousContent, isReferenceStep);

    return Response.json({ success: true, jobId });
  } catch (error: any) {
    console.error('[cicil-gen] POST error:', error);
    return Response.json({ success: false, error: error?.message || 'Internal server error' }, { status: 500 });
  }
}

// ─── GET: Poll job status ─────────────────────────────────────────────────

export async function GET(request: Request) {
  const url = new URL(request.url);
  const jobId = url.searchParams.get('jobId');

  if (!jobId) {
    return Response.json({ success: false, error: 'Missing jobId' }, { status: 400 });
  }

  const job = jobs.get(jobId);
  if (!job) {
    return Response.json({ success: false, error: 'Job not found or expired' }, { status: 404 });
  }

  return Response.json({
    success: true,
    jobId: job.id,
    status: job.status,
    statusMessage: job.statusMessage,
    result: job.result,
    error: job.error,
  });
}