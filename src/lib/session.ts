import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const _jwtSecret = process.env.JWT_SECRET;
if (!_jwtSecret) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET environment variable is required in production');
  }
  // Dev-only fallback — never reaches production
  console.warn('[session] JWT_SECRET not set, using dev fallback. NEVER use in production.');
}
const JWT_SECRET = new TextEncoder().encode(_jwtSecret || 'mamah-dev-only-fallback-never-production');

const SESSION_COOKIE_NAME = 'mamah_session';
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export interface SessionPayload {
  userId: string;
  email: string;
  name?: string | null;
  avatarUrl?: string | null;
  role?: string;
  subscriptionTier: string;
}

export async function createSession(user: {
  id: string;
  email: string;
  name?: string | null;
  avatarUrl?: string | null;
  role?: string;
  subscriptionTier?: string;
}): Promise<string> {
  const payload: SessionPayload = {
    userId: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    role: user.role || 'user',
    subscriptionTier: user.subscriptionTier || 'free',
  };

  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(JWT_SECRET);

  return token;
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) return null;
  return verifySession(token);
}

export function getSessionCookieName() {
  return SESSION_COOKIE_NAME;
}

export { SESSION_COOKIE_NAME };