import type { GeneratedArticle } from '@/store/article-store';

/**
 * Section label mapping for markdown headings.
 */
const SECTION_LABELS: Record<string, string> = {
  abstract: 'Abstract',
  introduction: 'Introduction',
  literature_review: 'Literature Review',
  method: 'Methodology',
  results: 'Results',
  discussion: 'Discussion',
  conclusion: 'Conclusion',
  bibliography: 'Bibliography',
};

/**
 * Build a Markdown string from a GeneratedArticle with proper formatting:
 * - H1 title
 * - Keyword badges paragraph
 * - Horizontal rule separator
 * - H2 section headings
 * - Abstract in italic
 * - Body text with proper spacing
 * - References as an ordered list with APA-style formatting
 */
export function buildMarkdown(article: GeneratedArticle): string {
  const lines: string[] = [];

  // ── Title ──
  lines.push(`# ${article.title}`);
  lines.push('');

  // ── Keywords ──
  if (article.keywords.length > 0) {
    lines.push(`**Keywords:** ${article.keywords.map((kw) => `\`${kw}\``).join('  ')}`);
    lines.push('');
  }

  // ── Word count ──
  lines.push(`*Word Count: ${article.totalWordCount.toLocaleString()}*`);
  lines.push('');

  // ── Separator ──
  lines.push('---');
  lines.push('');

  // ── Sections ──
  for (const section of article.sections) {
    const label = SECTION_LABELS[section.type] || section.type;

    lines.push(`## ${label}`);
    lines.push('');

    if (section.type === 'abstract') {
      // Render abstract in italic
      const contentLines = section.content.trim().split('\n');
      for (const line of contentLines) {
        lines.push(`> ${line}`);
      }
    } else {
      lines.push(section.content.trim());
    }

    lines.push('');
    lines.push(`*Section word count: ${section.wordCount.toLocaleString()}*`);
    lines.push('');
  }

  // ── References ──
  if (article.references.length > 0) {
    lines.push('## References');
    lines.push('');

    for (let i = 0; i < article.references.length; i++) {
      const ref = article.references[i];
      const parts: string[] = [];

      parts.push(ref.authors);
      parts.push(`(${ref.year}).`);
      parts.push(ref.title);

      if (ref.journal) {
        let journalPart = ref.journal;
        if (ref.volume) journalPart += `, ${ref.volume}`;
        if (ref.issue) journalPart += `(${ref.issue})`;
        if (ref.pages) journalPart += `, ${ref.pages}`;
        journalPart += '.';
        parts.push(journalPart);
      } else {
        parts.push('.');
      }

      if (ref.doi) {
        parts.push(`[https://doi.org/${ref.doi}](https://doi.org/${ref.doi})`);
      }

      lines.push(`${i + 1}. ${parts.join(' ')}`);
      lines.push('');
    }
  }

  return lines.join('\n').trim();
}

/**
 * Export a GeneratedArticle as a downloadable .md file.
 * Builds a Markdown string and triggers a browser download via Blob + URL.createObjectURL.
 */
export function exportToMarkdown(article: GeneratedArticle): void {
  const markdown = buildMarkdown(article);

  // Build filename: {sanitised_title}_article.md
  const sanitisedTitle = article.title
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 60)
    .toLowerCase();
  const filename = `${sanitisedTitle}_article.md`;

  // Trigger download via Blob + URL.createObjectURL + click trick
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
