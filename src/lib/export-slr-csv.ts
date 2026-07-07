import type { Reference } from '@/store/article-store';

/**
 * Export references to CSV format for Systematic Literature Review (SLR) documentation.
 * Produces a CSV with columns standard for PRISMA-style screening tables.
 */
export function exportSlrCsv(
  references: Reference[],
  options?: {
    filename?: string;
    includeAbstract?: boolean;
  }
) {
  const {
    filename = 'slr-references',
    includeAbstract = true,
  } = options || {};

  // Filter selected references only, fallback to all if none selected
  const selectedRefs = references.filter((r) => r.isSelected);
  const refsToExport = selectedRefs.length > 0 ? selectedRefs : references;

  if (refsToExport.length === 0) {
    throw new Error('Tidak ada referensi untuk diekspor');
  }

  // SLR CSV columns (PRISMA-style)
  const columns = [
    'No',
    'Judul',
    'Penulis',
    'Tahun',
    'Jurnal',
    'DOI',
    'Volume',
    'Issue',
    'Halaman',
    'Tipe',
    'Skor Relevansi',
    'Kata Kunci',
    'Sumber',
    'Open Access',
    'Citation Count',
    ...(includeAbstract ? ['Abstrak'] : []),
  ];

  // Escape CSV field
  const esc = (val: string | number | boolean | null | undefined): string => {
    if (val === null || val === undefined) return '';
    const s = String(val);
    // If contains comma, quote, or newline — wrap in quotes and double-up any internal quotes
    if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  // Build rows
  const rows = refsToExport.map((ref, index) => {
    const base: string[] = [
      esc(index + 1),
      esc(ref.title),
      esc(ref.authors),
      esc(ref.year),
      esc(ref.journal),
      esc(ref.doi),
      esc(ref.volume),
      esc(ref.issue),
      esc(ref.pages),
      esc(ref.refType),
      esc(ref.relevanceScore),
      esc(ref.keywords?.join('; ')),
      esc(ref.source),
      esc(ref.is_open_access ? 'Ya' : 'Tidak'),
      esc(ref.citation_count),
    ];

    if (includeAbstract) {
      base.push(esc(ref.abstract));
    }

    return base.join(',');
  });

  // Add BOM for Excel compatibility with UTF-8
  const bom = '\uFEFF';
  const csv = bom + [columns.join(','), ...rows].join('\n');

  // Download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}-${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}