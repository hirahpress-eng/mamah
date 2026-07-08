import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit';

// ── Types ────────────────────────────────────────────────────────────────────

interface ArticleReference {
  id: string;
  authors: string;
  title: string;
  year: number;
  journal?: string;
  doi?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  refType?: string;
  isSelected?: boolean;
  abstract?: string;
  keywords?: string[];
  relevanceScore?: number;
}

interface ArticleSection {
  type: 'abstract' | 'introduction' | 'literature_review' | 'method' | 'results' | 'discussion' | 'conclusion';
  content: string;
  wordCount: number;
}

interface ExportArticle {
  title: string;
  keywords: string[];
  sections: ArticleSection[];
  references: ArticleReference[];
  totalWordCount: number;
  isPolished: boolean;
}

// ── Section label mapping ────────────────────────────────────────────────────

const SECTION_LABELS: Record<string, string> = {
  abstract: 'Abstract',
  introduction: 'Introduction',
  literature_review: 'Literature Review',
  method: 'Methodology',
  results: 'Results',
  discussion: 'Discussion',
  conclusion: 'Conclusion',
};

// ── PDF Generation Logic (runs server-side) ─────────────────────────────────

/**
 * Build a PDF Uint8Array from an ExportArticle using jsPDF (server-side compatible).
 */
async function generatePdfBuffer(article: ExportArticle): Promise<Uint8Array> {
  // Dynamic import for jsPDF (ESM)
  const { jsPDF } = await import('jspdf');

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 25.4; // 1 inch in mm
  const contentWidth = pageWidth - margin * 2;
  const lineHeightMm = 12 * 1.5 * 0.3528; // 12pt, 1.5 line spacing in mm

  let currentY = margin;

  // ── Helper: check page space ──
  const ensureSpace = (neededMm: number) => {
    if (currentY + neededMm > pageHeight - margin) {
      // Add page number before new page
      const current = doc.getNumberOfPages();
      doc.setFontSize(9);
      doc.setTextColor(150);
      doc.text(`Page ${current}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
      doc.setTextColor(0);
      doc.addPage();
      currentY = margin;
    }
  };

  // ── Helper: word-wrap ──
  const wrapText = (text: string, maxWidthMm: number, fontSizePt: number): string[] => {
    doc.setFontSize(fontSizePt);
    const lines: string[] = [];
    const words = text.split(/\s+/);
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      if (doc.getTextWidth(testLine) > maxWidthMm && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
  };

  // ── Helper: write text block ──
  const writeTextBlock = (
    text: string,
    options?: { fontSize?: number; fontStyle?: string; indent?: number }
  ) => {
    const fSize = options?.fontSize ?? 12;
    const fStyle = options?.fontStyle ?? 'normal';
    const indent = options?.indent ?? 0;
    const actualWidth = contentWidth - indent;

    doc.setFontSize(fSize);
    doc.setFont('helvetica', fStyle);

    const stripped = text.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1');
    const paragraphs = stripped.split(/\n\n+/);

    for (const para of paragraphs) {
      const trimmed = para.trim();
      if (!trimmed) continue;
      const lines = wrapText(trimmed, actualWidth, fSize);
      for (const line of lines) {
        ensureSpace(lineHeightMm);
        doc.text(line, margin + indent, currentY, { maxWidth: actualWidth, align: 'justify' });
        currentY += lineHeightMm;
      }
      currentY += lineHeightMm * 0.3;
    }
  };

  // ── Helper: write heading ──
  const writeHeading = (text: string) => {
    ensureSpace(lineHeightMm * 2);
    currentY += 4;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(26, 26, 26);
    doc.text(text, margin, currentY);
    currentY += 8;
    doc.setTextColor(0);
    doc.setFont('helvetica', 'normal');
  };

  // ══════════════════════════════════════════════════════════════
  // ── TITLE PAGE ──
  // ══════════════════════════════════════════════════════════════

  // Title
  currentY = 80;
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(26, 26, 26);
  const titleLines = wrapText(article.title, contentWidth, 16);
  for (const line of titleLines) {
    doc.text(line, pageWidth / 2, currentY, { align: 'center' });
    currentY += 8;
  }
  currentY += 8;

  // Keywords
  if (article.keywords.length > 0) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Keywords:', pageWidth / 2, currentY, { align: 'center' });
    currentY += 6;
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(80, 80, 80);
    const kwLines = wrapText(article.keywords.join(', '), contentWidth - 20, 12);
    for (const line of kwLines) {
      doc.text(line, pageWidth / 2, currentY, { align: 'center' });
      currentY += 5.5;
    }
    doc.setTextColor(0);
    currentY += 6;
  }

  // Generation date
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120, 120, 120);
  const today = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  doc.text(`Generated on ${today}`, pageWidth / 2, currentY, { align: 'center' });
  doc.text(`Word Count: ${article.totalWordCount.toLocaleString()}`, pageWidth / 2, currentY + 6, {
    align: 'center',
  });
  doc.setTextColor(0);
  doc.setFont('helvetica', 'normal');

  // ══════════════════════════════════════════════════════════════
  // ── ARTICLE SECTIONS ──
  // ══════════════════════════════════════════════════════════════

  // Add page number to title page, then new page for content
  const titlePageNum = doc.getNumberOfPages();
  doc.setFontSize(9);
  doc.setTextColor(150);
  doc.text(`Page ${titlePageNum}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
  doc.setTextColor(0);

  doc.addPage();
  currentY = margin;

  for (const section of article.sections) {
    const label = SECTION_LABELS[section.type] || section.type;
    const isAbstract = section.type === 'abstract';

    writeHeading(label);
    writeTextBlock(section.content, {
      fontStyle: isAbstract ? 'italic' : 'normal',
      indent: isAbstract ? 15 : 0,
    });

    // Reset font after section
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    currentY += 4;
  }

  // ══════════════════════════════════════════════════════════════
  // ── REFERENCES ──
  // ══════════════════════════════════════════════════════════════

  if (article.references.length > 0) {
    writeHeading('References');

    for (let i = 0; i < article.references.length; i++) {
      const ref = article.references[i];
      const parts: string[] = [ref.authors, `(${ref.year}).`, ref.title];

      if (ref.journal) {
        let jp = ref.journal;
        if (ref.volume) jp += `, ${ref.volume}`;
        if (ref.issue) jp += `(${ref.issue})`;
        if (ref.pages) jp += `, ${ref.pages}`;
        jp += '.';
        parts.push(jp);
      } else {
        parts.push('.');
      }

      const refText = `[${i + 1}] ${parts.join(' ')}`;
      ensureSpace(lineHeightMm * 2);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');

      const refLines = wrapText(refText, contentWidth, 10);
      for (let j = 0; j < refLines.length; j++) {
        const xOffset = j === 0 ? margin : margin + 8;
        const maxWidth = j === 0 ? contentWidth : contentWidth - 8;
        doc.text(refLines[j], xOffset, currentY, { maxWidth });
        currentY += 4.5;
      }
      currentY += 2;
    }
  }

  // Page number on last page
  const lastPageNum = doc.getNumberOfPages();
  doc.setFontSize(9);
  doc.setTextColor(150);
  doc.text(`Page ${lastPageNum}`, pageWidth / 2, pageHeight - 10, { align: 'center' });

  return new Uint8Array(doc.output('arraybuffer'));
}

// ── POST handler ─────────────────────────────────────────────────────────────

export const maxDuration = 300;
export async function POST(request: NextRequest) {
  // Rate limit check
  const { allowed, retryAfter } = rateLimit(request, RATE_LIMITS.export);
  if (!allowed) {
    return NextResponse.json(
      { success: false, error: 'Terlalu banyak permintaan. Coba lagi dalam ' + retryAfter + ' detik.' },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } }
    );
  }
  try {
    const body: ExportArticle = await request.json();

    if (!body.title || !body.sections || body.sections.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Article must have a title and at least one section.' },
        { status: 400 }
      );
    }

    const buffer = await generatePdfBuffer(body);
    const filename = `${body.title.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '_').substring(0, 60)}_article.pdf`;

    return new NextResponse(buffer.buffer as ArrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': buffer.byteLength.toString(),
      },
    });
  } catch (error) {
    console.error('PDF export error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate PDF file.' },
      { status: 500 }
    );
  }
}
