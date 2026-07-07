/**
 * Bot Mini-Service
 * ────────────────
 * Lightweight HTTP server running on port 3035 that handles the heavy
 * lifting for the SuperBot system: AI strategy generation, parallel
 * database searches, and page browsing/enrichment.
 *
 * The Next.js API routes proxy to this service via the Caddy gateway
 * (XTransformPort=3035).
 */

import { createServer } from 'node:http';

// ── Types ──────────────────────────────────────────────────────────────────────

interface StrategyCriteria {
  yearFrom: number;
  yearTo: number;
  openAccessOnly: boolean;
  minCitations: number;
  preferredJournals: string[];
  languages: string[];
}

interface Reference {
  id: string;
  title: string;
  authors: string;
  year: number;
  journal?: string;
  doi?: string;
  abstract?: string;
  source: string;
  relevanceScore: number;
  citationCount?: number;
  openAccessUrl?: string;
  keywords?: string[];
}

// ── Utility ────────────────────────────────────────────────────────────────────

function jsonResponse(
  res: import('node:http').ServerResponse,
  data: unknown,
  status = 200,
): void {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
  });
  res.end(body);
}

function readBody(req: import('node:http').IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

// ── AI Strategy Generation ─────────────────────────────────────────────────────

async function generateStrategy(
  topic: string,
): Promise<{ keywords: string[]; criteria: StrategyCriteria }> {
  try {
    // Dynamic import so the service still starts even if the SDK is unavailable
    const ZAI = (await import('z-ai-web-dev-sdk')).default;
    const zai = await ZAI.create();

    const prompt = `You are an expert academic research strategist. Given a research topic, produce a JSON object with two fields:

1. "keywords" — an array of 8–12 optimal search keywords/key phrases for academic databases (Scopus, Web of Science, Semantic Scholar). Include broader terms, narrower terms, and related synonyms. Mix single words with 2–4 word phrases.

2. "criteria" — an object with these fields:
   - "yearFrom": number (recommended start year, typically 5–15 years ago)
   - "yearTo": number (current year)
   - "openAccessOnly": boolean (true if OA literature is sufficient for this topic)
   - "minCitations": number (minimum citation count to filter low-impact papers, 0–50)
   - "preferredJournals": string[] (3–5 top journal names relevant to this topic, or empty array)
   - "languages": string[] (language codes, e.g. ["en"], or ["en","de","fr"] for multilingual topics)

Research topic: "${topic}"

Return ONLY valid JSON with no explanation, markdown fencing, or extra text.`;

    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'assistant',
          content:
            'You are an academic research strategist AI. You return precise JSON objects only.',
        },
        { role: 'user', content: prompt },
      ],
      thinking: { type: 'disabled' },
    });

    const raw = completion.choices[0]?.message?.content ?? '';

    // Robust JSON extraction
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON object found in AI response');
    }

    const parsed = JSON.parse(jsonMatch[0]) as {
      keywords?: string[];
      criteria?: StrategyCriteria;
    };

    const keywords = Array.isArray(parsed.keywords)
      ? parsed.keywords.slice(0, 12).filter((k: unknown) => typeof k === 'string')
      : topic.split(/\s+/).slice(0, 8);

    const criteria: StrategyCriteria = {
      yearFrom:
        typeof parsed.criteria?.yearFrom === 'number'
          ? parsed.criteria.yearFrom
          : new Date().getFullYear() - 10,
      yearTo:
        typeof parsed.criteria?.yearTo === 'number'
          ? parsed.criteria.yearTo
          : new Date().getFullYear(),
      openAccessOnly:
        typeof parsed.criteria?.openAccessOnly === 'boolean'
          ? parsed.criteria.openAccessOnly
          : false,
      minCitations:
        typeof parsed.criteria?.minCitations === 'number'
          ? Math.max(0, parsed.criteria.minCitations)
          : 0,
      preferredJournals: Array.isArray(parsed.criteria?.preferredJournals)
        ? parsed.criteria.preferredJournals
        : [],
      languages: Array.isArray(parsed.criteria?.languages)
        ? parsed.criteria.languages
        : ['en'],
    };

    return { keywords, criteria };
  } catch (err) {
    console.error('[BotService] AI strategy generation failed:', err);
    // Return sensible defaults
    return {
      keywords: topic.split(/\s+/).slice(0, 8),
      criteria: {
        yearFrom: new Date().getFullYear() - 10,
        yearTo: new Date().getFullYear(),
        openAccessOnly: false,
        minCitations: 0,
        preferredJournals: [],
        languages: ['en'],
      },
    };
  }
}

// ── Database Search ────────────────────────────────────────────────────────────

/**
 * Search OpenAlex for academic papers.
 * This is the primary free academic database.
 */
async function searchOpenAlex(
  keywords: string[],
  maxResults: number,
  criteria: StrategyCriteria,
): Promise<Reference[]> {
  const searchTerms = keywords.join(' ');
  const params = new URLSearchParams({
    search: searchTerms,
    per_page: String(Math.min(maxResults, 100)),
    sort: 'relevance_score:desc,cited_by_count:desc',
    select:
      'id,doi,title,display_name,publication_year,authorships,primary_location,abstract_inverted_index,cited_by_count,type,topics,open_access',
  });

  params.set(
    'filter:publication_year',
    `${criteria.yearFrom}-${criteria.yearTo}`,
  );
  if (criteria.openAccessOnly) {
    params.set('filter:open_access.is_oa', 'true');
  }
  if (criteria.minCitations > 0) {
    params.set('filter:cited_by_count', `>=${criteria.minCitations}`);
  }

  const response = await fetch(
    `https://api.openalex.org/works?${params.toString()}`,
    {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(30000),
    },
  );

  if (!response.ok) {
    console.error(`[OpenAlex] HTTP ${response.status}`);
    return [];
  }

  const data = await response.json();
  const works: Array<Record<string, unknown>> = data.results ?? [];

  return works.map((work, i) => {
    const authorships = (work.authorships as Array<Record<string, unknown>>) ?? [];
    const authors = authorships
      .map((a) => {
        const author = a.author as Record<string, unknown> | undefined;
        return author?.display_name as string | undefined;
      })
      .filter(Boolean)
      .slice(0, 5)
      .join(', ');

    const location = work.primary_location as Record<string, unknown> | undefined;
    const source = location?.source as Record<string, unknown> | undefined;

    // Reconstruct abstract from inverted index
    let abstract: string | undefined;
    const idx = work.abstract_inverted_index as
      | Record<string, Array<{ position: number }>>
      | undefined;
    if (idx) {
      const wordMap: Record<number, string> = {};
      for (const [word, positions] of Object.entries(idx)) {
        for (const pos of positions) {
          wordMap[pos.position] = word;
        }
      }
      abstract = Object.entries(wordMap)
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([, w]) => w)
        .join(' ');
    }

    const oa = work.open_access as Record<string, unknown> | undefined;
    const topics = (work.topics as Array<{ display_name: string }>) ?? [];

    return {
      id: (work.id as string) ?? `oa-${i}`,
      title:
        (work.title as string) ??
        (work.display_name as string) ??
        'Untitled',
      authors: authors || 'Unknown',
      year: (work.publication_year as number) ?? new Date().getFullYear(),
      journal: source?.display_name as string | undefined,
      doi: typeof work.doi === 'string' ? work.doi.replace('https://doi.org/', '') : undefined,
      abstract,
      source: 'openalex',
      relevanceScore: Math.min(1, ((work.cited_by_count as number) ?? 0) / 100),
      citationCount: (work.cited_by_count as number) ?? 0,
      openAccessUrl: oa?.is_oa ? source?.pdf_url as string | undefined : undefined,
      keywords: topics.slice(0, 5).map((t) => t.display_name),
    } satisfies Reference;
  }).filter((r) => r.title && r.title !== 'Untitled');
}

/**
 * Search Semantic Scholar for additional results.
 */
async function searchSemanticScholar(
  keywords: string[],
  maxResults: number,
  criteria: StrategyCriteria,
): Promise<Reference[]> {
  const query = keywords.join(' ');
  const params = new URLSearchParams({
    query,
    limit: String(Math.min(maxResults, 100)),
    fields:
      'paperId,title,abstract,authors,year,venue,externalIds,citationCount,openAccessPdf,fieldsOfStudy',
    publicationDateRange: `${criteria.yearFrom}-${criteria.yearTo}`,
  });

  const response = await fetch(
    `https://api.semanticscholar.org/graph/v1/paper/search?${params.toString()}`,
    {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(30000),
    },
  );

  if (!response.ok) {
    console.error(`[SemanticScholar] HTTP ${response.status}`);
    return [];
  }

  const data = await response.json();
  const papers: Array<Record<string, unknown>> = data.data ?? [];

  return papers.map((paper, i) => {
    const authors = ((paper.authors as Array<Record<string, unknown>>) ?? [])
      .map((a) => a.name as string)
      .filter(Boolean)
      .slice(0, 5)
      .join(', ');

    const extIds = paper.externalIds as Record<string, string> | undefined;
    const oaPdf = paper.openAccessPdf as Record<string, string> | undefined;

    return {
      id: (paper.paperId as string) ?? `ss-${i}`,
      title: (paper.title as string) ?? 'Untitled',
      authors: authors || 'Unknown',
      year: (paper.year as number) ?? new Date().getFullYear(),
      journal: (paper.venue as string) ?? undefined,
      doi: extIds?.DOI,
      abstract: (paper.abstract as string) ?? undefined,
      source: 'semantic_scholar',
      relevanceScore: Math.min(
        1,
        ((paper.citationCount as number) ?? 0) / 200,
      ),
      citationCount: (paper.citationCount as number) ?? 0,
      openAccessUrl: oaPdf?.url,
      keywords: (paper.fieldsOfStudy as string[]) ?? [],
    } satisfies Reference;
  }).filter((r) => r.title && r.title !== 'Untitled');
}

/**
 * Search CrossRef for additional metadata.
 */
async function searchCrossRef(
  keywords: string[],
  maxResults: number,
  criteria: StrategyCriteria,
): Promise<Reference[]> {
  const query = keywords.join(' ');
  const params = new URLSearchParams({
    query,
    rows: String(Math.min(maxResults, 100)),
    sort: 'relevance',
    order: 'desc',
  });
  if (criteria.yearFrom) params.set('from-pub-date', `${criteria.yearFrom}-01-01`);
  if (criteria.yearTo) params.set('until-pub-date', `${criteria.yearTo}-12-31`);

  const response = await fetch(
    `https://api.crossref.org/works?${params.toString()}`,
    {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'SuperBot/1.0 (mailto:scholargen@example.com)',
      },
      signal: AbortSignal.timeout(30000),
    },
  );

  if (!response.ok) {
    console.error(`[CrossRef] HTTP ${response.status}`);
    return [];
  }

  const data = await response.json();
  const items: Array<Record<string, unknown>> = data.message?.items ?? [];

  return items.map((item, i) => {
    const authors = ((item.author as Array<Record<string, unknown>>) ?? [])
      .map((a) => {
        const given = a.given as string | undefined;
        const family = a.family as string | undefined;
        return family ? (given ? `${family}, ${given}` : family) : given;
      })
      .filter(Boolean)
      .slice(0, 5)
      .join(', ');

    return {
      id: (item.DOI as string) ? `cr-${item.DOI}` : `cr-${i}`,
      title: ((item.title as string[])?.[0]) ?? 'Untitled',
      authors: authors || 'Unknown',
      year: (item.published?.['date-parts'] as number[][])?.[0]?.[0] ?? new Date().getFullYear(),
      journal: (item['container-title'] as string[])?.[0] ?? undefined,
      doi: (item.DOI as string) ?? undefined,
      abstract: (item.abstract as string) ?? undefined,
      source: 'crossref',
      relevanceScore: Math.min(
        1,
        ((item['is-referenced-by-count'] as number) ?? 0) / 100,
      ),
      citationCount: (item['is-referenced-by-count'] as number) ?? 0,
      openAccessUrl: item.link?.[0]?.URL as string | undefined,
    } satisfies Reference;
  }).filter((r) => r.title && r.title !== 'Untitled');
}

// ── Browse / Enrich ────────────────────────────────────────────────────────────

async function enrichReferences(
  references: Reference[],
): Promise<Reference[]> {
  // For now, enrichment focuses on finding OA links via Unpaywall
  const dois = references
    .map((r) => r.doi)
    .filter((d): d is string => !!d);

  const enrichedMap = new Map<string, Reference>();

  // Process in small batches to respect rate limits
  for (let i = 0; i < dois.length; i += 5) {
    const batch = dois.slice(i, i + 5);

    const results = await Promise.allSettled(
      batch.map(async (doi) => {
        try {
          const resp = await fetch(
            `https://api.unpaywall.org/v2/${encodeURIComponent(doi)}?email=scholargen@example.com`,
            { signal: AbortSignal.timeout(10000) },
          );
          if (!resp.ok) return null;

          const data = (await resp.json()) as Record<string, unknown>;
          const bestUrl = data.best_oa_url as string | undefined;
          const oaLocations = data.oa_locations as Array<Record<string, string>> | undefined;

          const pdfUrl =
            bestUrl ??
            oaLocations?.find((loc) => loc.url_for_pdf)?.url_for_pdf;

          if (pdfUrl) {
            return { doi, pdfUrl };
          }
          return null;
        } catch {
          return null;
        }
      }),
    );

    for (const r of results) {
      if (r.status === 'fulfilled' && r.value) {
        enrichedMap.set(r.value.doi, { openAccessUrl: r.value.pdfUrl } as Reference);
      }
    }

    // Small delay between batches
    if (i + 5 < dois.length) {
      await new Promise((resolve) => setTimeout(resolve, 1200));
    }
  }

  if (enrichedMap.size === 0) return references;

  return references.map((ref) => {
    const enrichment = enrichedMap.get(ref.doi ?? '');
    if (enrichment) {
      return {
        ...ref,
        openAccessUrl: enrichment.openAccessUrl ?? ref.openAccessUrl,
      };
    }
    return ref;
  });
}

// ── Health ─────────────────────────────────────────────────────────────────────

interface HealthStatus {
  status: 'healthy' | 'degraded';
  uptime: number;
  version: string;
  timestamp: string;
}

function getHealth(): HealthStatus {
  return {
    status: 'healthy',
    uptime: process.uptime(),
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  };
}

// ── Router ─────────────────────────────────────────────────────────────────────

const PORT = 3035;
const server = createServer(async (req, res) => {
  // CORS headers (for internal gateway use)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);
  const pathname = url.pathname;

  try {
    // ── POST /api/bot/strategy ──────────────────────────────────────────
    if (pathname === '/api/bot/strategy' && req.method === 'POST') {
      const body = JSON.parse(await readBody(req));
      const { topic } = body as { topic?: string };

      if (!topic || typeof topic !== 'string') {
        jsonResponse(res, { success: false, error: 'Topic string is required' }, 400);
        return;
      }

      console.log(`[BotService] Generating strategy for: "${topic}"`);
      const strategy = await generateStrategy(topic);

      jsonResponse(res, { success: true, ...strategy });
      return;
    }

    // ── POST /api/bot/search ────────────────────────────────────────────
    if (pathname === '/api/bot/search' && req.method === 'POST') {
      const body = JSON.parse(await readBody(req));
      const {
        topic,
        keywords,
        maxResults = 50,
        criteria,
        databases = ['openalex', 'semantic_scholar', 'crossref'],
      } = body as {
        topic?: string;
        keywords?: string[];
        maxResults?: number;
        criteria?: StrategyCriteria;
        databases?: string[];
      };

      if (!topic || !keywords?.length) {
        jsonResponse(res, { success: false, error: 'Topic and keywords are required' }, 400);
        return;
      }

      const safeCriteria: StrategyCriteria = criteria ?? {
        yearFrom: new Date().getFullYear() - 10,
        yearTo: new Date().getFullYear(),
        openAccessOnly: false,
        minCitations: 0,
        preferredJournals: [],
        languages: ['en'],
      };

      console.log(
        `[BotService] Searching for: "${topic}" across ${databases.join(', ')}`,
      );

      // Run all enabled database searches in parallel
      const searchFns: Array<{ name: string; fn: () => Promise<Reference[]> }> = [];

      if (databases.includes('openalex')) {
        searchFns.push({ name: 'openalex', fn: () => searchOpenAlex(keywords, maxResults, safeCriteria) });
      }
      if (databases.includes('semantic_scholar')) {
        searchFns.push({ name: 'semantic_scholar', fn: () => searchSemanticScholar(keywords, maxResults, safeCriteria) });
      }
      if (databases.includes('crossref')) {
        searchFns.push({ name: 'crossref', fn: () => searchCrossRef(keywords, maxResults, safeCriteria) });
      }

      const settled = await Promise.allSettled(
        searchFns.map(async (sf) => {
          const refs = await sf.fn();
          return { database: sf.name, references: refs };
        }),
      );

      const results = settled
        .filter((r): r is PromiseFulfilledResult<{ database: string; references: Reference[] }> => r.status === 'fulfilled')
        .map((r) => r.value);

      console.log(
        `[BotService] Search complete — ${results.reduce((s, r) => s + r.references.length, 0)} total results`,
      );

      jsonResponse(res, { success: true, results });
      return;
    }

    // ── POST /api/bot/browse ────────────────────────────────────────────
    if (pathname === '/api/bot/browse' && req.method === 'POST') {
      const body = JSON.parse(await readBody(req));
      const { references } = body as { references?: Reference[] };

      if (!references || !Array.isArray(references) || references.length === 0) {
        jsonResponse(res, { success: false, error: 'References array is required' }, 400);
        return;
      }

      console.log(`[BotService] Enriching ${references.length} references…`);
      const enriched = await enrichReferences(references);

      jsonResponse(res, { success: true, enriched });
      return;
    }

    // ── GET /api/bot/status ─────────────────────────────────────────────
    if (pathname === '/api/bot/status' && req.method === 'GET') {
      const health = getHealth();
      jsonResponse(res, { success: true, ...health });
      return;
    }

    // ── 404 ─────────────────────────────────────────────────────────────
    jsonResponse(res, { success: false, error: 'Not found' }, 404);
  } catch (err) {
    console.error('[BotService] Unhandled error:', err);
    jsonResponse(
      res,
      {
        success: false,
        error: err instanceof Error ? err.message : 'Internal server error',
      },
      500,
    );
  }
});

server.listen(PORT, () => {
  console.log(`[BotService] SuperBot mini-service running on port ${PORT}`);
});
