import { NextResponse, type NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bar_id, user_id } = body;

    if (!bar_id || !user_id) {
      return NextResponse.json(
        { error: 'bar_id and user_id are required' },
        { status: 400 },
      );
    }

    const supabase = await createServerSupabaseClient();

    // Check for existing claim
    const { data: existing } = await supabase
      .from('bar_claims')
      .select('id')
      .eq('bar_id', bar_id)
      .eq('user_id', user_id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: 'You already have a claim for this bar' },
        { status: 409 },
      );
    }

    const { data: claim, error } = await supabase
      .from('bar_claims')
      .insert({ bar_id, user_id })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ claim }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 },
    );
  }
}
