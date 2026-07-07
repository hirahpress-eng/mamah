/**
 * SuperBot Engine — Custom Academic Reference Search & Download Bot
 * ════════════════════════════════════════════════════════════════════
 *
 * A comprehensive bot engine that uses CUSTOM LOGIC (not AI) for browsing,
 * scoring, and downloading academic references. AI is used ONCE at the
 * strategy-planning phase via z-ai-web-dev-sdk.
 *
 * Architecture:
 *   1. Types & Interfaces      — Data contracts for the entire pipeline
 *   2. Scoring Module           — Custom 0-100 scoring algorithm (NO AI)
 *   3. Human Mimicry Module     — Anti-detection helper functions
 *   4. Extraction Module        — Regex-based HTML content extraction
 *   5. SuperBot Class           — Main orchestrator with phased execution
 *   6. Z.ai Strategy Integration — One-shot AI for search strategy planning
 *   7. External Integration     — Database configs & Telegram storage
 *
 * SERVER-SIDE ONLY. Do NOT import on the client.
 */

import { DATABASE_CONFIGS, getEnabledDatabases, getDatabasesByIds } from './database-configs';
import { uploadToTelegram } from './telegram-storage';

// ═══════════════════════════════════════════════════════════════════════════════
// §1. TYPES & INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

/** A single search result from any database, enriched with a custom score */
export interface BotSearchResult {
  id: string;
  databaseId: string;
  databaseName: string;
  title: string;
  authors: string;
  year: number | null;
  abstract: string | null;
  journal: string | null;
  doi: string | null;
  pdfUrl: string | null;
  citations: number | null;
  isOpenAccess: boolean;
  /** Custom scoring algorithm result (0-100) */
  score: number;
  /** Which database produced this result */
  source: string;
}

/** Strategy generated once by Z.ai to guide all subsequent searches */
export interface BotSearchStrategy {
  keywords: string[];
  criteria: {
    yearFrom: number;
    yearTo: number;
    openAccessOnly: boolean;
    minCitations: number;
    preferredJournals: string[];
    languages: string[];
  };
}

/** Real-time progress callback payload for the UI */
export interface BotProgress {
  phase: 'init' | 'strategy' | 'searching' | 'scoring' | 'downloading' | 'uploading' | 'complete' | 'error';
  currentDatabase: string;
  databasesSearched: string[];
  totalDatabases: number;
  resultsFound: number;
  currentPercent: number;
  message: string;
  startTime: number;
}

/** Top-level configuration passed to SuperBot.run() */
export interface BotRunConfig {
  topic: string;
  keywords: string[];
  maxResults: number;
  autoDownload: boolean;
  downloadLimit: number;
  minScoreThreshold: number;
  /** Specific database IDs, or undefined for all enabled databases */
  databases?: string[];
}

/** Internal raw result before scoring */
interface RawSearchResult {
  title: string;
  authors: string;
  year: number | null;
  abstract: string | null;
  journal: string | null;
  doi: string | null;
  pdfUrl: string | null;
  citations: number | null;
  isOpenAccess: boolean;
}

/** Response from the mini-service bot-search API */
interface BotSearchApiResponse {
  success: boolean;
  results: RawSearchResult[];
  error?: string;
  databaseId: string;
  query: string;
}

/** Proxy configuration for requests */
export interface BotProxyConfig {
  protocol?: 'http' | 'https' | 'socks4' | 'socks5';
  host: string;
  port: number;
  username?: string;
  password?: string;
}

/** Deduplication key extracted from a result */
interface DedupKey {
  doi?: string;
  titleNormalized?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// §2. SCORING MODULE — Custom Algorithm (NO AI)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Score a single search result on a 0-100 scale using a custom algorithm.
 *
 * Breakdown:
 *   - Year recency .............. max 20 pts  (linear degradation)
 *   - Open access ............... max 15 pts  (binary)
 *   - Citation count ............ max 20 pts  (log₁₀ scale, capped)
 *   - Title/abstract relevance .. max 25 pts  (keyword matching)
 *   - Journal quality ........... max 10 pts  (preferred journal match)
 *   - Language match ............ max 10 pts  (preferred language)
 */
export function scoreResult(
  result: BotSearchResult,
  strategy: BotSearchStrategy,
): number {
  let score = 0;

  // ── Year recency (max 20 pts) ────────────────────────────────────────────
  // Full 20 pts if within last 3 years. Degrades linearly to 0 over 15 years.
  const currentYear = new Date().getFullYear();
  const year = result.year ?? 0;
  const age = Math.max(0, currentYear - year);
  const yearScore = Math.max(0, 20 - (age * 20) / 15);
  score += Math.round(yearScore * 10) / 10;

  // ── Open access (max 15 pts) ─────────────────────────────────────────────
  if (result.isOpenAccess) {
    score += 15;
  } else if (strategy.criteria.openAccessOnly) {
    // Hard penalty if user requires OA but result isn't
    score -= 30;
  }

  // ── Citation count (max 20 pts, logarithmic) ─────────────────────────────
  // log₁₀(citations + 1) * 6.67, capped at 20
  const rawCitations = result.citations ?? 0;
  if (rawCitations > 0) {
    const citationScore = Math.min(20, Math.log10(rawCitations + 1) * 6.67);
    score += Math.round(citationScore * 10) / 10;
  }

  // ── Title/abstract relevance (max 25 pts) ────────────────────────────────
  // Count strategy keywords found in title (weighted 2x) and abstract
  const allKeywords = [...strategy.keywords, ...extractSignificantWords(strategy.keywords)];
  const textToSearch = [
    result.title.toLowerCase(),
    result.abstract?.toLowerCase() ?? '',
  ].join(' ');

  const matchedKeywords = new Set<string>();
  for (const kw of allKeywords) {
    const kwLower = kw.toLowerCase();
    if (kwLower.length >= 3 && textToSearch.includes(kwLower)) {
      matchedKeywords.add(kwLower);
    }
  }

  // Each unique keyword match contributes proportionally (max 25)
  const maxPossibleMatches = Math.max(allKeywords.length, 1);
  const relevanceScore = Math.min(25, (matchedKeywords.size / maxPossibleMatches) * 25);
  score += Math.round(relevanceScore * 10) / 10;

  // ── Journal quality (max 10 pts) ─────────────────────────────────────────
  if (result.journal && strategy.criteria.preferredJournals.length > 0) {
    const journalLower = result.journal.toLowerCase();
    const matched = strategy.criteria.preferredJournals.some(pj =>
      journalLower.includes(pj.toLowerCase())
    );
    if (matched) {
      score += 10;
    }
  }

  // ── Language match (max 10 pts) ──────────────────────────────────────────
  const detectedLang = detectLanguage(result.title + ' ' + (result.abstract ?? ''));
  if (strategy.criteria.languages.includes(detectedLang)) {
    score += 10;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Score, deduplicate, and rank an array of results.
 */
export function scoreAndRank(
  results: BotSearchResult[],
  strategy: BotSearchStrategy,
): BotSearchResult[] {
  // 1. Score each result
  const scored = results.map(result => ({
    ...result,
    score: scoreResult(result, strategy),
  }));

  // 2. Deduplicate by DOI first, then by normalized title
  const seen = new Map<string, BotSearchResult>();
  for (const result of scored) {
    const key = result.doi
      ? `doi:${result.doi.toLowerCase()}`
      : `title:${normalizeTitle(result.title)}`;

    const existing = seen.get(key);
    if (!existing || result.score > existing.score) {
      seen.set(key, result);
    }
  }

  // 3. Sort by score descending
  return Array.from(seen.values()).sort((a, b) => b.score - a.score);
}

/**
 * Filter results suitable for download based on score threshold and limit.
 */
export function selectForDownload(
  results: BotSearchResult[],
  limit: number,
  minScore: number,
): BotSearchResult[] {
  return results
    .filter(r => r.score >= minScore && r.pdfUrl !== null)
    .slice(0, limit);
}

// ── Scoring Helpers ──────────────────────────────────────────────────────────

/** Extract significant individual words from keyword phrases for fuzzy matching */
function extractSignificantWords(keywords: string[]): string[] {
  const stopWords = new Set([
    'the', 'a', 'an', 'in', 'on', 'at', 'of', 'for', 'to', 'and',
    'or', 'but', 'with', 'by', 'from', 'is', 'are', 'was', 'were',
    'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
    'its', 'this', 'that', 'these', 'those', 'as', 'if', 'not', 'no',
    'so', 'than', 'too', 'very', 'just', 'about', 'above', 'after',
    'again', 'all', 'am', 'any', 'because', 'before', 'between',
    'can', 'could', 'each', 'few', 'further', 'get', 'he', 'her',
    'here', 'how', 'i', 'into', 'it', 'my', 'myself', 'now', 'of',
    'only', 'other', 'our', 'own', 'same', 'she', 'should', 'some',
    'such', 'then', 'there', 'they', 'their', 'through', 'under',
    'until', 'up', 'we', 'what', 'when', 'where', 'which', 'while',
    'who', 'whom', 'why', 'will', 'would', 'you', 'your',
    // Indonesian stop words
    'yang', 'dan', 'di', 'ke', 'dari', 'untuk', 'pada', 'dengan',
    'adalah', 'ini', 'itu', 'atau', 'dalam', 'tidak', 'akan', 'sudah',
    'juga', 'oleh', 'sebuah', 'tersebut', 'bagi', 'sebagai', 'masih',
  ]);

  return keywords
    .flatMap(kw => kw.toLowerCase().split(/\s+/))
    .filter(w => w.length >= 3 && !stopWords.has(w));
}

/** Simple heuristic language detection based on character patterns */
function detectLanguage(text: string): string {
  if (!text) return 'unknown';

  const latinChars = (text.match(/[a-zA-Z]/g) || []).length;
  const totalChars = text.replace(/\s/g, '').length;
  if (totalChars === 0) return 'unknown';

  // Indonesian detection: common Indonesian words
  const indonesianMarkers = [
    'yang', 'dengan', 'untuk', 'dari', 'dalam', 'pada', 'adalah',
    'pendidikan', 'pembelajaran', 'siswa', 'guru', 'sekolah', 'kajian',
    'penelitian', 'hasil', 'dapat', 'melalui', 'berdasarkan', 'menunjukkan',
    'kata', 'kunci', 'abstrak', 'universitas', 'fakultas', 'program',
    'studi', 'meningkatkan', 'pengaruh', 'penggunaan', 'model',
  ];
  const textLower = text.toLowerCase();
  const indoMatches = indonesianMarkers.filter(m => textLower.includes(m)).length;

  if (indoMatches >= 3) return 'id';

  // Default: assume English for Latin-script academic text
  if (latinChars / totalChars > 0.7) return 'en';

  return 'unknown';
}

/** Normalize a title for deduplication purposes */
function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// ═══════════════════════════════════════════════════════════════════════════════
// §3. HUMAN MIMICRY MODULE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Introduce a random delay between min and max milliseconds.
 * Uses a slightly non-linear distribution to feel more natural.
 */
export function humanDelay(min: number, max: number): Promise<void> {
  // Gaussian-ish distribution: average of 3 uniform randoms
  const r1 = Math.random();
  const r2 = Math.random();
  const r3 = Math.random();
  const normalized = (r1 + r2 + r3) / 3;
  const delay = min + normalized * (max - min);
  return new Promise(resolve => setTimeout(resolve, delay));
}

/**
 * Scroll a page by a random amount in the given direction.
 * This is a Playwright helper — returns the pixel delta.
 */
export function randomScroll(direction: 'up' | 'down'): number {
  const min = 100;
  const max = 500;
  const delta = Math.floor(min + Math.random() * (max - min));
  return direction === 'down' ? delta : -delta;
}

/**
 * Build a typing sequence with random per-character delays.
 * Returns an array of { char, delayMs } entries for the browser to replay.
 */
export function simulateTyping(
  text: string,
  baseDelay: number = 50,
  jitter: number = 80,
): Array<{ char: string; delayMs: number }> {
  const sequence: Array<{ char: string; delayMs: number }> = [];
  for (const char of text) {
    // Occasionally insert a longer "thinking" pause
    const isThinkingPause = Math.random() < 0.05;
    const delay = isThinkingPause
      ? baseDelay + jitter * 3
      : baseDelay + Math.random() * jitter;
    sequence.push({ char, delayMs: delay });
  }
  return sequence;
}

/**
 * Generate a random mouse movement path (series of {x, y} coordinates).
 * Simulates a natural curved path from origin to destination.
 */
export function randomMouseMovement(
  viewportWidth: number,
  viewportHeight: number,
): Array<{ x: number; y: number; delayMs: number }> {
  const steps = 3 + Math.floor(Math.random() * 5);
  const path: Array<{ x: number; y: number; delayMs: number }> = [];

  let currentX = viewportWidth * (0.3 + Math.random() * 0.4);
  let currentY = viewportHeight * (0.3 + Math.random() * 0.4);

  for (let i = 0; i < steps; i++) {
    const targetX = viewportWidth * (0.2 + Math.random() * 0.6);
    const targetY = viewportHeight * (0.2 + Math.random() * 0.6);

    // Interpolate with slight acceleration
    const intermediateSteps = 2 + Math.floor(Math.random() * 3);
    for (let j = 1; j <= intermediateSteps; j++) {
      const t = j / intermediateSteps;
      const eased = t * t * (3 - 2 * t); // smoothstep
      currentX = currentX + (targetX - currentX) * eased * 0.5;
      currentY = currentY + (targetY - currentY) * eased * 0.5;

      path.push({
        x: Math.round(currentX),
        y: Math.round(currentY),
        delayMs: 10 + Math.floor(Math.random() * 30),
      });
    }
  }

  return path;
}

/**
 * Random pause between 1-3 seconds to simulate human reading/thinking.
 */
export function waitForHumanThinking(): Promise<void> {
  return humanDelay(1000, 3000);
}

/**
 * Generate a random "session fingerprint" (user agent tweaks, viewport sizes)
 * to reduce detection across multiple requests.
 */
export function generateSessionFingerprint(): {
  viewport: { width: number; height: number };
  userAgentTweak: string;
  acceptLanguage: string;
} {
  const viewports = [
    { width: 1366, height: 768 },
    { width: 1440, height: 900 },
    { width: 1536, height: 864 },
    { width: 1600, height: 900 },
    { width: 1920, height: 1080 },
    { width: 1280, height: 720 },
  ];

  const languages = [
    'en-US,en;q=0.9',
    'en-US,en;q=0.9,id;q=0.8',
    'en-GB,en;q=0.9',
    'en-US,en;q=0.9,de;q=0.7',
  ];

  return {
    viewport: viewports[Math.floor(Math.random() * viewports.length)],
    userAgentTweak: `Chrome/${115 + Math.floor(Math.random() * 10)}.0.${Math.floor(Math.random() * 9000)}.${Math.floor(Math.random() * 200)}`,
    acceptLanguage: languages[Math.floor(Math.random() * languages.length)],
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// §4. EXTRACTION MODULE
// ═══════════════════════════════════════════════════════════════════════════════

/** Options passed to the extraction function */
interface ExtractionConfig {
  databaseId: string;
  databaseName: string;
  keywords: string[];
}

/**
 * Extract search results from raw HTML/JSON content using regex patterns.
 *
 * This is resilient to page structure changes — if the primary extraction
 * fails, it falls back to a series of looser heuristics:
 *   1. Try database-specific patterns
 *   2. Try JSON API response parsing
 *   3. Fallback: brute-force regex scan for DOIs, titles, years
 */
export function extractResultsFromHtml(
  html: string,
  config: ExtractionConfig,
): RawSearchResult[] {
  const dbConfig = DATABASE_CONFIGS[config.databaseId];
  const results: RawSearchResult[] = [];

  if (!dbConfig || !html) {
    return results;
  }

  // ── Strategy 1: JSON API Response ─────────────────────────────────────────
  if (isJsonResponse(html)) {
    const jsonResults = extractFromJson(html, config);
    if (jsonResults.length > 0) return jsonResults;
  }

  // ── Strategy 2: Database-specific regex extraction ────────────────────────
  const patterns = dbConfig.patterns;

  // Extract individual result blocks
  const resultBlocks = html.match(patterns.resultBlock) || [];

  for (const block of resultBlocks) {
    const titleMatch = block.match(patterns.title);
    const authorsMatch = block.match(patterns.authors);
    const yearMatch = block.match(patterns.year);
    const doiMatch = block.match(patterns.doi);
    const abstractMatch = block.match(patterns.abstract);
    const journalMatch = block.match(patterns.journal);
    const citationsMatch = block.match(patterns.citations);
    const pdfMatch = block.match(patterns.pdfUrl);
    const oaMatch = block.match(patterns.openAccess);

    const title = titleMatch
      ? decodeHtmlEntities(titleMatch[1]?.trim() || '')
      : '';

    // Skip entries without titles
    if (!title || title.length < 5) continue;

    results.push({
      title,
      authors: authorsMatch ? decodeHtmlEntities(authorsMatch[1]?.trim() || '') : null,
      year: yearMatch ? parseInt(yearMatch[1], 10) : null,
      abstract: abstractMatch ? decodeHtmlEntities(stripHtmlTags(abstractMatch[1]?.trim() || '')) : null,
      journal: journalMatch ? decodeHtmlEntities(journalMatch[1]?.trim() || '') : null,
      doi: doiMatch ? doiMatch[1].trim() : null,
      pdfUrl: pdfMatch ? decodeHtmlEntities(pdfMatch[1]?.trim() || '') : null,
      citations: citationsMatch ? parseInt(citationsMatch[1], 10) : null,
      isOpenAccess: !!oaMatch,
    });
  }

  // ── Strategy 3: Fallback brute-force extraction ───────────────────────────
  if (results.length === 0) {
    return fallbackExtraction(html, config);
  }

  return results.slice(0, dbConfig.maxResultsPerPage * dbConfig.maxPages);
}

/**
 * Try to parse as JSON and extract structured results.
 */
function extractFromJson(
  jsonStr: string,
  config: ExtractionConfig,
): RawSearchResult[] {
  const results: RawSearchResult[] = [];

  try {
    const data = JSON.parse(jsonStr);

    // OpenAlex format
    if (data.results && Array.isArray(data.results)) {
      for (const work of data.results) {
        const authors = (work.authorships || [])
          .map((a: { author?: { display_name?: string } }) => a.author?.display_name)
          .filter(Boolean)
          .slice(0, 5)
          .join(', ');

        results.push({
          title: work.title || work.display_name || '',
          authors: authors || null,
          year: work.publication_year || null,
          abstract: work.abstract_inverted_index
            ? reconstructAbstract(work.abstract_inverted_index)
            : null,
          journal: work.primary_location?.source?.display_name || null,
          doi: work.doi?.replace('https://doi.org/', '') || null,
          pdfUrl: work.primary_location?.pdf_url || null,
          citations: work.cited_by_count || null,
          isOpenAccess: work.open_access?.is_oa || false,
        });
      }
    }

    // Semantic Scholar format
    if (data.data && Array.isArray(data.data)) {
      for (const paper of data.data) {
        const authors = (paper.authors || [])
          .map((a: { name?: string }) => a.name)
          .filter(Boolean)
          .join(', ');

        results.push({
          title: paper.title || '',
          authors: authors || null,
          year: paper.year || null,
          abstract: paper.abstract || null,
          journal: paper.journal?.name || null,
          doi: paper.externalIds?.DOI || null,
          pdfUrl: paper.openAccessPdf?.url || null,
          citations: paper.citationCount || null,
          isOpenAccess: paper.isOpenAccess || false,
        });
      }
    }

    // CrossRef format
    if (data.message?.items && Array.isArray(data.message.items)) {
      for (const item of data.message.items) {
        const authors = (item.author || [])
          .map((a: { given?: string; family?: string }) =>
            [a.given, a.family].filter(Boolean).join(' ')
          )
          .filter(Boolean)
          .join(', ');

        const yearPart = item.published?.['date-parts']?.[0]?.[0]
          || item.issued?.['date-parts']?.[0]?.[0]
          || null;

        results.push({
          title: (item.title || [''])[0] || '',
          authors: authors || null,
          year: yearPart ? parseInt(String(yearPart), 10) : null,
          abstract: item.abstract ? stripHtmlTags(item.abstract) : null,
          journal: (item['container-title'] || [''])[0] || null,
          doi: item.DOI || null,
          pdfUrl: item.link?.find((l: { 'content-type'?: string; URL?: string }) =>
            l['content-type']?.includes('pdf')
          )?.URL || null,
          citations: item['is-referenced-by-count'] || null,
          isOpenAccess: !!item.license,
        });
      }
    }

    // PubMed eSearch format — returns IDs only, needs fetch
    if (data.esearchresult?.idlist) {
      // PubMed needs a separate fetch for summaries; return empty and let
      // the caller handle it via the API route
      return results;
    }

    // CORE format
    if (data.results && Array.isArray(data.results)) {
      for (const item of data.results) {
        const authors = (item.authors || [])
          .map((a: { name?: string }) => a.name)
          .filter(Boolean)
          .join(', ');

        results.push({
          title: item.title || '',
          authors: authors || null,
          year: item.yearPublished ? parseInt(String(item.yearPublished), 10) : null,
          abstract: item.abstract || null,
          journal: item.publisher || null,
          doi: item.doi || null,
          pdfUrl: item.downloadUrl || null,
          citations: item.citationCount || null,
          isOpenAccess: item.isOa || false,
        });
      }
    }

    // BASE format
    if (data.response?.docs && Array.isArray(data.response.docs)) {
      for (const doc of data.response.docs) {
        results.push({
          title: doc.dctitle || '',
          authors: Array.isArray(doc.dccreator) ? doc.dccreator.join(', ') : doc.dccreator || null,
          year: doc.dcdate ? parseInt(String(doc.dcdate).substring(0, 4), 10) : null,
          abstract: doc.dcdescription || null,
          journal: doc.dcpublisher || null,
          doi: doc.dcdoi || null,
          pdfUrl: Array.isArray(doc.dclink)
            ? doc.dclink.find((l: string) => l.includes('.pdf'))
            : doc.dclink || null,
          citations: null,
          isOpenAccess: doc.oa === true || doc.oa === '1',
        });
      }
    }

  } catch {
    // JSON parse failed — not a valid JSON response
    return [];
  }

  // Filter out empty titles
  return results.filter(r => r.title && r.title.length >= 5);
}

/**
 * Fallback extraction when database-specific patterns fail.
 * Uses generic heuristics to find anything useful.
 */
function fallbackExtraction(
  html: string,
  config: ExtractionConfig,
): RawSearchResult[] {
  const results: RawSearchResult[] = [];

  // Try to find DOIs as anchors
  const doiPattern = /10\.\d{4,}\/[^\s"'<>]+/gi;
  const dois = html.match(doiPattern) || [];

  // Try to find titles in common HTML patterns
  const titlePatterns = [
    /<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi,
    /<a[^>]*class="[^"]*title[^"]*"[^>]*>([\s\S]*?)<\/a>/gi,
    /<cite[^>]*>([\s\S]*?)<\/cite>/gi,
    /<span[^>]*class="[^"]*title[^"]*"[^>]*>([\s\S]*?)<\/span>/gi,
  ];

  const years = html.match(/\b((?:19|20)\d{2})\b/g) || [];

  for (let i = 0; i < Math.min(dois.length, 50); i++) {
    const doi = dois[i].trim().replace(/[.,;:]+$/, '');
    const year = years[i] ? parseInt(years[i], 10) : null;

    // Try to find a nearby title
    let title = '';
    for (const pattern of titlePatterns) {
      pattern.lastIndex = 0;
      const matches = html.match(pattern) || [];
      if (matches[i]) {
        const contentMatch = matches[i].match(/>([\s\S]*?)<\//);
        if (contentMatch) {
          title = decodeHtmlEntities(stripHtmlTags(contentMatch[1])).trim();
          break;
        }
      }
    }

    if (title && title.length >= 10) {
      results.push({
        title,
        authors: null,
        year,
        abstract: null,
        journal: null,
        doi,
        pdfUrl: null,
        citations: null,
        isOpenAccess: false,
      });
    }
  }

  return results;
}

// ── Extraction Helpers ───────────────────────────────────────────────────────

/** Check if a response looks like JSON */
function isJsonResponse(text: string): boolean {
  const trimmed = text.trim();
  return (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
         (trimmed.startsWith('[') && trimmed.endsWith(']'));
}

/** Decode HTML entities (non-exhaustive but covers common ones) */
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num, 10)))
    .replace(/&nbsp;/g, ' ')
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&hellip;/g, '…')
    .replace(/<[^>]*>/g, '') // strip remaining tags
    .trim();
}

/** Strip all HTML tags from text */
function stripHtmlTags(text: string): string {
  return text.replace(/<[^>]*>/g, '').trim();
}

/** Reconstruct abstract from OpenAlex inverted index format */
function reconstructAbstract(
  index: Record<string, Array<{ position: number }>>
): string {
  const wordMap: Record<number, string> = {};
  for (const [word, positions] of Object.entries(index)) {
    for (const pos of positions) {
      wordMap[pos.position] = word;
    }
  }
  return Object.entries(wordMap)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([, w]) => w)
    .join(' ');
}

// ═══════════════════════════════════════════════════════════════════════════════
// §5. MAIN SuperBot CLASS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * SuperBot — The core orchestrator for academic reference search.
 *
 * Execution flow:
 *   1. init       → Validate config, setup session
 *   2. strategy   → One-shot Z.ai call for search strategy (with fallback)
 *   3. searching  → Loop through databases, call mini-service API
 *   4. scoring    → Score all results with custom algorithm
 *   5. downloading→ Download top PDFs (optional)
 *   6. uploading  → Upload to Telegram cold storage (optional)
 *   7. complete   → Return final scored results
 *
 * The actual browsing/playwright operations are delegated to a mini-service
 * HTTP API at `/api/bot/search` since Playwright can't run inside
 * Next.js serverless functions.
 */
export class SuperBot {
  private proxyConfig: BotProxyConfig | null;
  private abortController: AbortController | null = null;
  private fingerprint: ReturnType<typeof generateSessionFingerprint>;

  constructor(proxyConfig?: BotProxyConfig) {
    this.proxyConfig = proxyConfig ?? null;
    this.fingerprint = generateSessionFingerprint();
  }

  // ── Abort running operation ────────────────────────────────────────────────

  /** Cancel any in-progress search operation */
  abort(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  // ── Main Execution ─────────────────────────────────────────────────────────

  /**
   * Run the full SuperBot pipeline.
   *
   * @param config   - Search configuration
   * @param onProgress - Optional callback for real-time UI updates
   * @returns Sorted and scored search results
   */
  async run(
    config: BotRunConfig,
    onProgress?: (progress: BotProgress) => void,
  ): Promise<BotSearchResult[]> {
    this.abortController = new AbortController();
    const signal = this.abortController.signal;
    const startTime = Date.now();

    const report = (partial: Partial<BotProgress>): void => {
      onProgress?.({
        phase: 'init',
        currentDatabase: '',
        databasesSearched: [],
        totalDatabases: 0,
        resultsFound: 0,
        currentPercent: 0,
        message: '',
        startTime,
        ...partial,
      });
    };

    try {
      // ── Phase 1: Init ─────────────────────────────────────────────────────
      report({
        phase: 'init',
        currentPercent: 0,
        message: 'Initializing SuperBot engine...',
      });

      this.fingerprint = generateSessionFingerprint();
      await humanDelay(200, 500);

      if (signal.aborted) throw new DOMException('Aborted', 'AbortError');

      // ── Phase 2: Strategy ─────────────────────────────────────────────────
      report({
        phase: 'strategy',
        currentPercent: 5,
        message: 'Generating search strategy via AI...',
      });

      const strategy = await this.getSearchStrategy(config.topic);
      const allKeywords = [...new Set([...strategy.keywords, ...config.keywords])];

      report({
        phase: 'strategy',
        currentPercent: 10,
        message: `Strategy ready: ${allKeywords.length} keywords, ${strategy.criteria.yearFrom}–${strategy.criteria.yearTo}`,
      });

      // ── Phase 3: Searching ────────────────────────────────────────────────
      const databases = config.databases
        ? getDatabasesByIds(config.databases)
        : getEnabledDatabases();

      const totalDatabases = databases.length;
      if (totalDatabases === 0) {
        throw new Error('No databases available for searching');
      }

      const allRawResults: Array<RawSearchResult & { databaseId: string; databaseName: string }> = [];
      const databasesSearched: string[] = [];

      for (let i = 0; i < totalDatabases; i++) {
        if (signal.aborted) throw new DOMException('Aborted', 'AbortError');

        const db = databases[i];
        const progressPercent = 10 + Math.round(((i) / totalDatabases) * 50);

        report({
          phase: 'searching',
          currentDatabase: db.name,
          databasesSearched: [...databasesSearched],
          totalDatabases,
          resultsFound: allRawResults.length,
          currentPercent: progressPercent,
          message: `Searching ${db.name}... (${i + 1}/${totalDatabases})`,
        });

        // Build search query from keywords
        const query = allKeywords.slice(0, 5).join(' ');

        // Call mini-service API
        const results = await this.searchDatabase(
          db.id,
          db.name,
          query,
          config.maxResults,
          strategy.criteria,
          signal,
        );

        allRawResults.push(...results);
        databasesSearched.push(db.name);

        report({
          phase: 'searching',
          currentDatabase: db.name,
          databasesSearched: [...databasesSearched],
          totalDatabases,
          resultsFound: allRawResults.length,
          currentPercent: progressPercent,
          message: `${db.name}: found ${results.length} results. Total: ${allRawResults.length}`,
        });

        // Respect rate limits between databases
        if (i < totalDatabases - 1) {
          await humanDelay(db.rateLimitMs * 0.5, db.rateLimitMs);
        }
      }

      // ── Phase 4: Scoring ──────────────────────────────────────────────────
      report({
        phase: 'scoring',
        currentPercent: 65,
        message: `Scoring ${allRawResults.length} results...`,
      });

      // Convert raw results to BotSearchResult format
      const scoredResults: BotSearchResult[] = allRawResults.map((raw, idx) => ({
        id: `bot-${raw.databaseId}-${idx}`,
        databaseId: raw.databaseId,
        databaseName: raw.databaseName,
        title: raw.title,
        authors: raw.authors ?? '',
        year: raw.year,
        abstract: raw.abstract,
        journal: raw.journal,
        doi: raw.doi,
        pdfUrl: raw.pdfUrl,
        citations: raw.citations,
        isOpenAccess: raw.isOpenAccess,
        score: 0, // Will be set by scoreAndRank
        source: raw.databaseName,
      }));

      // Score, deduplicate, and rank
      const rankedResults = scoreAndRank(scoredResults, strategy);

      report({
        phase: 'scoring',
        currentPercent: 75,
        resultsFound: rankedResults.length,
        message: `Scored ${rankedResults.length} unique results. Top score: ${rankedResults[0]?.score ?? 0}`,
      });

      await humanDelay(300, 700);

      // ── Phase 5: Downloading (optional) ───────────────────────────────────
      if (config.autoDownload) {
        report({
          phase: 'downloading',
          currentPercent: 80,
          message: `Preparing to download top PDFs...`,
        });

        const downloadCandidates = selectForDownload(
          rankedResults,
          config.downloadLimit,
          config.minScoreThreshold,
        );

        for (let i = 0; i < downloadCandidates.length; i++) {
          if (signal.aborted) throw new DOMException('Aborted', 'AbortError');

          const result = downloadCandidates[i];
          const dlPercent = 80 + Math.round(((i + 1) / downloadCandidates.length) * 10);

          report({
            phase: 'downloading',
            currentPercent: dlPercent,
            message: `Downloading PDF ${i + 1}/${downloadCandidates.length}: ${result.title.substring(0, 60)}...`,
          });

          try {
            const pdfBuffer = await this.downloadPdf(result.pdfUrl!);
            if (pdfBuffer) {
              result.pdfUrl = `buffer://${result.id}`; // Mark as downloaded
            }
          } catch (err) {
            console.warn(`[SuperBot] Failed to download PDF for "${result.title}":`, err);
          }

          // Delay between downloads
          await humanDelay(1500, 3000);
        }
      }

      // ── Phase 6: Uploading (optional) ─────────────────────────────────────
      if (config.autoDownload && config.minScoreThreshold > 0) {
        report({
          phase: 'uploading',
          currentPercent: 92,
          message: 'Uploading PDFs to Telegram cold storage...',
        });

        // Upload logic is delegated to the caller or a separate process
        // since Telegram uploads are handled by the telegram-storage module
      }

      // ── Phase 7: Complete ─────────────────────────────────────────────────
      const elapsed = Date.now() - startTime;
      report({
        phase: 'complete',
        currentPercent: 100,
        databasesSearched,
        totalDatabases,
        resultsFound: rankedResults.length,
        message: `Complete! ${rankedResults.length} results in ${(elapsed / 1000).toFixed(1)}s`,
      });

      return rankedResults;

    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        report({
          phase: 'error',
          currentPercent: 0,
          message: 'Search cancelled by user.',
        });
        return [];
      }

      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[SuperBot] Run error:', errorMessage);

      report({
        phase: 'error',
        currentPercent: 0,
        message: `Error: ${errorMessage}`,
      });

      throw error;
    } finally {
      this.abortController = null;
    }
  }

  // ── Search a Single Database ───────────────────────────────────────────────

  /**
   * Search a single database via the mini-service API.
   * Falls back to direct API calls for JSON-based databases.
   */
  private async searchDatabase(
    databaseId: string,
    databaseName: string,
    query: string,
    maxResults: number,
    criteria: BotSearchStrategy['criteria'],
    signal: AbortSignal,
  ): Promise<Array<RawSearchResult & { databaseId: string; databaseName: string }>> {
    const dbConfig = DATABASE_CONFIGS[databaseId];
    if (!dbConfig) return [];

    // Try mini-service first (for HTML-scraping databases like Google Scholar)
    if (dbConfig.requiresProxy || dbConfig.searchUrl.includes('scholar.google.com')) {
      try {
        return await this.searchViaMiniService(
          databaseId,
          databaseName,
          query,
          maxResults,
          criteria,
          signal,
        );
      } catch (err) {
        console.warn(`[SuperBot] Mini-service failed for ${databaseName}, trying direct API:`, err);
      }
    }

    // Direct API call for JSON-based databases
    try {
      return await this.searchViaDirectApi(
        databaseId,
        databaseName,
        query,
        maxResults,
        criteria,
        signal,
      );
    } catch (err) {
      console.error(`[SuperBot] Direct API failed for ${databaseName}:`, err);
      return [];
    }
  }

  /**
   * Search via the mini-service bot API (Playwright-based scraping).
   * Calls `/api/bot/search` which proxies to the mini-service.
   */
  private async searchViaMiniService(
    databaseId: string,
    databaseName: string,
    query: string,
    maxResults: number,
    criteria: BotSearchStrategy['criteria'],
    signal: AbortSignal,
  ): Promise<Array<RawSearchResult & { databaseId: string; databaseName: string }>> {
    const searchUrl = buildSearchUrl(databaseId, query, maxResults, criteria);

    const response = await fetch('/api/bot/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        databaseId,
        searchUrl,
        maxResults,
        headers: DATABASE_CONFIGS[databaseId]?.headers || {},
        encoding: DATABASE_CONFIGS[databaseId]?.encoding || 'utf-8',
        proxy: this.proxyConfig,
        fingerprint: this.fingerprint,
      }),
      signal,
    });

    if (!response.ok) {
      throw new Error(`Mini-service returned ${response.status}`);
    }

    const data: BotSearchApiResponse = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Mini-service search failed');
    }

    return data.results.map(r => ({
      ...r,
      databaseId,
      databaseName,
    }));
  }

  /**
   * Search via direct API call (for JSON-based databases like OpenAlex, CrossRef, etc.)
   */
  private async searchViaDirectApi(
    databaseId: string,
    databaseName: string,
    query: string,
    maxResults: number,
    criteria: BotSearchStrategy['criteria'],
    signal: AbortSignal,
  ): Promise<Array<RawSearchResult & { databaseId: string; databaseName: string }>> {
    const dbConfig = DATABASE_CONFIGS[databaseId];
    if (!dbConfig) return [];

    const searchUrl = buildSearchUrl(databaseId, query, maxResults, criteria);

    const response = await fetch(searchUrl, {
      headers: {
        ...dbConfig.headers,
        ...(this.proxyConfig ? { 'X-Proxy': JSON.stringify(this.proxyConfig) } : {}),
      },
      signal,
    });

    if (!response.ok) {
      throw new Error(`API returned ${response.status} for ${databaseName}`);
    }

    const text = await response.text();
    const extracted = extractFromJson(text, {
      databaseId,
      databaseName,
      keywords: [query],
    });

    return extracted.map(r => ({
      ...r,
      databaseId,
      databaseName,
    }));
  }

  // ── PDF Download ───────────────────────────────────────────────────────────

  /**
   * Download a PDF from a URL with human-like delays and proper headers.
   */
  async downloadPdf(url: string): Promise<Buffer | null> {
    try {
      // Add a small thinking delay before download
      await waitForHumanThinking();

      const response = await fetch(url, {
        headers: {
          'User-Agent': `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) ${this.fingerprint.userAgentTweak} Safari/537.36`,
          'Accept': 'application/pdf,*/*',
          'Accept-Language': this.fingerprint.acceptLanguage,
          'Referer': new URL(url).origin + '/',
        },
        signal: AbortSignal.timeout(120_000),
        redirect: 'follow',
      });

      if (!response.ok) {
        console.warn(`[SuperBot] PDF download failed: ${response.status}`);
        return null;
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('pdf') && !contentType.includes('octet-stream')) {
        console.warn(`[SuperBot] Unexpected content type for PDF: ${contentType}`);
        // Continue anyway — some servers misreport content type
      }

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      console.error(`[SuperBot] PDF download error for ${url}:`, error);
      return null;
    }
  }

  // ── Upload PDFs to Telegram ────────────────────────────────────────────────

  /**
   * Upload a single PDF buffer to Telegram cold storage.
   * Delegates to the telegram-storage module.
   */
  async uploadPdfToTelegram(
    buffer: Buffer,
    fileName: string,
    caption?: string,
  ): Promise<{ success: boolean; fileId?: string; error?: string }> {
    try {
      const result = await uploadToTelegram(buffer, fileName, caption);
      return {
        success: result.success,
        fileId: result.fileId ?? undefined,
        error: result.error,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return { success: false, error: msg };
    }
  }

  // ── Public Utility Methods ─────────────────────────────────────────────────

  /**
   * Get the current session fingerprint.
   */
  getSessionFingerprint(): ReturnType<typeof generateSessionFingerprint> {
    return this.fingerprint;
  }

  /**
   * Get the proxy configuration (if set).
   */
  getProxyConfig(): BotProxyConfig | null {
    return this.proxyConfig;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// §6. Z.AI STRATEGY INTEGRATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Build a search URL from a database config with query and criteria.
 */
function buildSearchUrl(
  databaseId: string,
  query: string,
  maxResults: number,
  criteria: BotSearchStrategy['criteria'],
): string {
  const db = DATABASE_CONFIGS[databaseId];
  if (!db) return '';

  return db.searchUrl
    .replace('{query}', encodeURIComponent(query))
    .replace('{count}', String(Math.min(maxResults, db.maxResultsPerPage)))
    .replace('{yearFrom}', String(criteria.yearFrom))
    .replace('{yearTo}', String(criteria.yearTo));
}

// ── Module-level singleton (optional, for convenience) ────────────────────────

let _botInstance: SuperBot | null = null;

/**
 * Get a shared SuperBot instance (singleton pattern).
 * Pass a proxy config only on first call; subsequent calls reuse the instance.
 */
export function getSuperBot(proxyConfig?: BotProxyConfig): SuperBot {
  if (!_botInstance) {
    _botInstance = new SuperBot(proxyConfig);
  }
  return _botInstance;
}

/**
 * Create a fresh SuperBot instance (bypasses singleton).
 */
export function createSuperBot(proxyConfig?: BotProxyConfig): SuperBot {
  return new SuperBot(proxyConfig);
}
