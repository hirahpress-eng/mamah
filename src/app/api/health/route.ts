import { NextResponse } from 'next/server';

/**
 * Health check endpoint for monitoring and load balancers.
 * Does NOT require authentication.
 * Returns system status, uptime, and configuration info.
 */

const START_TIME = Date.now();

export async function GET() {
  const uptime = Math.floor((Date.now() - START_TIME) / 1000);
  const minutes = Math.floor(uptime / 60);
  const seconds = uptime % 60;

  const engines = {
    gemini: !!process.env.GEMINI_API_KEY,
    groq: !!process.env.GROQ_API_KEY,
    cloudflare: !!(process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_API_TOKEN),
    zai: !!process.env.ZAI_BASE_URL,
    supabase: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
  };

  const activeEngines = Object.values(engines).filter(Boolean).length;

  return NextResponse.json({
    status: 'ok',
    service: 'mamah',
    version: process.env.npm_package_version || '0.2.0',
    environment: process.env.NODE_ENV || 'development',
    uptime: `${minutes}m ${seconds}s`,
    engines: {
      available: activeEngines,
      total: Object.keys(engines).length,
      details: engines,
    },
    timestamp: new Date().toISOString(),
  });
}