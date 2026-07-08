import { NextResponse } from 'next/server';
import { getSessionCookieName } from '@/lib/session';

export const maxDuration = 300;
export async function POST() {
  try {
    const response = NextResponse.json({ success: true, message: 'Logged out successfully' });

    // Clear the session cookie
    response.cookies.set(getSessionCookieName(), '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}