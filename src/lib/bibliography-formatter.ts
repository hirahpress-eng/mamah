/**
 * Bibliography Formatter — Pure APA 7th Edition formatting
 *
 * Formats REAL reference data into APA 7 bibliography entries WITHOUT using AI.
 * Pure string formatting from structured data.
 */

import type { RealReference } from './reference-search';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Format a single reference in APA 7th edition style.
 *
 * Output pattern:
 *   Authors, A. B., & Authors, C. D. (Year). Title. *Journal*, *Volume*(Issue), Pages. DOI
 */
export function formatAPA7Reference(ref: RealReference): string {
  const authors = formatAuthorsAPA(ref.authors);
  const year = ref.year ? `(${ref.year}).` : '(n.d.).';
  const title = ref.title;
  const journalPart = formatJournalPart(ref);
  const doiPart = ref.doi ? ` ${ref.doi}` : '';

  return `${authors} ${year} ${title}${journalPart}${doiPart}`.trim();
}

/**
 * Generate a full bibliography from real references (APA 7 style, no numbering).
 * Entries are sorted alphabetically by first author's last name.
 */
export function formatBibliography(references: RealReference[]): string {
  if (!references || references.length === 0) return '';

  const sorted = [...references].sort((a, b) => {
    const aAuthor = a.authors?.split(',')[0]?.trim() || '';
    const bAuthor = b.authors?.split(',')[0]?.trim() || '';
    return aAuthor.localeCompare(bAuthor, undefined, { sensitivity: 'base' });
  });

  return sorted
    .map((ref) => {
      return formatAPA7Reference(ref);
    })
    .join('\n\n');
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Format author string in APA style.
 * Assumes input is already roughly in "Last, F. M., Last, F. M." format.
 * Normalises whitespace and ensures proper spacing.
 */
function formatAuthorsAPA(authorsStr: string | undefined): string {
  if (!authorsStr) return 'Unknown Author';

  // Normalise whitespace
  let formatted = authorsStr.replace(/\s+/g, ' ').trim();

  // If there are 3+ authors, keep all (APA 7 lists up to 20 authors)
  // If the string looks like it has multiple authors separated by commas,
  // ensure proper "Last, F. M." spacing

  // Ensure period after single initials (e.g., "Smith, J" → "Smith, J.")
  formatted = formatted.replace(
    /,\s*([A-Z])(?:\s|,|$)/g,
    ', $1.',
  );

  return formatted;
}

/**
 * Build the journal/volume/issue/pages portion of an APA reference.
 */
function formatJournalPart(ref: RealReference): string {
  if (!ref.journal) return '';

  let parts = ` *${ref.journal}*`;

  if (ref.volume) {
    parts += `, *${ref.volume}*`;
  }

  if (ref.issue) {
    parts += `(${ref.issue})`;
  }

  if (ref.pages) {
    parts += `, ${ref.pages}`;
  }

  parts += '.';

  return parts;
}
