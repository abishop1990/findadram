import { NextResponse, type NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * PATCH /api/bars/[id]/whiskeys
 * Update price, availability, notes, or pour_size for a bar_whiskey row.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: barId } = await params;
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();

    const updateData: Record<string, unknown> = {};
    if (updates.price !== undefined) updateData.price = updates.price;
    if (updates.available !== undefined) updateData.available = updates.available;
    if (updates.notes !== undefined) updateData.notes = updates.notes;
    if (updates.pour_size !== undefined) updateData.pour_size = updates.pour_size;
    updateData.last_verified = new Date().toISOString();

    const { data, error } = await supabase
      .from('bar_whiskeys')
      .update(updateData)
      .eq('id', id)
      .eq('bar_id', barId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

/**
 * POST /api/bars/[id]/whiskeys
 * Add a whiskey to a bar's menu.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: barId } = await params;
    const body = await request.json();
    const { whiskey_id } = body;

    if (!whiskey_id) {
      return NextResponse.json({ error: 'whiskey_id is required' }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase
      .from('bar_whiskeys')
      .insert({
        bar_id: barId,
        whiskey_id,
        available: true,
        source_type: 'bar_owner',
      })
      .select('id')
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'This whiskey is already on the menu' }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
