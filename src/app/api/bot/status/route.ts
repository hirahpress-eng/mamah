/**
 * GET /api/bot/status
 * ───────────────────
 * Health-check endpoint for the SuperBot system.  Returns the health
 * status of both the Next.js API layer and the bot mini-service
 * running on port 3035.
 *
 * The mini-service is reached through the Caddy gateway using the
 * XTransformPort query parameter (internal fetch — the request never
 * leaves the host).
 */

import { NextResponse } from 'next/server';

interface BotServiceHealth {
  status: 'healthy' | 'degraded' | 'unreachable';
  uptime?: number;
  version?: string;
  timestamp?: string;
  error?: string;
}

interface StatusResponse {
  success: boolean;
  api: {
    status: 'healthy';
    timestamp: string;
    version: string;
  };
  botService: BotServiceHealth;
  responseTime: number;
}

const BOT_SERVICE_PORT = 3035;

export async function GET() {
  const startTime = Date.now();

  // ── Check bot mini-service ──────────────────────────────────────────
  let botServiceHealth: BotServiceHealth = {
    status: 'unreachable',
    error: 'Not checked yet',
  };

  try {
    const botUrl = `/api/bot/status?XTransformPort=${BOT_SERVICE_PORT}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(botUrl, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    clearTimeout(timeout);

    if (response.ok) {
      const data = (await response.json()) as {
        success: boolean;
        status?: string;
        uptime?: number;
        version?: string;
        timestamp?: string;
      };

      botServiceHealth = {
        status: data.status === 'healthy' ? 'healthy' : 'degraded',
        uptime: data.uptime,
        version: data.version,
        timestamp: data.timestamp,
      };
    } else {
      botServiceHealth = {
        status: 'degraded',
        error: `Mini-service responded with HTTP ${response.status}`,
      };
    }
  } catch (err) {
    botServiceHealth = {
      status: 'unreachable',
      error:
        err instanceof Error
          ? err.name === 'AbortError'
            ? 'Request timed out after 5 seconds'
            : err.message
          : 'Unknown error',
    };
  }

  const responseTime = Date.now() - startTime;

  // ── Build response ──────────────────────────────────────────────────
  const result: StatusResponse = {
    success: true,
    api: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    },
    botService: botServiceHealth,
    responseTime,
  };

  return NextResponse.json(result);
}
