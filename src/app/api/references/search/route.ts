import { NextRequest, NextResponse } from 'next/server';
import { searchReferences, type RealReference, type SearchOptions } from '@/lib/reference-search';

export const maxDuration = 300;

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

// ─── POST: Search references synchronously ─────────────────────────────────────

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

    const tqCount = options?.translatedQueries?.length ?? 0;
    console.log(`[ref-search] Started: ${keywords.length} keywords, ${tqCount} translated queries, types=${options?.referenceTypes?.length ?? 0}`);

    const t0 = Date.now();

    const { references, meta } = await searchReferences(
      keywords,
      yearStart,
      yearEnd,
      (_updatedProgress) => {
        // Progress callback still fires internally but intermediate updates
        // are not visible to the client in synchronous mode.
      },
      options,
    );

    // Convert RealReference[] to the response format
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
    console.log(`[ref-search] Done in ${elapsed}s: ${storeReferences.length} refs (raw=${meta.totalRaw}, deduped=${meta.afterDedupe}, validated=${meta.afterValidation})`);

    return NextResponse.json({
      success: true,
      result: {
        references: storeReferences,
        meta: {
          ...meta,
          isRealData: 1,
        },
      },
    });
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
