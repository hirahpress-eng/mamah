import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const SESSION_COOKIE_NAME = 'mamah_session';

// Routes that skip auth check (glob-style matching)
const PUBLIC_API_PREFIXES = ['/api/auth'];

function isPublicApi(pathname: string): boolean {
  return PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only check /api/* routes
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Allow public auth routes
  if (isPublicApi(pathname)) {
    return NextResponse.next();
  }

  // Validate mamah_session JWT
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.json(
      { success: false, error: 'Authentication required' },
      { status: 401 }
    );
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    console.error('[middleware] JWT_SECRET not set');
    return NextResponse.json(
      { success: false, error: 'Server configuration error' },
      { status: 500 }
    );
  }

  try {
    await jwtVerify(token, new TextEncoder().encode(jwtSecret));
    return NextResponse.next();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Session expired or invalid' },
      { status: 401 }
    );
  }
}

export const config = {
  matcher: [
    // Match all /api/* routes (including nested)
    '/api/:path*',
  ],
};