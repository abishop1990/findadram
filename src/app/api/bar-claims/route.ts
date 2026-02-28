import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// ─── GET /api/bar-claims ──────────────────────────────────────────────────────
// List all bar claims for the currently authenticated user.
// Returns claims joined with bar details.

export async function GET(_request: NextRequest) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized — must be signed in to view claims' },
      { status: 401 }
    );
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('auth_user_id', user.id)
    .single();

  if (!profile) {
    return NextResponse.json(
      { error: 'User profile not found' },
      { status: 404 }
    );
  }

  const { data: claims, error } = await supabase
    .from('bar_claims')
    .select(`
      id,
      bar_id,
      user_id,
      status,
      created_at,
      updated_at,
      bar:bars (
        id,
        name,
        address,
        city,
        state
      )
    `)
    .eq('user_id', profile.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('GET /api/bar-claims error:', error.message);
    return NextResponse.json({ error: 'Failed to fetch claims' }, { status: 500 });
  }

  return NextResponse.json({ claims: claims ?? [] });
}

// ─── POST /api/bar-claims ─────────────────────────────────────────────────────
// Submit a bar ownership claim.
// Requires authentication.
// Body: { bar_id: string, user_id: string }
// user_id must match the authenticated user's profile id (prevents spoofing).

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized — must be signed in to claim a bar' },
      { status: 401 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { bar_id, user_id } = body as { bar_id?: string; user_id?: string };

  if (!bar_id || typeof bar_id !== 'string') {
    return NextResponse.json({ error: 'bar_id is required' }, { status: 400 });
  }
  if (!user_id || typeof user_id !== 'string') {
    return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
  }

  // Fetch the user's profile and verify the provided user_id matches
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('auth_user_id', user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
  }

  if (profile.id !== user_id) {
    return NextResponse.json(
      { error: 'user_id does not match authenticated user' },
      { status: 403 }
    );
  }

  // Verify the bar exists
  const { data: bar } = await supabase
    .from('bars')
    .select('id, name')
    .eq('id', bar_id)
    .single();

  if (!bar) {
    return NextResponse.json({ error: 'Bar not found' }, { status: 404 });
  }

  // Check for an existing claim from this user for this bar
  const { data: existing } = await supabase
    .from('bar_claims')
    .select('id, status')
    .eq('bar_id', bar_id)
    .eq('user_id', profile.id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      {
        error: 'You already have a claim for this bar',
        claim_id: existing.id,
        status: existing.status,
      },
      { status: 409 }
    );
  }

  // Insert the claim
  const { data: claim, error: insertError } = await supabase
    .from('bar_claims')
    .insert({
      bar_id,
      user_id: profile.id,
      status: 'pending',
    })
    .select('id, bar_id, user_id, status, created_at')
    .single();

  if (insertError) {
    if (insertError.code === '23505') {
      // Unique constraint race condition
      return NextResponse.json(
        { error: 'You already have a claim for this bar' },
        { status: 409 }
      );
    }
    console.error('POST /api/bar-claims error:', insertError.message);
    return NextResponse.json({ error: 'Failed to create claim' }, { status: 500 });
  }

  return NextResponse.json({ claim, bar_name: bar.name }, { status: 201 });
}
