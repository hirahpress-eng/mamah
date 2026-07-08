/**
 * In-memory rate limiter for API routes.
 *
 * Uses a sliding window per (userId, route) pair.
 * No external dependencies — works on Vercel serverless and local dev.
 *
 * Usage in API routes:
 *   import { rateLimit } from '@/lib/rate-limit';
 *   const { allowed, retryAfter } = rateLimit(request, { maxRequests: 10, windowMs: 60_000 });
 *   if (!allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': String(retryAfter) } });
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RateLimitEntry {
  timestamps: number[];
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfter: number; // seconds until next slot opens
}

interface RateLimitOptions {
  /** Max requests allowed in the window. Default: 20 */
  maxRequests?: number;
  /** Window duration in ms. Default: 60_000 (1 minute) */
  windowMs?: number;
  /** Custom identifier (e.g., IP or userId). Default: auto-extract from request */
  identifier?: string;
}

// ---------------------------------------------------------------------------
// In-memory store
// ---------------------------------------------------------------------------

const store = new Map<string, RateLimitEntry>();

// Cleanup old entries every 5 minutes to prevent memory leaks
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;

  for (const [key, entry] of store) {
    // Remove timestamps older than 10 minutes
    entry.timestamps = entry.timestamps.filter((t) => now - t < 10 * 60 * 1000);
    if (entry.timestamps.length === 0) {
      store.delete(key);
    }
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Check if a request is within rate limits.
 *
 * Extracts userId from JWT cookie, falls back to IP address.
 * Returns an object with `allowed`, `remaining`, and `retryAfter`.
 */
export function rateLimit(
  request: Request,
  options: RateLimitOptions = {},
): RateLimitResult {
  const maxRequests = options.maxRequests ?? 20;
  const windowMs = options.windowMs ?? 60_000;

  // Extract identifier: userId from cookie or IP
  let identifier = options.identifier || '';

  if (!identifier) {
    // Try to extract from mamah_session cookie (JWT payload has userId)
    const cookieHeader = request.headers.get('cookie') || '';
    const sessionMatch = cookieHeader.match(/mamah_session=([^;]+)/);
    if (sessionMatch) {
      // We just use the cookie value hash as identifier (don't need to decode JWT here)
      identifier = `user:${simpleHash(sessionMatch[1])}`;
    } else {
      // Fallback to IP
      const forwarded = request.headers.get('x-forwarded-for');
      identifier = `ip:${forwarded?.split(',')[0]?.trim() || 'unknown'}`;
    }
  }

  // Create route-specific key
  const url = new URL(request.url);
  const routeKey = `${identifier}:${url.pathname}`;

  const now = Date.now();
  cleanup();

  let entry = store.get(routeKey);

  if (!entry) {
    entry = { timestamps: [] };
    store.set(routeKey, entry);
  }

  // Remove timestamps outside the window
  entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs);

  const currentCount = entry.timestamps.length;

  if (currentCount >= maxRequests) {
    // Calculate when the oldest request in window will expire
    const oldestInWindow = entry.timestamps[0];
    const retryAfterSec = Math.ceil((oldestInWindow + windowMs - now) / 1000);
    return {
      allowed: false,
      remaining: 0,
      retryAfter: Math.max(retryAfterSec, 1),
    };
  }

  // Record this request
  entry.timestamps.push(now);

  return {
    allowed: true,
    remaining: maxRequests - currentCount - 1,
    retryAfter: 0,
  };
}

/**
 * Pre-configured rate limiters for different API categories.
 */
export const RATE_LIMITS = {
  /** Auth routes: stricter (5/min) to prevent brute force */
  auth: { maxRequests: 5, windowMs: 60_000 },
  /** AI generation routes: moderate (10/min) — expensive operations */
  generation: { maxRequests: 10, windowMs: 60_000 },
  /** Reference search: moderate (15/min) */
  search: { maxRequests: 15, windowMs: 60_000 },
  /** Export routes: moderate (10/min) */
  export: { maxRequests: 10, windowMs: 60_000 },
  /** General API routes: permissive (30/min) */
  general: { maxRequests: 30, windowMs: 60_000 },
} as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Simple string hash for cookie-based identification */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return Math.abs(hash).toString(36);
}