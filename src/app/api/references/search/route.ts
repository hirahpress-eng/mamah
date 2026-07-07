import { NextRequest, NextResponse } from 'next/server';
import { searchReferences, type RealReference, type SearchProgress, type SearchOptions } from '@/lib/reference-search';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface SearchRequestBody {
  title?: string;
  keywords: string[];
  yearStart?: number;
  yearEnd?: number;
  booleanMode?: 'OR' | 'AND';
  includeKeywords?: string[];
  excludeKeywords?: string[];
  referenceTypes?: string[];
  translatedQueries?: string[][];
  maxResults?: number;
}

interface SearchJob {
  id: string;
  status: 'running' | 'done' | 'error';
  statusMessage: string;
  progress: SearchProgress[];
  result?: {
    references: Array<{
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
      relevanceScore: number;
      source: string;
      pdfUrl?: string;
    }>;
    meta: Record<string, number>;
  };
  error?: string;
  createdAt: number;
}

// ─── In-Memory Job Store ───────────────────────────────────────────────────────

const jobs = new Map<string, SearchJob>();

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

async function runSearchJob(
  jobId: string,
  keywords: string[],
  yearStart: number,
  yearEnd: number,
  options?: SearchOptions,
) {
  const job = jobs.get(jobId)!;
  const t0 = Date.now();

  try {
    const tqCount = options?.translatedQueries?.length ?? 0;
    console.log(`[ref-search] Job ${jobId} started: ${keywords.length} keywords, ${tqCount} translated queries, types=${options?.referenceTypes?.length ?? 0}`);

    job.statusMessage = 'Searching across 11 academic databases...';

    const { references, meta } = await searchReferences(
      keywords,
      yearStart,
      yearEnd,
      (updatedProgress) => {
        job.progress = updatedProgress;
        const doneCount = updatedProgress.filter(p => p.status === 'done' || p.status === 'error').length;
        if (doneCount >= 11) {
          job.statusMessage = `Primary search done. Searching multi-language variants...`;
        } else {
          job.statusMessage = `Searching databases... (${doneCount}/11 complete)`;
        }
      },
      options,
    );

    // Convert RealReference[] to the store's Reference format
    const storeReferences = references.map((ref: RealReference) => ({
      id: ref.id,
      authors: ref.authors,
      title: ref.title,
      year: ref.year ? (parseInt(ref.year) || ref.year) : new Date().getFullYear(),
      journal: ref.journal || undefined,
      doi: ref.doi || undefined,
      volume: ref.volume || undefined,
      issue: ref.issue || undefined,
      pages: ref.pages || undefined,
      refType: ref.refType || 'Journal Article',
      isSelected: false,
      abstract: ref.abstract || undefined,
      keywords: (ref as any).keywords || [],
      relevanceScore: ref.relevanceScore,
      source: ref.source,
      pdfUrl: ref.pdfUrl || undefined,
    }));

    // Auto-select top 15 by relevance
    storeReferences.forEach((ref, i) => {
      if (i < 15) ref.isSelected = true;
    });

    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(`[ref-search] Job ${jobId} done in ${elapsed}s: ${storeReferences.length} refs (raw=${meta.totalRaw}, deduped=${meta.afterDedupe}, validated=${meta.afterValidation})`);

    job.status = 'done';
    job.statusMessage = `Found ${storeReferences.length} references`;
    job.result = {
      references: storeReferences,
      meta: {
        ...meta,
        isRealData: 1,
      },
    };
  } catch (error) {
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    console.error(`[ref-search] Job ${jobId} failed after ${elapsed}s:`, error);
    job.status = 'error';
    job.statusMessage = 'Search failed';
    job.error = error instanceof Error ? error.message : 'Failed to search references';
  }
}

// ─── POST: Create search job ───────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body: SearchRequestBody = await request.json();

    if (!body.keywords || !Array.isArray(body.keywords) || body.keywords.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Keywords are required' },
        { status: 400 },
      );
    }

    const keywords = body.keywords;
    const currentYear = new Date().getFullYear();
    const yearStart = body.yearStart || currentYear - 10;
    const yearEnd = body.yearEnd || currentYear;

    const options: SearchOptions = {
      booleanMode: body.booleanMode,
      includeKeywords: body.includeKeywords,
      excludeKeywords: body.excludeKeywords,
      referenceTypes: body.referenceTypes,
      translatedQueries: body.translatedQueries,
      maxResults: body.maxResults,
    };

    const jobId = `refsearch_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const job: SearchJob = {
      id: jobId,
      status: 'running',
      statusMessage: 'Initializing search...',
      progress: [],
      createdAt: Date.now(),
    };
    jobs.set(jobId, job);

    // Fire-and-forget
    runSearchJob(jobId, keywords, yearStart, yearEnd, options);

    return NextResponse.json({ success: true, jobId });
  } catch (error) {
    console.error('[ref-search] POST error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 },
    );
  }
}

// ─── GET: Poll job status ──────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const jobId = url.searchParams.get('jobId');

  if (!jobId) {
    return NextResponse.json(
      { success: false, error: 'Missing jobId query parameter' },
      { status: 400 },
    );
  }

  const job = jobs.get(jobId);
  if (!job) {
    return NextResponse.json(
      { success: false, error: 'Job not found or expired' },
      { status: 404 },
    );
  }

  return NextResponse.json({
    success: true,
    jobId: job.id,
    status: job.status,
    statusMessage: job.statusMessage,
    progress: job.progress,
    result: job.result,
    error: job.error,
  });
}