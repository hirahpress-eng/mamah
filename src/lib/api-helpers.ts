/**
 * Shared API utilities for request validation, body parsing, and error responses.
 *
 * Every API route should use these helpers for consistent behavior.
 */

import { NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// Request Body Parser with Size Limit
// ---------------------------------------------------------------------------

/** Default max body size: 2MB (enough for article content) */
const DEFAULT_MAX_BODY_SIZE = 2 * 1024 * 1024; // 2MB
/** For auth routes: smaller limit */
const AUTH_MAX_BODY_SIZE = 10 * 1024; // 10KB

/**
 * Safely parse a JSON request body with size limit validation.
 * Returns null if parsing fails or body exceeds the limit.
 */
export async function parseBody<T = Record<string, unknown>>(
  request: Request,
  maxBytes = DEFAULT_MAX_BODY_SIZE,
): Promise<T | null> {
  // Check Content-Length header first (fast path)
  const contentLength = request.headers.get('content-length');
  if (contentLength && parseInt(contentLength, 10) > maxBytes) {
    return null;
  }

  try {
    // Clone the request so we can read the body
    const body = await request.json();
    return body as T;
  } catch {
    return null;
  }
}

/**
 * Parse body with auth-sized limit (10KB).
 */
export async function parseAuthBody<T = Record<string, unknown>>(
  request: Request,
): Promise<T | null> {
  return parseBody<T>(request, AUTH_MAX_BODY_SIZE);
}

// ---------------------------------------------------------------------------
// Validation Helpers
// ---------------------------------------------------------------------------

/**
 * Validate that a string is a non-empty, trimmed value.
 */
export function requireString(value: unknown, fieldName: string): string | null {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return `${fieldName} wajib diisi`;
  }
  return null;
}

/**
 * Validate that a value is a non-empty array with minimum length.
 */
export function requireArray(
  value: unknown,
  fieldName: string,
  minLength = 1,
): string | null {
  if (!Array.isArray(value) || value.length < minLength) {
    return `${fieldName} minimal ${minLength} item`;
  }
  return null;
}

/**
 * Validate that a value is a valid AI engine ID.
 */
export function requireEngineId(value: unknown): string | null {
  const validEngines = ['zai', 'gemini', 'grok', 'cloudflare'];
  if (typeof value !== 'string' || !validEngines.includes(value)) {
    return 'Mesin AI tidak valid';
  }
  return null;
}

// ---------------------------------------------------------------------------
// Consistent Error Responses
// ---------------------------------------------------------------------------

export function badRequest(error: string) {
  return NextResponse.json({ success: false, error }, { status: 400 });
}

export function unauthorized(error = 'Autentikasi diperlukan') {
  return NextResponse.json({ success: false, error }, { status: 401 });
}

export function forbidden(error = 'Akses ditolak') {
  return NextResponse.json({ success: false, error }, { status: 403 });
}

export function notFound(error = 'Resource tidak ditemukan') {
  return NextResponse.json({ success: false, error }, { status: 404 });
}

export function rateLimited(retryAfter: number) {
  return NextResponse.json(
    { success: false, error: `Terlalu banyak permintaan. Coba lagi dalam ${retryAfter} detik.` },
    { status: 429, headers: { 'Retry-After': String(retryAfter) } },
  );
}

export function serverError(error = 'Terjadi kesalahan server') {
  return NextResponse.json({ success: false, error }, { status: 500 });
}

export function serviceUnavailable(error = 'Layanan sedang tidak tersedia') {
  return NextResponse.json({ success: false, error }, { status: 503 });
}

export function successResponse(data: unknown, status = 200) {
  return NextResponse.json({ success: true, ...data }, { status });
}