import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const q = searchParams.get('q') || '';
  const type = searchParams.get('type') || 'bar';
  const lat = searchParams.get('lat') ? parseFloat(searchParams.get('lat')!) : undefined;
  const lng = searchParams.get('lng') ? parseFloat(searchParams.get('lng')!) : undefined;
  const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20;

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
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ results: data, type: 'whiskey' });
  }

  const { data, error } = await supabase.rpc('search_bars', rpcArgs);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ results: data, type: 'bar' });
}
