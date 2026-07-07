import type { GeneratedArticle, ArticleSection } from '@/store/article-store';

// ─── Types ──────────────────────────────────────────────────────────────

export interface SectionBreakdownItem {
  type: string;
  label: string;
  words: number;
  color: string;
}

export interface ReferenceBreakdownItem {
  type: string;
  count: number;
  label: string;
  color: string;
}

export interface ArticleStats {
  totalWords: number;
  sectionBreakdown: SectionBreakdownItem[];
  referenceCount: number;
  referenceBreakdown: ReferenceBreakdownItem[];
  readabilityScore: number; // 0-100
  citationDensity: number; // citations per 1000 words
  publicationReadiness: number; // 0-100
}

// ─── Constants ──────────────────────────────────────────────────────────

const SECTION_META: { type: ArticleSection['type']; label: string; color: string }[] = [
  { type: 'abstract', label: 'Abstract', color: '#059669' },
  { type: 'introduction', label: 'Introduction', color: '#10b981' },
  { type: 'literature_review', label: 'Lit. Review', color: '#1db88e' },
  { type: 'method', label: 'Method', color: '#34d399' },
  { type: 'results', label: 'Results', color: '#6ee7b7' },
  { type: 'discussion', label: 'Discussion', color: '#a7f3d0' },
  { type: 'conclusion', label: 'Conclusion', color: '#a7f3d0' },
  { type: 'bibliography', label: 'Bibliography', color: '#d1fae5' },
];

const REF_TYPE_META: { type: string; label: string; color: string }[] = [
  { type: 'journal_scopus', label: 'Scopus', color: '#059669' },
  { type: 'journal_sinta', label: 'SINTA', color: '#10b981' },
  { type: 'book', label: 'Books', color: '#34d399' },
  { type: 'grand_theory', label: 'Grand Theory', color: '#6ee7b7' },
  { type: 'middle_theory', label: 'Middle Theory', color: '#a7f3d0' },
  { type: 'applied_theory', label: 'Applied Theory', color: '#d1fae5' },
];

// ─── Helpers ────────────────────────────────────────────────────────────

function countWords(text: string): number {
  if (!text || !text.trim()) return 0;
  return text.trim().split(/\s+/).length;
}

/** Count citation patterns like (Author, Year) or (Author et al., Year) */
function countCitations(text: string): number {
  if (!text) return 0;
  // Match patterns like (Something, YYYY) — covers APA style citations
  const pattern = /\([^)]*,\s*\d{4}\)/g;
  const matches = text.match(pattern);
  return matches ? matches.length : 0;
}

// ─── Main Computation ──────────────────────────────────────────────────

export function computeArticleStats(article: GeneratedArticle): ArticleStats {
  // Total words — use stored totalWordCount or compute from sections
  const totalWords =
    article.totalWordCount > 0
      ? article.totalWordCount
      : article.sections.reduce((sum, s) => sum + countWords(s.content), 0);

  // Section breakdown
  const sectionBreakdown: SectionBreakdownItem[] = SECTION_META.map((meta) => {
    const section = article.sections.find((s) => s.type === meta.type);
    const words = section ? (section.wordCount > 0 ? section.wordCount : countWords(section.content)) : 0;
    return {
      type: meta.type,
      label: meta.label,
      words,
      color: meta.color,
    };
  });

  // Reference count & breakdown
  const referenceCount = article.references.length;
  const refTypeCounts = new Map<string, number>();
  for (const ref of article.references) {
    const t = ref.refType || 'journal_scopus';
    refTypeCounts.set(t, (refTypeCounts.get(t) || 0) + 1);
  }
  const referenceBreakdown: ReferenceBreakdownItem[] = REF_TYPE_META.map((meta) => ({
    type: meta.type,
    label: meta.label,
    count: refTypeCounts.get(meta.type) || 0,
    color: meta.color,
  })).filter((item) => item.count > 0);

  // ── Readability Score (0-100) ──
  let readabilityScore = 0;

  // Word count adequacy: +30 if at/near target 7750, proportional below
  // Treat 7750 as a TARGET to achieve, not just a ceiling
  // Score peaks when word count is close to 7750 (between 80-110%)
  const wordRatio = totalWords / 7750;
  if (wordRatio >= 0.9 && wordRatio <= 1.1) {
    readabilityScore += 30; // On target
  } else if (wordRatio >= 0.8) {
    readabilityScore += 25; // Close to target
  } else if (wordRatio >= 0.6) {
    readabilityScore += 18; // Below target but substantial
  } else if (wordRatio >= 0.4) {
    readabilityScore += 10; // Below target
  } else {
    readabilityScore += (wordRatio / 0.4) * 10;
  }

  // Section completeness: +10 per section that has content (max 70 for 7 content sections)
  const sectionsWithContent = article.sections.filter((s) => s.content && s.content.trim().length > 0).length;
  readabilityScore += Math.min(70, sectionsWithContent * 10);

  // Reference count: +15 if >= 20
  readabilityScore += Math.min(15, (referenceCount / 20) * 15);

  // Reference type variety: +15 if 3+ types
  const uniqueRefTypes = new Set(article.references.map((r) => r.refType)).size;
  readabilityScore += Math.min(15, (uniqueRefTypes / 3) * 15);

  readabilityScore = Math.round(Math.min(100, readabilityScore));

  // ── Citation Density ──
  const allContent = article.sections.map((s) => s.content).join(' ');
  const totalCitations = countCitations(allContent);
  const citationDensity = totalWords > 0 ? Math.round((totalCitations / (totalWords / 1000)) * 10) / 10 : 0;

  // ── Publication Readiness (0-100) ──
  const wordScore = Math.min(1, totalWords / 7750) * 100;
  const refScore = Math.min(1, referenceCount / 30) * 100;
  const sectionCompleteness = sectionsWithContent / 7;
  const sectionScore = sectionCompleteness * 100;
  const publicationReadiness = Math.round(
    (readabilityScore + wordScore + refScore + sectionScore) / 4
  );

  return {
    totalWords,
    sectionBreakdown,
    referenceCount,
    referenceBreakdown,
    readabilityScore,
    citationDensity,
    publicationReadiness,
  };
}
