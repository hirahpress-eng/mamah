import { NextRequest, NextResponse } from 'next/server';
import {
  syncArticleToFirebase,
  getArticleFromFirebase,
  listUserArticles,
} from '@/lib/firebase';

// ─── POST: Sync an article to Firebase ─────────────────────────────────────
// Body: { article: GeneratedArticle, userId?: string, docId?: string }
// Response: { success, id?, error? }

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { article, userId, docId } = body;

    if (!article) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: article' },
        { status: 400 },
      );
    }

    // Basic validation of the article shape
    if (!article.title || !Array.isArray(article.sections)) {
      return NextResponse.json(
        { success: false, error: 'Invalid article structure: title and sections are required' },
        { status: 400 },
      );
    }

    const result = await syncArticleToFirebase(article, userId, docId);

    if (!result.success) {
      // Firebase not configured is a soft failure — return 200 but indicate disabled
      return NextResponse.json({
        success: false,
        error: result.error ?? 'Sync failed',
        disabled: result.error === 'Firebase not configured',
      });
    }

    return NextResponse.json({
      success: true,
      id: result.id,
    });
  } catch (error) {
    console.error('[/api/firebase/sync POST]', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// ─── GET: Retrieve article(s) from Firebase ────────────────────────────────
// Query params:
//   ?articleId=xxx       — fetch a single article
//   ?userId=xxx          — list all articles for a user
// Response varies by which params are provided.

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const articleId = searchParams.get('articleId');
    const userId = searchParams.get('userId');

    if (!articleId && !userId) {
      return NextResponse.json(
        { success: false, error: 'Provide either articleId or userId query parameter' },
        { status: 400 },
      );
    }

    // Single article lookup
    if (articleId) {
      const result = await getArticleFromFirebase(articleId);

      if (!result.success) {
        return NextResponse.json({
          success: false,
          error: result.error ?? 'Article not found',
          disabled: result.error === 'Firebase not configured',
        });
      }

      return NextResponse.json({
        success: true,
        article: result.article,
      });
    }

    // List articles for a user
    if (userId) {
      const result = await listUserArticles(userId);

      if (!result.success) {
        return NextResponse.json({
          success: false,
          error: result.error ?? 'Failed to list articles',
          disabled: result.error === 'Firebase not configured',
        });
      }

      return NextResponse.json({
        success: true,
        articles: result.articles,
        count: result.articles?.length ?? 0,
      });
    }

    // Should not reach here due to early guard, but satisfy TS
    return NextResponse.json(
      { success: false, error: 'Invalid request' },
      { status: 400 },
    );
  } catch (error) {
    console.error('[/api/firebase/sync GET]', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}
