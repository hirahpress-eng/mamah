import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase';
import { createSession, getSessionCookieName } from '@/lib/session';
import { db } from '@/lib/db';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const maxDuration = 300;
export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

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

    const supabase = createSupabaseServerClient();

    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Email login belum dikonfigurasi' },
        { status: 503 }
      );
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }

    // Upsert user in local database
    let user = await db.user.findUnique({ where: { email: data.user.email! } });

    if (!user) {
      user = await db.user.create({
        data: {
          email: data.user.email!,
          name: data.user.user_metadata?.full_name || email.split('@')[0],
          avatarUrl: data.user.user_metadata?.avatar_url || null,
          role: 'user',
          authProvider: 'email',
          subscriptionTier: 'free',
        },
      });
    } else {
      user = await db.user.update({
        where: { id: user.id },
        data: {
          name: data.user.user_metadata?.full_name || user.name,
          avatarUrl: data.user.user_metadata?.avatar_url || user.avatarUrl,
          authProvider: 'email',
        },
      });
    }

    // Create mamah_session JWT (same as Google auth flow)
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
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        role: user.role,
        subscriptionTier: user.subscriptionTier,
      },
    });

    // Set session cookie so /api/auth/me works
    response.cookies.set(getSessionCookieName(), sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}