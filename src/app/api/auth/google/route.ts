import { NextResponse } from 'next/server';
import { GoogleAuth } from 'google-auth-library';
import { db } from '@/lib/db';
import { createSession, getSessionCookieName } from '@/lib/session';

// Google OAuth token verification & user creation
export const maxDuration = 300;
export async function POST(request: Request) {
  try {
    const { credential } = await request.json();

    if (!credential) {
      return NextResponse.json(
        { success: false, error: 'Google credential is required' },
        { status: 400 }
      );
    }

    // Verify the Google ID token
    const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!googleClientId) {
      console.error('NEXT_PUBLIC_GOOGLE_CLIENT_ID is not set');
      return NextResponse.json(
        { success: false, error: 'Google login is not configured. Please set NEXT_PUBLIC_GOOGLE_CLIENT_ID.' },
        { status: 500 }
      );
    }

    // Option 1: Verify with audience (if client ID is set)
    let ticket;
    try {
      const auth = new GoogleAuth();
      ticket = await (auth as any).verifyIdToken({
        idToken: credential,
        audience: googleClientId,
      });
    } catch (verifyError) {
      console.error('Google token verification failed:', verifyError);
      return NextResponse.json(
        { success: false, error: 'Invalid Google token. Please try again.' },
        { status: 401 }
      );
    }

    const googleUser = ticket.getPayload();
    if (!googleUser) {
      return NextResponse.json(
        { success: false, error: 'Failed to get Google user info' },
        { status: 401 }
      );
    }

    const { sub: googleId, email, name, picture } = googleUser;

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Google account has no email' },
        { status: 400 }
      );
    }

    // Upsert user in database
    let user = await db.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Create new user
      user = await db.user.create({
        data: {
          email,
          name: name || email.split('@')[0],
          avatarUrl: picture || null,
          role: 'user',
          authProvider: 'google',
          googleId,
          subscriptionTier: 'free',
        },
      });
    } else {
      // Update existing user with latest Google info
      user = await db.user.update({
        where: { id: user.id },
        data: {
          name: name || user.name,
          avatarUrl: picture || user.avatarUrl,
          googleId: googleId || user.googleId,
          authProvider: 'google',
        },
      });
    }

    // Create JWT session
    const sessionToken = await createSession({
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      role: user.role,
      subscriptionTier: user.subscriptionTier,
    });

    // Set session cookie
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

    response.cookies.set(getSessionCookieName(), sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Google auth error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}