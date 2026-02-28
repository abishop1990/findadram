import { NextResponse } from 'next/server';
import { getEnv } from '@/lib/env';

export async function GET() {
  const checks = {
    anthropic_key: !!getEnv('ANTHROPIC_API_KEY'),
    supabase_url: !!getEnv('NEXT_PUBLIC_SUPABASE_URL'),
    supabase_key: !!getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    google_places_key: !!getEnv('GOOGLE_PLACES_API_KEY'),
  };

  const allRequired = checks.anthropic_key;

  return NextResponse.json({
    status: allRequired ? 'ok' : 'misconfigured',
    checks,
    timestamp: new Date().toISOString(),
  }, { status: allRequired ? 200 : 503 });
}
