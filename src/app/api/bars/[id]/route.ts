import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();

  const { data: bar, error: barError } = await supabase
    .from('bars')
    .select('*')
    .eq('id', id)
    .single();

  if (barError || !bar) {
    return NextResponse.json({ error: 'Bar not found' }, { status: 404 });
  }

  const { data: whiskeys, error: whiskeysError } = await supabase
    .from('bar_whiskeys')
    .select(`
      id,
      price,
      pour_size,
      available,
      notes,
      last_verified,
      whiskey:whiskeys (
        id,
        name,
        distillery,
        type,
        age,
        abv,
        description
      )
    `)
    .eq('bar_id', id)
    .eq('available', true)
    .order('price', { ascending: true });

  if (whiskeysError) {
    return NextResponse.json({ error: whiskeysError.message }, { status: 500 });
  }

  return NextResponse.json({ bar, whiskeys });
}
