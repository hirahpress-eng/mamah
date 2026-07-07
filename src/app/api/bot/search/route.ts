/**
 * POST /api/bot/search
 * ────────────────────
 * Accepts a search configuration, instantiates the SuperBot engine,
 * and streams real-time progress events to the client as
 * Server-Sent Events (SSE).
 *
 * The SuperBot delegates database searches to the bot mini-service
 * on port 3035 via the Caddy gateway.
 */

import { NextRequest } from 'next/server';
import { SuperBot } from '@/lib/super-bot-engine';
import type { BotProgress, BotSearchResult } from '@/lib/super-bot-engine';

export const maxDuration = 300;

interface SearchRequestBody {
  topic: string;
  keywords: string[];
  maxResults?: number;
  databases?: string[];
}

function createSSEStream(
  bot: SuperBot,
  config: { topic: string; keywords: string[]; maxResults: number; databases?: string[]; autoDownload?: boolean; downloadLimit?: number; minScoreThreshold?: number },
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      const sendEvent = (eventType: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`)
        );
      };

      try {
        const results = await bot.run(config as any, (progress: any) => {
          sendEvent('progress', { type: 'progress', progress });
        });

        // Send final results
        sendEvent('result', {
          type: 'result',
          success: true,
          references: results,
          total: results.length,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        sendEvent('error', {
          type: 'error',
          success: false,
          error: message,
        });
      } finally {
        controller.close();
      }
    },

    cancel() {
      bot.abort();
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SearchRequestBody;

    const {
      topic,
      keywords,
      maxResults = 50,
      databases,
    } = body;

    if (!topic || typeof topic !== 'string' || topic.trim().length === 0) {
      return Response.json(
        { success: false, error: 'A non-empty "topic" string is required' },
        { status: 400 },
      );
    }

    if (
      !keywords ||
      !Array.isArray(keywords) ||
      keywords.filter((k) => typeof k === 'string' && k.trim().length > 0).length === 0
    ) {
      return Response.json(
        { success: false, error: 'A non-empty "keywords" string array is required' },
        { status: 400 },
      );
    }

    if (typeof maxResults !== 'number' || maxResults < 1 || maxResults > 200) {
      return Response.json(
        { success: false, error: '"maxResults" must be between 1 and 200' },
        { status: 400 },
      );
    }

    const safeKeywords = keywords
      .filter((k) => typeof k === 'string' && k.trim().length > 0)
      .map((k) => k.trim());

    const bot = new SuperBot();

    const stream = createSSEStream(bot, {
      topic: topic.trim(),
      keywords: safeKeywords,
      maxResults: Math.min(maxResults, 200),
      databases: Array.isArray(databases) ? databases : undefined,
    });

    return new Response(stream, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (error) {
    console.error('[API /bot/search] Unhandled error:', error);

    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
      },
      { status: 500 },
    );
  }
}
