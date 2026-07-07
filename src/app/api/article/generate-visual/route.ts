import { generateWithEngine, type AIEngineId } from '@/lib/ai-engine';

// ─── Types ─────────────────────────────────────────────────────────────────────

type VisualType = 'figure' | 'table';

// ─── In-Memory Job Store ───────────────────────────────────────────────────────

interface VisualJob {
  id: string;
  status: 'running' | 'done' | 'error';
  statusMessage: string;
  result?: {
    success: boolean;
    type: VisualType;
    data: string;
    description: string;
  };
  error?: string;
  createdAt: number;
}

const jobs = new Map<string, VisualJob>();

// Cleanup old jobs every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [id, job] of jobs) {
    if (now - job.createdAt > 30 * 60_000) jobs.delete(id);
  }
  if (jobs.size > 50) {
    const ids = [...jobs.keys()].sort((a, b) => (jobs.get(a)?.createdAt ?? 0) - (jobs.get(b)?.createdAt ?? 0));
    for (let i = 0; i < ids.length - 30; i++) jobs.delete(ids[i]);
  }
}, 600_000);

// ─── Background Worker ─────────────────────────────────────────────────────────

function runVisualJob(
  jobId: string,
  type: VisualType,
  description: string,
  context?: string,
  articleTitle?: string,
  engineId?: AIEngineId,
) {
  const job = jobs.get(jobId)!;

  (async () => {
    try {
      if (type === 'figure') {
        job.statusMessage = 'Generating figure image...';
        const ZAI = (await import('z-ai-web-dev-sdk')).default;
        const zai = await ZAI.create();

        const prompt = `Academic research figure for a scholarly publication titled "${articleTitle || 'Research'}": ${description}. Professional scientific diagram style, clean vector-like illustration, high contrast, publication-ready quality, white background, precise labels, academic journal standard, crisp and detailed`;
        console.log(`[visual-gen] Figure prompt: ${prompt.substring(0, 200)}...`);

        const isFlowDiagram = /flow|diagram|process/i.test(description);
        const size = isFlowDiagram ? '1152x864' : '1344x768';

        const response = await zai.images.generations.create({ prompt, size });
        const imageBase64 = response.data?.[0]?.base64;

        if (!imageBase64) {
          job.status = 'error';
          job.error = 'Image generation returned no data';
          return;
        }

        console.log(`[visual-gen] Job ${jobId} figure generated: ${imageBase64.length} chars base64`);
        job.status = 'done';
        job.result = { success: true, type: 'figure', data: imageBase64, description };
      } else {
        job.statusMessage = 'Generating table...';
        const systemPrompt = `You are an expert academic data table generator. You generate ONLY markdown tables — no explanations, no preamble, no code blocks. Just the raw markdown table followed by a brief caption.

RULES:
- Generate a professional academic table with realistic but clearly labeled data
- Use markdown pipe syntax: | Header1 | Header2 |
- Include a caption below the table: **Table X:** Caption text
- If the description includes column names, use them exactly
- Data should be plausible and aligned with the research context
- Keep the table concise (5-15 rows max) but information-rich
- Use "—" for missing data`;

        const userPrompt = `Generate an academic table for this research paper:

**Article Title:** ${articleTitle || 'Academic Research Paper'}

**Table Description:** ${description}

${context ? `**Context from the paper:** ${context.substring(0, 1000)}` : ''}

Generate the markdown table now. Output ONLY the table and caption, nothing else.`;

        const result = await generateWithEngine(engineId || 'zai', systemPrompt, userPrompt, {
          temperature: 0.3,
          maxTokens: 4096,
        });

        if (!result || result.trim().length < 50) {
          job.status = 'error';
          job.error = 'Table generation returned insufficient content';
          return;
        }

        let cleaned = result.trim();
        cleaned = cleaned.replace(/^```(?:markdown|md)?\s*\n?/i, '');
        cleaned = cleaned.replace(/\n?```\s*$/i, '');
        console.log(`[visual-gen] Job ${jobId} table generated: ${cleaned.length} chars`);
        job.status = 'done';
        job.result = { success: true, type: 'table', data: cleaned, description };
      }
    } catch (error: any) {
      console.error(`[visual-gen] Job ${jobId} error:`, error);
      job.status = 'error';
      job.error = `${type === 'figure' ? 'Figure' : 'Table'} generation failed: ${error?.message}`;
    }
  })();
}

// ─── POST: Start visual generation job ────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      type,
      description,
      context,
      articleTitle,
      engineId = 'zai',
    } = body as {
      type: VisualType;
      description: string;
      context?: string;
      articleTitle?: string;
      engineId?: AIEngineId;
    };

    if (!type || !description) {
      return Response.json(
        { success: false, error: 'Missing required fields: type, description' },
        { status: 400 }
      );
    }

    const jobId = `vjob_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const job: VisualJob = {
      id: jobId,
      status: 'running',
      statusMessage: `Starting ${type} generation...`,
      createdAt: Date.now(),
    };
    jobs.set(jobId, job);

    console.log(`[visual-gen] Job ${jobId} started: ${type} "${description.substring(0, 80)}..."`);

    // Fire-and-forget
    runVisualJob(jobId, type, description, context, articleTitle, engineId);

    return Response.json({ success: true, jobId });
  } catch (error: any) {
    console.error('[visual-gen] POST error:', error);
    return Response.json(
      { success: false, error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// ─── GET: Poll job status ─────────────────────────────────────────────────────

export async function GET(request: Request) {
  const url = new URL(request.url);
  const jobId = url.searchParams.get('jobId');

  if (!jobId) {
    return Response.json(
      { success: false, error: 'Missing jobId query parameter' },
      { status: 400 }
    );
  }

  const job = jobs.get(jobId);
  if (!job) {
    return Response.json(
      { success: false, error: 'Job not found or expired' },
      { status: 404 }
    );
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