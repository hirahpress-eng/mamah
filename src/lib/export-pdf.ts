import type { GeneratedArticle } from '@/store/article-store';

/**
 * Section label mapping for PDF headings.
 */
const SECTION_LABELS: Record<string, string> = {
  abstract: 'Abstract',
  introduction: 'Introduction',
  literature_review: 'Literature Review',
  method: 'Methodology',
  results: 'Results',
  discussion: 'Discussion',
  conclusion: 'Conclusion',
  bibliography: 'References',
};

/**
 * Build a professional academic PDF from a GeneratedArticle using jsPDF.
 * - Title page with centered title (16pt), keywords (italic, 12pt)
 * - Running header on content pages (italic title, right-aligned, 8pt)
 * - Section headings (14pt, bold), body text (12pt, 1.5 line spacing, justified)
 * - Abstract in italic with indentation
 * - APA 7 references with hanging indent, no numbering
 * - Page numbers (bottom center, number only) on content pages
 * - A4 page size, 1 inch margins
 * - Word wrap for long paragraphs
 */
export async function buildPdf(article: GeneratedArticle): Promise<Blob> {
  // Dynamic import to avoid SSR issues (jsPDF requires browser APIs)
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
  const fontSize = 12;
  const lineHeight = fontSize * 1.5; // 1.5 line spacing in points → convert to mm
  const lineHeightMm = lineHeight * 0.3528; // pt to mm conversion

  // ── Helper: add page number footer (skip title page) ──
  const addPageNumber = () => {
    const current = doc.getNumberOfPages();
    if (current <= 1) return;
    doc.setFontSize(9);
    doc.setTextColor(150);
    doc.text(`${current}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
    doc.setTextColor(0);
  };

  // ── Helper: add running header (skip title page) ──
  const addRunningHeader = () => {
    const current = doc.getNumberOfPages();
    if (current <= 1) return;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(150);
    doc.text(article.title, pageWidth - margin, 15, { align: 'right', maxWidth: contentWidth });
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0);
  };

  // ── Helper: check if we need a new page ──
  let currentY = margin;

  const ensureSpace = (neededMm: number) => {
    if (currentY + neededMm > pageHeight - margin) {
      addPageNumber();
      doc.addPage();
      addRunningHeader();
      currentY = margin;
    }
  };

  // ── Helper: word-wrap text into lines ──
  const wrapText = (text: string, maxWidthMm: number, fontSizePt: number): string[] => {
    doc.setFontSize(fontSizePt);
    const lines: string[] = [];
    const words = text.split(/\s+/);
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const textWidth = doc.getTextWidth(testLine);

      if (textWidth > maxWidthMm && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines;
  };

  // ── Helper: write wrapped text block ──
  const writeTextBlock = (
    text: string,
    options?: { fontSize?: number; fontStyle?: string; indent?: number; align?: 'left' | 'justify' }
  ) => {
    const fSize = options?.fontSize ?? fontSize;
    const fStyle = options?.fontStyle ?? 'normal';
    const indent = options?.indent ?? 0;
    const align = options?.align ?? 'justify';
    const actualWidth = contentWidth - indent;

    doc.setFontSize(fSize);
    doc.setFont('helvetica', fStyle);

    // Strip simple markdown: **bold** and *italic*
    const stripped = text.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1');
    const paragraphs = stripped.split(/\n\n+/);

    for (const para of paragraphs) {
      const trimmed = para.trim();
      if (!trimmed) continue;

      const lines = wrapText(trimmed, actualWidth, fSize);

      for (let i = 0; i < lines.length; i++) {
        ensureSpace(lineHeightMm);

        let xOffset = margin + indent;
        if (align === 'justify' && i < lines.length - 1) {
          // Simple justified effect: add letter spacing
          doc.text(lines[i], xOffset, currentY, {
            maxWidth: actualWidth,
            align: 'justify',
          });
        } else {
          doc.text(lines[i], xOffset, currentY);
        }

        currentY += lineHeightMm;
      }

      // Paragraph spacing
      currentY += lineHeightMm * 0.3;
    }
  };

  // ── Helper: write section heading ──
  const writeHeading = (text: string) => {
    ensureSpace(lineHeightMm * 2);
    currentY += 4; // Space before heading
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(26, 26, 26);
    doc.text(text, margin, currentY);
    currentY += 8; // Space after heading
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
    const keywordText = article.keywords.join(', ');
    const kwLines = wrapText(keywordText, contentWidth - 20, 12);
    for (const line of kwLines) {
      doc.text(line, pageWidth / 2, currentY, { align: 'center' });
      currentY += 5.5;
    }
    doc.setTextColor(0);
    currentY += 6;
  }

  // ══════════════════════════════════════════════════════════════
  // ── ARTICLE SECTIONS ──
  // ══════════════════════════════════════════════════════════════

  // Add new page for content
  addPageNumber();
  doc.addPage();
  addRunningHeader();
  currentY = margin;

  for (const section of article.sections) {
    const label = SECTION_LABELS[section.type] || section.type;
    const isAbstract = section.type === 'abstract';

    writeHeading(label);

    writeTextBlock(section.content, {
      fontStyle: isAbstract ? 'italic' : 'normal',
      indent: isAbstract ? 15 : 0,
    });

    currentY += 4; // Space after section
  }

  // ══════════════════════════════════════════════════════════════
  // ── REFERENCES ──
  // ══════════════════════════════════════════════════════════════

  if (article.references.length > 0) {
    writeHeading('References');

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
        parts.push(`https://doi.org/${ref.doi}`);
      }

      const refText = parts.join(' ');

      ensureSpace(lineHeightMm * 2);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');

      const refLines = wrapText(refText, contentWidth, 10);
      for (let j = 0; j < refLines.length; j++) {
        // Hanging indent for reference
        const xOffset = j === 0 ? margin : margin + 8;
        const maxWidth = j === 0 ? contentWidth : contentWidth - 8;
        doc.text(refLines[j], xOffset, currentY, { maxWidth });
        currentY += 4.5;
      }

      currentY += 2; // Space between references
    }
  }

  // Add page number to last page
  addPageNumber();

  return doc.output('blob');
}

/**
 * Export a GeneratedArticle as a downloadable .pdf file.
 * Generates a professional academic PDF and triggers a browser download.
 */
export async function exportToPdf(article: GeneratedArticle): Promise<void> {
  const blob = await buildPdf(article);

  // Build filename: {sanitised_title}_article.pdf
  // Only strip control chars and filesystem-unsafe chars — preserve Unicode/Indonesian
  const sanitisedTitle = article.title
    .replace(/[/\\?%*:|"<>]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 60)
    .toLowerCase();
  const filename = `${sanitisedTitle}_article.pdf`;

  // Trigger download via blob URL
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
