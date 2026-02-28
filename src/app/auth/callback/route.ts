import { NextResponse, type NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * OAuth callback route.
 *
 * Supabase redirects here after a successful OAuth flow (e.g. Google).
 * We exchange the one-time `code` for a session, then redirect the user
 * back to the home page (or wherever they were headed).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  // `next` lets the calling page pass a redirect target (optional)
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Successful auth — send the user on their way
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Something went wrong — redirect to login with an error hint
  return NextResponse.redirect(
    `${origin}/auth/login?error=oauth_callback_failed`,
  );
}
