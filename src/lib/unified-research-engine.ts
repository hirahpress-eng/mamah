/**
 * Unified Research Engine
 * ──────────────────────────
 * Integrates OpenAlex, Consensus API, and Unpaywall for comprehensive
 * academic reference search with real data.
 *
 * Flow:
 * 1. OpenAlex → Find papers by keywords/DOI (metadata, abstracts, citations)
 * 2. Consensus → Get consensus answers for research questions
 * 3. Unpaywall → Find open-access PDF links
 * 4. Merge & rank results → Return to user
 */

import type { Reference } from '@/store/article-store';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface OpenAlexWork {
  id: string;
  doi: string | null;
  title: string | null;
  display_name: string | null;
  publication_year: number | null;
  authorships: Array<{
    author: { display_name: string | null };
    institutions?: Array<{ display_name: string | null }>;
  }>;
  primary_location?: {
    source?: { display_name: string | null };
    pdf_url?: string | null;
  };
  abstract_inverted_index?: Record<string, Array<{ position: number; sentence_ix: number }>>;
  cited_by_count: number;
  type: string;
  topics?: Array<{
    display_name: string;
    score: number;
  }>;
  open_access?: {
    is_oa: boolean;
    oa_status: string | null;
  };
}

export interface ConsensusResult {
  id: string;
  consensus_answer: 'Yes' | 'No' | 'Maybe' | 'Potentially';
  consensus_score: number;
  abstract: string;
  authors: string;
  journal: string;
  year: number;
  doi: string;
  title: string;
}

export interface UnpaywallResult {
  doi: string;
  best_oa_url: string | null;
  oa_locations: Array<{
    url: string;
    url_for_landing_page: string | null;
    url_for_pdf: string | null;
    host_type: string;
  }>;
  title: string;
  year: number | null;
  is_oa: boolean;
}

export interface UnifiedSearchResult {
  references: Reference[];
  totalFound: number;
  searchDuration: number;
  sources: {
    openalex: number;
    consensus: number;
    unpaywall: number;
  };
}

export interface SearchOptions {
  query: string;
  keywords: string[];
  maxResults?: number;   // default: 50
  yearFrom?: number;
  yearTo?: number;
  openAccessOnly?: boolean;
  minCitations?: number;
}

// ── OpenAlex Search ────────────────────────────────────────────────────────────

async function searchOpenAlex(options: SearchOptions): Promise<Reference[]> {
  const {
    query,
    keywords,
    maxResults = 50,
    yearFrom,
    yearTo,
    openAccessOnly,
    minCitations,
  } = options;

  // Build OpenAlex API URL
  const searchTerms = keywords.length > 0 ? keywords.join(' ') : query;
  const params = new URLSearchParams({
    search: searchTerms,
    per_page: String(Math.min(maxResults, 100)),
    sort: 'relevance_score:desc,cited_by_count:desc',
    select: 'id,doi,title,display_name,publication_year,authorships,primary_location,abstract_inverted_index,cited_by_count,type,topics,open_access',
  });

  if (yearFrom) params.set('filter:publication_year', `>=${yearFrom}`);
  if (yearTo) params.set('filter:publication_year', `<=${yearTo}`);
  if (openAccessOnly) params.set('filter:open_access.is_oa', 'true');
  if (minCitations && minCitations > 0) params.set('filter:cited_by_count', `>=${minCitations}`);

  const url = `https://api.openalex.org/works?${params.toString()}`;

  try {
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      console.error(`[OpenAlex] API error: ${response.status}`);
      return [];
    }

    const data = await response.json();
    const works: OpenAlexWork[] = data.results || [];

    // Determine reference type based on OpenAlex data
    const getRefType = (work: OpenAlexWork): string => {
      switch (work.type) {
        case 'book-chapter': return 'book';
        case 'dissertation': return 'thesis';
        case 'conference-paper': return 'conference';
        case 'preprint': return 'preprint';
        case 'journal-article':
        default: {
          const source = work.primary_location?.source?.display_name || '';
          if (source.toLowerCase().includes('scopus')) return 'journal_scopus';
          if (source.toLowerCase().includes('sinta')) return 'journal_sinta';
          return 'journal_scopus';
        }
      }
    };

    // Reconstruct abstract from inverted index
    const reconstructAbstract = (index: Record<string, Array<{ position: number; sentence_ix: number }>>): string => {
      const wordMap: Record<number, string> = {};
      for (const [word, positions] of Object.entries(index)) {
        for (const pos of positions) {
          wordMap[pos.position] = word;
        }
      }
      const words = Object.entries(wordMap)
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([, w]) => w);
      return words.join(' ');
    };

    return works.map((work, index) => {
      const authors = (work.authorships || [])
        .map(a => a.author?.display_name)
        .filter(Boolean)
        .slice(0, 5)
        .join(', ');

      const sourceName = work.primary_location?.source?.display_name || '';

      return {
        id: work.id || `openalex-${index}`,
        authors: authors || 'Unknown',
        title: work.title || work.display_name || 'Untitled',
        year: work.publication_year || new Date().getFullYear(),
        journal: sourceName || undefined,
        doi: work.doi?.replace('https://doi.org/', '') || undefined,
        refType: getRefType(work) as Reference['refType'],
        isSelected: false,
        abstract: work.abstract_inverted_index
          ? reconstructAbstract(work.abstract_inverted_index)
          : undefined,
        keywords: (work.topics || []).slice(0, 5).map(t => t.display_name),
        relevanceScore: Math.min(1, (work.cited_by_count || 0) / 100),
        citation_count: work.cited_by_count || 0,
        openalex_id: work.id,
        is_open_access: work.open_access?.is_oa || false,
        pdf_url: work.primary_location?.pdf_url || undefined,
      } as Reference & { openalex_id?: string; is_open_access?: boolean; pdf_url?: string; citation_count?: number };
    }).filter(ref => ref.title && ref.title !== 'Untitled');
  } catch (error) {
    console.error('[OpenAlex] Search error:', error);
    return [];
  }
}

// ── Consensus API Search ───────────────────────────────────────────────────────

async function searchConsensus(options: SearchOptions): Promise<Reference[]> {
  const { query, maxResults = 10 } = options;
  const apiKey = process.env.CONSENSUS_API_KEY;

  if (!apiKey) {
    console.warn('[Consensus] No API key configured. Skipping consensus search.');
    return [];
  }

  try {
    const params = new URLSearchParams({
      query: query,
      'num_results': String(Math.min(maxResults, 20)),
    });

    const response = await fetch(`https://api.consensus.app/v1/search?${params.toString()}`, {
      headers: {
        'x-api-key': apiKey,
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      console.error(`[Consensus] API error: ${response.status}`);
      return [];
    }

    const data = await response.json();
    const results: ConsensusResult[] = data.results || [];

    return results.map((result, index) => ({
      id: `consensus-${index}`,
      authors: result.authors,
      title: result.title,
      year: result.year,
      journal: result.journal,
      doi: result.doi?.replace('https://doi.org/', '') || undefined,
      abstract: result.abstract,
      refType: 'journal_scopus' as const,
      isSelected: false,
      consensus_score: String(result.consensus_score),
      is_open_access: false,
    }));
  } catch (error) {
    console.error('[Consensus] Search error:', error);
    return [];
  }
}

// ── Unpaywall PDF Lookup ───────────────────────────────────────────────────────

async function findOpenAccessPdfs(dois: string[]): Promise<Map<string, string>> {
  const email = process.env.UNPAYWALL_EMAIL || 'scholargen@example.com';
  const pdfMap = new Map<string, string>();

  // Unpaywall rate limit: process in batches
  for (let i = 0; i < dois.length; i += 10) {
    const batch = dois.slice(i, i + 10);

    const results = await Promise.allSettled(
      batch.map(async (doi) => {
        if (!doi) return null;
        try {
          const response = await fetch(
            `https://api.unpaywall.org/v2/${encodeURIComponent(doi)}?email=${email}`,
            { signal: AbortSignal.timeout(10000) }
          );

          if (!response.ok) return null;

          const data: UnpaywallResult = await response.json();

          if (data.best_oa_url) {
            return { doi, url: data.best_oa_url };
          }

          // Try direct PDF links
          const pdfLocation = data.oa_locations?.find(loc => loc.url_for_pdf);
          if (pdfLocation?.url_for_pdf) {
            return { doi, url: pdfLocation.url_for_pdf };
          }

          return null;
        } catch {
          return null;
        }
      })
    );

    for (const result of results) {
      if (result.status === 'fulfilled' && result.value) {
        pdfMap.set(result.value.doi, result.value.url);
      }
    }

    // Delay between batches
    if (i + 10 < dois.length) {
      await new Promise(resolve => setTimeout(resolve, 1100));
    }
  }

  console.log(`[Unpaywall] Found ${pdfMap.size} open-access PDFs out of ${dois.length} DOIs`);
  return pdfMap;
}

// ── Merge & Rank Results ───────────────────────────────────────────────────────

function mergeResults(
  openalexResults: Reference[],
  consensusResults: Reference[],
  pdfMap: Map<string, string>
): Reference[] {
  const merged = new Map<string, Reference>();

  // Add OpenAlex results first (higher priority, more metadata)
  for (const ref of openalexResults) {
    merged.set(ref.doi || ref.id, ref);
  }

  // Merge Consensus results (add consensus_score)
  for (const ref of consensusResults) {
    const key = ref.doi || ref.id;
    const existing = merged.get(key);

    if (existing) {
      // Enrich existing with consensus data
      existing.consensus_score = String(ref.consensus_score);
    } else {
      // Add as new entry
      merged.set(key, ref);
    }
  }

  // Enrich with Open Access PDF links
  for (const ref of merged.values()) {
    if (ref.doi && pdfMap.has(ref.doi)) {
      ref.pdfUrl = pdfMap.get(ref.doi)!;
      ref.is_open_access = true;
    }
  }

  // Convert to array and sort
  const results = Array.from(merged.values());

  results.sort((a, b) => {
    // Score: citation count + consensus bonus + OA bonus
    const scoreA = (a.citation_count || 0) * 0.3
      + Number(a.consensus_score || 0) * 10
      + (a.is_open_access ? 5 : 0)
      + (a.relevanceScore || 0) * 20;

    const scoreB = (b.citation_count || 0) * 0.3
      + Number(b.consensus_score || 0) * 10
      + (b.is_open_access ? 5 : 0)
      + (b.relevanceScore || 0) * 20;

    return scoreB - scoreA;
  });

  return results;
}

// ── Main Unified Search ────────────────────────────────────────────────────────

export async function unifiedSearch(options: SearchOptions): Promise<UnifiedSearchResult> {
  const startTime = Date.now();

  // Run all searches in parallel
  const [openalexResults, consensusResults] = await Promise.all([
    searchOpenAlex(options),
    searchConsensus(options),
  ]);

  // Find OA PDFs for all DOIs
  const allDois = [...openalexResults, ...consensusResults]
    .map(r => r.doi)
    .filter((d): d is string => !!d);

  const pdfMap = await findOpenAccessPdfs(allDois);

  // Merge and rank
  const merged = mergeResults(openalexResults, consensusResults, pdfMap);

  // Trim to max results
  const finalResults = merged.slice(0, options.maxResults || 50);

  // Add sort_order
  finalResults.forEach((ref, index) => {
    ref.sort_order = index;
  });

  const duration = Date.now() - startTime;

  console.log(`[ResearchEngine] Search completed in ${duration}ms: ${finalResults.length} results (${openalexResults.length} OpenAlex, ${consensusResults.length} Consensus, ${pdfMap.size} OA PDFs)`);

  return {
    references: finalResults,
    totalFound: merged.length,
    searchDuration: duration,
    sources: {
      openalex: openalexResults.length,
      consensus: consensusResults.length,
      unpaywall: pdfMap.size,
    },
  };
}

// ── Download PDF from Open Access URL ──────────────────────────────────────────

export async function downloadPdfFromUrl(url: string): Promise<Buffer | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mamah/1.0 (Academic Research Tool)',
        'Accept': 'application/pdf,*/*',
      },
      signal: AbortSignal.timeout(60000),
      redirect: 'follow',
    });

    if (!response.ok) {
      console.error(`[PDF Download] Failed: ${response.status} ${response.statusText}`);
      return null;
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('pdf') && !contentType.includes('octet-stream')) {
      console.warn(`[PDF Download] Unexpected content type: ${contentType}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.error('[PDF Download] Error:', error);
    return null;
  }
}

// ── Quick DOI Lookup ───────────────────────────────────────────────────────────

export async function lookupDoi(doi: string): Promise<Reference | null> {
  try {
    const response = await fetch(
      `https://api.openalex.org/works/doi:${encodeURIComponent(doi)}`,
      { signal: AbortSignal.timeout(15000) }
    );

    if (!response.ok) return null;

    const work: OpenAlexWork = await response.json();
    if (!work) return null;

    const authors = (work.authorships || [])
      .map(a => a.author?.display_name)
      .filter(Boolean)
      .slice(0, 5)
      .join(', ');

    return {
      id: work.id || `doi-${doi}`,
      authors: authors || 'Unknown',
      title: work.title || work.display_name || 'Untitled',
      year: work.publication_year || null,
      journal: work.primary_location?.source?.display_name || undefined,
      doi: doi,
      refType: 'journal_scopus',
      isSelected: true,
      abstract: work.abstract_inverted_index
        ? Object.entries(work.abstract_inverted_index)
            .reduce((acc, [word, positions]) => {
              for (const pos of positions) {
                (acc as Record<number, string>)[pos.position] = word;
              }
              return acc;
            }, {} as Record<number, string>)
            .toString()
        : undefined,
      citation_count: work.cited_by_count || 0,
    } as Reference & { citation_count?: number };
  } catch (error) {
    console.error(`[DOI Lookup] Error for ${doi}:`, error);
    return null;
  }
}
