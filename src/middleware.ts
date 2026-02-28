import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

/**
 * Next.js middleware.
 *
 * Runs on every request. Its sole responsibility is refreshing the Supabase
 * auth session so that server components always receive a valid (or freshly
 * rotated) JWT. No routes are blocked — the app is fully accessible
 * anonymously.
 */
export async function middleware(request: NextRequest) {
  // We need to mutate response cookies so create a mutable response first.
  const response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // If env vars are missing (e.g. CI build without secrets) just continue.
  if (!url || !key) {
    return response;
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          // Set on the request so downstream server components see them
          request.cookies.set(name, value);
          // Set on the response so the browser keeps the refreshed tokens
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  // getUser() will silently refresh the session if the access token is expired.
  // We intentionally discard the result — this is a session-refresh side effect.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     *  - _next/static  (Next.js static assets)
     *  - _next/image   (Next.js image optimisation)
     *  - favicon.ico
     *  - Any file with an extension (images, fonts, etc.)
     */
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff2?)$).*)',
  ],
};
