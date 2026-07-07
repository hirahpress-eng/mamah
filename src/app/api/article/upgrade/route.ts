import { generateWithEngine, DEFAULT_ENGINE, type AIEngineId } from '@/lib/ai-engine';
import { AI_ENGINES } from '@/lib/ai-engine-config';
import { formatBibliography } from '@/lib/bibliography-formatter';

export const maxDuration = 300;

// ─── Types ─────────────────────────────────────────────────────────────────────

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
}

interface ArticleSection {
  type: string;
  content: string;
  wordCount?: number;
}

// ─── CONSILIUM PROFESSORUM System Prompt ───────────────────────────────────────

const CONSILIUM_SYSTEM_PROMPT = `[SYSTEM OVERRIDE: CONSILIUM PROFESSORUM MODE]

You are a consortium of 20 world-class professors from top universities (Harvard, Oxford, Cambridge, MIT, Stanford). Your collective expertise spans all academic disciplines.

Your task is to rewrite this article section to the highest international standard for a Scopus Q1 journal. The text must be in formal British English academic prose, plagiarism-free, and pass AI detection. Write with the precision and depth of a senior professor.

CRITICAL RULES:
1. Maintain ALL original citations in APA 7 format (Author, Year)
2. Do NOT add new references not in the original text
3. Preserve the same approximate word count (±15%)
4. Use British English spelling exclusively
5. Return ONLY the rewritten section text — no preamble, no commentary, no markdown code fences
6. The output must be SUBSTANTIALLY DIFFERENT from the input — restructure at least 30% of sentences
7. Integrate parenthetical citations into the narrative flow
8. Use sophisticated academic transitions: whilst, moreover, furthermore, nevertheless, notably, significantly
9. Apply hedging language where appropriate: may, might, suggests, appears to, tends to
10. Ensure each paragraph has a clear topic sentence and logical flow`;

// ─── Retry Logic ────────────────────────────────────────────────────────────────

const FALLBACK_PATTERN = /all ai engines are currently unavailable/i;
const RETRY_DELAYS = [3000, 6000, 12000];
const MAX_SECTION_RETRIES = 3;

function countWords(text: string): number {
  return text.split(/\s+/).filter((w) => w.length > 0).length;
}

function isContentValid(content: string): boolean {
  if (!content || content.trim().length === 0) return false;
  if (FALLBACK_PATTERN.test(content)) return false;
  if (countWords(content) < 100) return false;
  return true;
}

async function upgradeSectionWithRetry(
  sectionName: string,
  engine: AIEngineId,
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  for (let attempt = 1; attempt <= MAX_SECTION_RETRIES; attempt++) {
    const result = (await generateWithEngine(engine, systemPrompt, userPrompt, { maxTokens: 16000 })) || '';

    if (isContentValid(result)) {
      console.log(
        `[article-upgrade] ${sectionName} upgraded: ${result.length} chars, ${countWords(result)} words`,
      );
      return result;
    }

    if (attempt < MAX_SECTION_RETRIES) {
      const delay = RETRY_DELAYS[attempt - 1];
      console.log(`[article-upgrade] ${sectionName} attempt ${attempt} insufficient, retrying in ${delay / 1000}s...`);
      await new Promise<void>((r) => setTimeout(r, delay));
    } else {
      console.error(
        `[article-upgrade] ${sectionName} failed after ${MAX_SECTION_RETRIES} attempts`,
      );
    }
  }

  return '';
}

// ─── Section type display names ────────────────────────────────────────────────

const SECTION_DISPLAY_NAMES: Record<string, string> = {
  abstract: 'Abstract',
  introduction: 'Introduction',
  literature_review: 'Literature Review',
  method: 'Methods',
  results: 'Results',
  discussion: 'Discussion',
  conclusion: 'Conclusion',
  bibliography: 'Bibliography',
};

const UPGRADE_SECTION_STEPS = [
  'Abstract',
  'Introduction',
  'Literature Review',
  'Methodology',
  'Results',
  'Discussion',
  'Conclusion',
  'Bibliography',
];

// ─── POST: Upgrade article sections synchronously ──────────────────────────────

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { article, engineId } = body;

    if (!article?.title || !article?.sections || !Array.isArray(article.sections)) {
      return Response.json(
        { success: false, error: 'Missing required fields: article.title and article.sections' },
        { status: 400 },
      );
    }

    const engine: AIEngineId = AI_ENGINES.some(e => e.id === engineId) ? engineId : DEFAULT_ENGINE;
    const keywords = article.keywords || [];
    const title = article.title;
    const refs: Reference[] = article.references || [];

    console.log(`[article-upgrade] Starting upgrade for "${title}"`);

    // Build reference list for inclusion in prompts
    const refList = refs
      .slice(0, 50)
      .map((r) => {
        const year = typeof r.year === 'number' ? r.year : (parseInt(String(r.year)) || 0);
        const doi = r.doi ? (r.doi.startsWith('http') ? r.doi : `https://doi.org/${r.doi}`) : '';
        return `${r.authors} (${year}). ${r.title}. ${r.journal || ''}${r.volume ? `, ${r.volume}` : ''}${r.issue ? `(${r.issue})` : ''}${r.pages ? `, ${r.pages}` : ''}.${doi ? ` ${doi}` : ''}`;
      })
      .join('\n');

    const refSuffix = refList ? `\n\nReferences available:\n${refList}` : '';

    // Build a map of original sections by type
    const sectionMap = new Map<string, ArticleSection>();
    for (const section of article.sections) {
      sectionMap.set(section.type, section);
    }

    // Upgrade sections SEQUENTIALLY
    let sectionsUpgraded = 0;
    let sectionsFailed = 0;
    const upgradedSections: ArticleSection[] = [];

    const UPGRADE_SECTION_TYPES = [
      'abstract', 'introduction', 'literature_review',
      'method', 'results', 'discussion', 'conclusion',
    ];

    for (let i = 0; i < UPGRADE_SECTION_TYPES.length; i++) {
      const sectionType = UPGRADE_SECTION_TYPES[i];
      const original = sectionMap.get(sectionType);
      const displayName = SECTION_DISPLAY_NAMES[sectionType] || sectionType;

      if (!original || !original.content) {
        console.log(`[article-upgrade] Skipping ${sectionType}: no original content`);
        upgradedSections.push({
          type: sectionType,
          content: original?.content || '',
          wordCount: original?.wordCount || 0,
        });
        continue;
      }

      try {
        const userPrompt = `Here is the current version of the ${displayName}. Rewrite it to CONSILIUM PROFESSORUM Scopus Q1 standard. Keep the same topic, references, and research questions, but dramatically improve the quality, depth, citation synthesis, and academic rigour. The section must be written in formal British English.

Current ${displayName}:
${original.content}${refSuffix}`;

        const upgradedContent = await upgradeSectionWithRetry(
          displayName,
          engine,
          CONSILIUM_SYSTEM_PROMPT,
          userPrompt,
        );

        if (isContentValid(upgradedContent)) {
          upgradedSections.push({
            type: sectionType,
            content: upgradedContent,
            wordCount: countWords(upgradedContent),
          });
          sectionsUpgraded++;
        } else {
          // All retries failed — keep original content
          console.log(`[article-upgrade] Keeping original content for ${displayName}`);
          upgradedSections.push({
            type: sectionType,
            content: original.content,
            wordCount: original.wordCount || countWords(original.content),
          });
          sectionsFailed++;
        }
      } catch (sectionError) {
        console.error(`[article-upgrade] Error upgrading ${displayName}:`, sectionError);
        upgradedSections.push({
          type: sectionType,
          content: original.content,
          wordCount: original.wordCount || countWords(original.content),
        });
        sectionsFailed++;
      }

      // Brief delay between sections to avoid rate limiting
      if (i < UPGRADE_SECTION_TYPES.length - 1) {
        await new Promise<void>((r) => setTimeout(r, 2000));
      }
    }

    // Bibliography: use REAL references — do NOT regenerate with AI
    const originalBib = sectionMap.get('bibliography');
    let bibliographyContent: string;
    if (refs.length > 0) {
      const realRefsForBib = refs.slice(0, 50).map((r, i) => ({
        id: r.id || `ref_${i}`,
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
        relevanceScore: r.relevanceScore || 0,
        refType: r.refType || 'Journal Article',
        isSelected: true,
        keywords: r.keywords || [],
      }));
      bibliographyContent = formatBibliography(realRefsForBib);
    } else {
      bibliographyContent = originalBib?.content || '';
    }

    upgradedSections.push({
      type: 'bibliography',
      content: bibliographyContent,
      wordCount: countWords(bibliographyContent),
    });

    // Compute total word count
    const totalWordCount = upgradedSections
      .filter((s) => s.type !== 'bibliography')
      .reduce((sum, s) => sum + (s.wordCount || 0), 0);

    const upgradedArticle = {
      title,
      keywords,
      sections: upgradedSections,
      references: refs,
      totalWordCount,
      isPolished: false,
    };

    console.log(`[article-upgrade] Upgrade complete. Upgraded: ${sectionsUpgraded}, Failed: ${sectionsFailed}, Total words: ${totalWordCount}`);

    return Response.json({
      success: true,
      result: {
        article: upgradedArticle,
        sectionsUpgraded,
        sectionsFailed,
      },
    });
  } catch (error: any) {
    console.error('[article-upgrade] POST error:', error);
    return Response.json(
      { success: false, error: error?.message || 'Internal server error' },
      { status: 500 },
    );
  }
}
