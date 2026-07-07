import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase';

// OAuth callback handler for Supabase Auth (Google, GitHub, etc.)
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const supabase = createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }

    console.error('Auth callback error:', error.message);
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/?auth=error`);
}
