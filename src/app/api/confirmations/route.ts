import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { clampInt } from '@/lib/api-helpers';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const bar_whiskey_id = searchParams.get('bar_whiskey_id');
  const limit = clampInt(searchParams.get('limit'), 20, 1, 100);

  const supabase = await createServerSupabaseClient();

  let query = supabase
    .from('confirmations')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (bar_whiskey_id) query = query.eq('bar_whiskey_id', bar_whiskey_id);

  const { data, error } = await query;

  if (error) {
    console.error('GET /api/confirmations error:', error.message);
    return NextResponse.json({ error: 'Failed to fetch confirmations' }, { status: 500 });
  }

  // Aggregate confirmation stats
  const stats = {
    confirmed: data?.filter(c => c.status === 'confirmed').length ?? 0,
    not_found: data?.filter(c => c.status === 'not_found').length ?? 0,
    last_confirmed: data?.find(c => c.status === 'confirmed')?.created_at ?? null,
    last_not_found: data?.find(c => c.status === 'not_found')?.created_at ?? null,
  };

  return NextResponse.json({ confirmations: data, stats });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { session_id, bar_whiskey_id, status, notes } = body;

  if (!session_id || !bar_whiskey_id || !status) {
    return NextResponse.json(
      { error: 'session_id, bar_whiskey_id, and status are required' },
      { status: 400 }
    );
  }

  if (!['confirmed', 'not_found'].includes(status)) {
    return NextResponse.json({ error: 'Status must be confirmed or not_found' }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from('confirmations')
    .insert({
      session_id,
      bar_whiskey_id,
      status,
      notes: notes ?? null,
    })
    .select('id, created_at')
    .single();

  if (error) {
    console.error('POST /api/confirmations error:', error.message);
    return NextResponse.json({ error: 'Failed to create confirmation' }, { status: 500 });
  }

  return NextResponse.json({ confirmation: data }, { status: 201 });
}
