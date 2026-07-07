import { NextRequest, NextResponse } from 'next/server';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  LineRuleType,
  PageBreak,
  Footer,
  Header,
  PageNumber,
  NumberFormat,
  convertInchesToTwip,
} from 'docx';

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

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Parse inline markdown formatting (**bold**, *italic*) into TextRun[].
 */
function parseInlineFormatting(text: string, italic = false): TextRun[] {
  const runs: TextRun[] = [];
  const regex = /(\*\*(.+?)\*\*)|(\*(.+?)\*)|([^*]+)/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match[1]) {
      runs.push(new TextRun({ text: match[2], bold: true, italics: italic, font: 'Times New Roman', size: 24 }));
    } else if (match[3]) {
      runs.push(new TextRun({ text: match[4], italics: true, font: 'Times New Roman', size: 24 }));
    } else if (match[5]) {
      runs.push(new TextRun({ text: match[5], italics: italic, font: 'Times New Roman', size: 24 }));
    }
  }

  if (runs.length === 0) {
    runs.push(new TextRun({ text, italics: italic, font: 'Times New Roman', size: 24 }));
  }

  return runs;
}

/**
 * Convert markdown content lines into docx Paragraphs.
 * Handles numbered lists, bullet lists, and plain paragraphs.
 */
function contentToParagraphs(content: string, options?: { italic?: boolean; indent?: boolean }): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  const lines = content.split('\n');
  const isItalic = options?.italic ?? false;
  const hasIndent = options?.indent ?? false;
  const indentConfig = hasIndent
    ? { left: convertInchesToTwip(1), right: convertInchesToTwip(1) }
    : undefined;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Markdown headings (### → H3, ## → H2, # → H1)
    const headingMatch = trimmed.match(/^(#{1,3})\s+(.*)/);
    if (headingMatch) {
      const level = headingMatch[1].length as 1 | 2 | 3;
      const headingText = headingMatch[2].trim();
      const headingMap: Record<number, typeof HeadingLevel.HEADING_1> = {
        1: HeadingLevel.HEADING_1,
        2: HeadingLevel.HEADING_2,
        3: HeadingLevel.HEADING_3,
      };
      paragraphs.push(
        new Paragraph({
          heading: headingMap[level],
          spacing: { before: 240, after: 120, line: 360, lineRule: LineRuleType.AUTO },
          children: [new TextRun({ text: headingText, bold: true, font: 'Times New Roman', size: level === 1 ? 32 : level === 2 ? 28 : 26 })],
        })
      );
      continue;
    }

    // Numbered list
    const numberedMatch = trimmed.match(/^(\d+)[.)]\s+(.*)/);
    if (numberedMatch) {
      paragraphs.push(
        new Paragraph({
          numbering: { reference: 'numbered-list', level: 0 },
          spacing: { after: 120, line: 360, lineRule: LineRuleType.AUTO },
          indent: indentConfig,
          children: parseInlineFormatting(numberedMatch[2], isItalic),
        })
      );
      continue;
    }

    // Bullet list
    const bulletMatch = trimmed.match(/^[-*•]\s+(.*)/);
    if (bulletMatch) {
      paragraphs.push(
        new Paragraph({
          numbering: { reference: 'bullet-list', level: 0 },
          spacing: { after: 120, line: 360, lineRule: LineRuleType.AUTO },
          indent: indentConfig,
          children: parseInlineFormatting(bulletMatch[1], isItalic),
        })
      );
      continue;
    }

    // Regular paragraph
    paragraphs.push(
      new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        spacing: { after: 200, line: 360, lineRule: LineRuleType.AUTO },
        indent: indentConfig,
        children: parseInlineFormatting(trimmed, isItalic),
      })
    );
  }

  return paragraphs;
}

/**
 * Format a single reference as APA 7 style paragraph with hanging indent.
 */
function formatReferenceParagraph(ref: ArticleReference, index: number): Paragraph {
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

  return new Paragraph({
    spacing: { after: 120, line: 360, lineRule: LineRuleType.AUTO },
    indent: { left: convertInchesToTwip(0.5), hanging: convertInchesToTwip(0.5) },
    children: [
      new TextRun({
        text: parts.join(' '),
        font: 'Times New Roman',
        size: 24,
      }),
    ],
  });
}

// ── POST handler ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body: ExportArticle = await request.json();

    if (!body.title || !body.sections || body.sections.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Article must have a title and at least one section.' },
        { status: 400 }
      );
    }

    // ── Build document children ──
    const children: Paragraph[] = [];

    // ── Title page ──
    children.push(
      new Paragraph({
        spacing: { before: 3600, after: 600 },
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: body.title,
            bold: true,
            font: 'Times New Roman',
            size: 36, // 18pt
          }),
        ],
      })
    );

    // Keywords
    if (body.keywords && body.keywords.length > 0) {
      children.push(
        new Paragraph({
          spacing: { before: 400, after: 200 },
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({
              text: 'Keywords: ',
              bold: true,
              font: 'Times New Roman',
              size: 24,
            }),
            new TextRun({
              text: body.keywords.join(', '),
              italics: true,
              font: 'Times New Roman',
              size: 24,
            }),
          ],
        })
      );
    }

    // Word count
    children.push(
      new Paragraph({
        spacing: { before: 200, after: 200 },
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: `Word Count: ${body.totalWordCount.toLocaleString()}`,
            font: 'Times New Roman',
            size: 20,
            color: '666666',
          }),
        ],
      })
    );

    // Page break after title
    children.push(new Paragraph({ children: [new PageBreak()] }));

    // ── Article sections ──
    for (const section of body.sections) {
      const label = SECTION_LABELS[section.type] || section.type;

      // Section heading
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 480, after: 240 },
          children: [
            new TextRun({
              text: label,
              bold: true,
              font: 'Times New Roman',
              size: 28, // 14pt
            }),
          ],
        })
      );

      // Abstract: italic with side indent
      const isAbstract = section.type === 'abstract';
      const sectionParagraphs = contentToParagraphs(section.content, {
        italic: isAbstract,
        indent: isAbstract,
      });
      children.push(...sectionParagraphs);
    }

    // ── References ──
    if (body.references && body.references.length > 0) {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 480, after: 240 },
          children: [
            new TextRun({
              text: 'References',
              bold: true,
              font: 'Times New Roman',
              size: 28,
            }),
          ],
        })
      );

      for (let i = 0; i < body.references.length; i++) {
        children.push(formatReferenceParagraph(body.references[i], i));
      }
    }

    // ── Create document ──
    const doc = new Document({
      features: {
        updateFields: true,
      },
      numbering: {
        config: [
          {
            reference: 'numbered-list',
            levels: [
              {
                level: 0,
                format: NumberFormat.DECIMAL,
                text: '%1.',
                alignment: AlignmentType.START,
                style: {
                  paragraph: {
                    indent: { left: convertInchesToTwip(0.5), hanging: convertInchesToTwip(0.25) },
                  },
                  run: {
                    font: 'Times New Roman',
                    size: 24,
                  },
                },
              },
            ],
          },
          {
            reference: 'bullet-list',
            levels: [
              {
                level: 0,
                format: NumberFormat.BULLET,
                text: '\u2022',
                alignment: AlignmentType.START,
                style: {
                  paragraph: {
                    indent: { left: convertInchesToTwip(0.5), hanging: convertInchesToTwip(0.25) },
                  },
                  run: {
                    font: 'Times New Roman',
                    size: 24,
                  },
                },
              },
            ],
          },
        ],
      },
      styles: {
        default: {
          document: {
            run: {
              font: 'Times New Roman',
              size: 24, // 12pt
            },
            paragraph: {
              spacing: { line: 360, lineRule: LineRuleType.AUTO }, // 1.5 line spacing
            },
          },
          heading1: {
            run: {
              font: 'Times New Roman',
              size: 28, // 14pt
              bold: true,
              color: '1a1a1a',
            },
            paragraph: {
              spacing: { before: 480, after: 240 },
              outlineLevel: 0,
            },
          },
          heading2: {
            run: {
              font: 'Times New Roman',
              size: 26, // 13pt
              bold: true,
              color: '333333',
            },
            paragraph: {
              spacing: { before: 360, after: 200 },
              outlineLevel: 1,
            },
          },
        },
      },
      sections: [
        {
          properties: {
            page: {
              margin: {
                top: convertInchesToTwip(1),
                right: convertInchesToTwip(1),
                bottom: convertInchesToTwip(1),
                left: convertInchesToTwip(1),
              },
            },
          },
          headers: {
            default: new Header({
              children: [
                new Paragraph({
                  alignment: AlignmentType.RIGHT,
                  children: [
                    new TextRun({
                      text: body.title,
                      font: 'Times New Roman',
                      size: 18,
                      color: '999999',
                      italics: true,
                    }),
                  ],
                }),
              ],
            }),
          },
          footers: {
            default: new Footer({
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      children: [PageNumber.CURRENT],
                      font: 'Times New Roman',
                      size: 20,
                      color: '666666',
                    }),
                  ],
                }),
              ],
            }),
          },
          children,
        },
      ],
    });

    // ── Generate and return ──
    const buffer = await Packer.toBuffer(doc);
    const filename = `${body.title.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '_').substring(0, 60)}_article.docx`;

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': buffer.byteLength.toString(),
      },
    });
  } catch (error) {
    console.error('DOCX export error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate DOCX file.' },
      { status: 500 }
    );
  }
}
