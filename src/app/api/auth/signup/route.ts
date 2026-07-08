import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase';
import { createSession, getSessionCookieName } from '@/lib/session';
import { db } from '@/lib/db';
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

/** Validate password has at least 1 letter and 1 number */
function isPasswordStrong(password: string): boolean {
  return /[a-zA-Z]/.test(password) && /[0-9]/.test(password);
}

export const maxDuration = 300;
export async function POST(request: Request) {
  try {
    // Rate limit: 5 attempts per minute (anti-abuse)
    const { allowed, retryAfter } = rateLimit(request, RATE_LIMITS.auth);
    if (!allowed) {
      return NextResponse.json(
        { success: false, error: 'Terlalu banyak percobaan. Coba lagi dalam ' + retryAfter + ' detik.' },
        { status: 429, headers: { 'Retry-After': String(retryAfter) } }
      );
    }

    const { email, password, fullName } = await request.json();

    // Server-side validation
    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email dan kata sandi wajib diisi' },
        { status: 400 }
      );
    }

    if (!EMAIL_REGEX.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Format email tidak valid' },
        { status: 400 }
      );
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json(
        { success: false, error: `Kata sandi minimal ${MIN_PASSWORD_LENGTH} karakter` },
        { status: 400 }
      );
    }

    if (!isPasswordStrong(password)) {
      return NextResponse.json(
        { success: false, error: 'Kata sandi harus mengandung huruf dan angka' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerClient();

    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Email signup belum dikonfigurasi' },
        { status: 503 }
      );
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName || email.split('@')[0],
        },
      },
    });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    // If user session is returned, the account is auto-confirmed (or email confirmation is off)
    // Create local user and session only when session exists
    if (data.session && data.user) {
      let user = await db.user.findUnique({ where: { email: data.user.email! } });

      if (!user) {
        user = await db.user.create({
          data: {
            email: data.user.email!,
            name: fullName || email.split('@')[0],
            role: 'user',
            authProvider: 'email',
            subscriptionTier: 'free',
          },
        });
      }

      const sessionToken = await createSession({
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        role: user.role,
        subscriptionTier: user.subscriptionTier,
      });

      const response = NextResponse.json({
        success: true,
        user: { id: user.id, email: user.email, name: user.name },
      });

      response.cookies.set(getSessionCookieName(), sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30, // 30 days
        path: '/',
      });

      return response;
    }

    // Email confirmation required — no session yet
    return NextResponse.json({
      success: true,
      user: { id: data.user?.id, email: data.user?.email },
      message: 'Periksa email Anda untuk tautan konfirmasi',
    });
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}