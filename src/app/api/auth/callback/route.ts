import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase';

// OAuth callback handler for Supabase Auth (Google, GitHub, etc.)
export const maxDuration = 300;
export async function GET(request: Request) {
  try {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get('code');
    // Prevent open redirect: only allow relative paths starting with /
    const rawNext = searchParams.get('next') ?? '/';
    const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/';

    if (code) {
      const supabase = createSupabaseServerClient();
      if (!supabase) {
        return NextResponse.redirect(`${origin}/?auth=error`);
      }
      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (!error) {
        return NextResponse.redirect(`${origin}${next}`);
      }
    }

    // Return the user to an error page with instructions
    return NextResponse.redirect(`${origin}/?auth=error`);
  } catch {
    return NextResponse.redirect(`${new URL(request.url).origin}/?auth=error`);
  }
}
