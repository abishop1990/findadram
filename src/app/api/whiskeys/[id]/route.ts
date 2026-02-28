import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const searchParams = request.nextUrl.searchParams;
  const lat = searchParams.get('lat') ? parseFloat(searchParams.get('lat')!) : undefined;
  const lng = searchParams.get('lng') ? parseFloat(searchParams.get('lng')!) : undefined;

  const supabase = await createServerSupabaseClient();

  const { data: whiskey, error: whiskeyError } = await supabase
    .from('whiskeys')
    .select('*')
    .eq('id', id)
    .single();

  if (whiskeyError || !whiskey) {
    return NextResponse.json({ error: 'Whiskey not found' }, { status: 404 });
  }

  const { data: bars, error: barsError } = await supabase
    .from('bar_whiskeys')
    .select(`
      id,
      price,
      pour_size,
      available,
      notes,
      bar:bars (
        id,
        name,
        address,
        city,
        state,
        location
      )
    `)
    .eq('whiskey_id', id)
    .eq('available', true);

  if (barsError) {
    return NextResponse.json({ error: barsError.message }, { status: 500 });
  }

  // Calculate distances if location provided
  const barsWithDistance = bars?.map((entry) => {
    const bar = entry.bar as unknown as { id: string; name: string; address: string; city: string; state: string; location: string };
    return {
      ...entry,
      bar,
      distance_meters: lat && lng ? null : null, // Distance calculated client-side or via RPC
    };
  });

  return NextResponse.json({ whiskey, bars: barsWithDistance });
}
