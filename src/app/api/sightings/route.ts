import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { clampInt } from '@/lib/api-helpers';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const bar_id = searchParams.get('bar_id');
  const whiskey_id = searchParams.get('whiskey_id');
  const limit = clampInt(searchParams.get('limit'), 20, 1, 100);

  const supabase = await createServerSupabaseClient();

  let query = supabase
    .from('sightings')
    .select(`
      id,
      session_id,
      bar_id,
      whiskey_id,
      price,
      pour_size,
      rating,
      notes,
      created_at,
      bar:bars ( id, name ),
      whiskey:whiskeys ( id, name, distillery, type )
    `)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (bar_id) query = query.eq('bar_id', bar_id);
  if (whiskey_id) query = query.eq('whiskey_id', whiskey_id);

  const { data, error } = await query;

  if (error) {
    console.error('GET /api/sightings error:', error.message);
    return NextResponse.json({ error: 'Failed to fetch sightings' }, { status: 500 });
  }

  return NextResponse.json({ sightings: data });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { session_id, bar_id, whiskey_id, price, pour_size, rating, notes } = body;

  if (!session_id || !bar_id || !whiskey_id) {
    return NextResponse.json(
      { error: 'session_id, bar_id, and whiskey_id are required' },
      { status: 400 }
    );
  }

  const validPourSizes = ['1oz', '1.5oz', '2oz', '25ml', '35ml', '50ml', 'dram', 'flight', 'bottle', 'other'];
  if (pour_size && !validPourSizes.includes(pour_size)) {
    return NextResponse.json({ error: 'Invalid pour size' }, { status: 400 });
  }

  if (rating !== undefined && rating !== null && (rating < 1 || rating > 5)) {
    return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 });
  }

  if (price !== undefined && price !== null && (typeof price !== 'number' || price < 0 || price > 10000)) {
    return NextResponse.json({ error: 'Price must be between 0 and 10000' }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from('sightings')
    .insert({
      session_id,
      bar_id,
      whiskey_id,
      price: price ?? null,
      pour_size: pour_size ?? null,
      rating: rating ?? null,
      notes: notes ?? null,
    })
    .select('id, created_at')
    .single();

  if (error) {
    console.error('POST /api/sightings error:', error.message);
    return NextResponse.json({ error: 'Failed to create sighting' }, { status: 500 });
  }

  return NextResponse.json({ sighting: data }, { status: 201 });
}
