import { NextResponse } from 'next/server';

/**
 * POST /api/export/csv
 * Export references to CSV format for SLR (Systematic Literature Review)
 *
 * Request body:
 *   { references: Reference[] }
 *
 * Returns: CSV file download with standard SLR columns
 */

interface CsvReference {
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
  abstract?: string;
  keywords?: string[];
  relevanceScore?: number;
  source?: string;
  citation_count?: number;
  is_open_access?: boolean;
}

function escapeCsvField(field: string | number | undefined | null): string {
  if (field === null || field === undefined) return '';
  const str = String(field);
  // If field contains comma, quote, or newline, wrap in quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCsvRow(row: Record<string, string | number | undefined | null>): string {
  return Object.values(row).map(escapeCsvField).join(',');
}

export const maxDuration = 300;
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const references: CsvReference[] = body.references;

    if (!Array.isArray(references) || references.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Tidak ada referensi untuk diexport' },
        { status: 400 }
      );
    }

    // SLR-standard CSV columns
    const headers = [
      'No',
      'Penulis',
      'Tahun',
      'Judul',
      'Jurnal',
      'Volume',
      'Issue',
      'Halaman',
      'DOI',
      'Tipe',
      'Sumber Database',
      'Skor Relevansi',
      'Jumlah Sitasi',
      'Open Access',
      'Kata Kunci',
      'Abstrak',
      'Status Inklusi',
      'Catatan',
    ];

    const rows = references.map((ref, index) => ({
      No: index + 1,
      Penulis: ref.authors || '',
      Tahun: ref.year || '',
      Judul: ref.title || '',
      Jurnal: ref.journal || '',
      Volume: ref.volume || '',
      Issue: ref.issue || '',
      Halaman: ref.pages || '',
      DOI: ref.doi || '',
      Tipe: ref.refType || '',
      'Sumber Database': ref.source || '',
      'Skor Relevansi': ref.relevanceScore ?? '',
      'Jumlah Sitasi': ref.citation_count ?? '',
      'Open Access': ref.is_open_access ? 'Ya' : 'Tidak',
      'Kata Kunci': (ref.keywords || []).join('; '),
      Abstrak: ref.abstract || '',
      'Status Inklusi': '',  // Empty — user fills this in Excel
      Catatan: '',           // Empty — user fills this in Excel
    }));

    // Build CSV content with BOM for Excel UTF-8 compatibility
    const bom = '\uFEFF';
    const csvContent = [
      toCsvRow(Object.fromEntries(headers.map(h => [h, h]))),
      ...rows.map(toCsvRow),
    ].join('\n');

    const filename = `referensi-slr-${new Date().toISOString().slice(0, 10)}.csv`;

    return new NextResponse(bom + csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('[CSV Export]', error);
    return NextResponse.json(
      { success: false, error: 'Gagal membuat file CSV' },
      { status: 500 }
    );
  }
}