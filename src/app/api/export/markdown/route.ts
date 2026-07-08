import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import type { GeneratedArticle } from '@/store/article-store';
import { buildMarkdown } from '@/lib/export-markdown';

// ── Types ────────────────────────────────────────────────────────────────────

interface ExportArticle {
  title: string;
  keywords: string[];
  sections: GeneratedArticle['sections'];
  references: GeneratedArticle['references'];
  totalWordCount: number;
  isPolished: boolean;
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

    // Build markdown using the article shape expected by buildMarkdown
    const article: GeneratedArticle = {
      title: body.title,
      keywords: body.keywords,
      sections: body.sections,
      references: body.references,
      totalWordCount: body.totalWordCount,
      isPolished: body.isPolished,
    };
    const markdown = buildMarkdown(article);
    const filename = `${body.title.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '_').substring(0, 60)}_article.md`;

    return new NextResponse(markdown, {
      status: 200,
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Markdown export error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate Markdown file.' },
      { status: 500 }
    );
  }
}
