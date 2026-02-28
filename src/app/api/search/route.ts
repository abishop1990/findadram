import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { clampInt, parseCoord } from '@/lib/api-helpers';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const q = (searchParams.get('q') || '').slice(0, 200);
  const type = searchParams.get('type') || 'bar';
  const lat = parseCoord(searchParams.get('lat'), -90, 90);
  const lng = parseCoord(searchParams.get('lng'), -180, 180);
  const limit = clampInt(searchParams.get('limit'), 20, 1, 100);

  const supabase = await createServerSupabaseClient();
  const rpcArgs = {
    query: q,
    lat: lat ?? null,
    lng: lng ?? null,
    radius_meters: 50000,
    result_limit: limit,
  };

  if (type === 'whiskey') {
    const { data, error } = await supabase.rpc('search_whiskeys', rpcArgs);

    if (error) {
      console.error('GET /api/search (whiskey) error:', error.message);
      return NextResponse.json({ error: 'Search failed' }, { status: 500 });
    }

    return NextResponse.json({ results: data, type: 'whiskey' });
  }

  const { data, error } = await supabase.rpc('search_bars', rpcArgs);

  if (error) {
    console.error('GET /api/search (bar) error:', error.message);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }

  return NextResponse.json({ results: data, type: 'bar' });
}
