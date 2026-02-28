import { NextResponse, type NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * PATCH /api/bar-whiskeys
 * Update price, availability, or notes for a bar_whiskey row.
 * Only bar owners with an approved claim can use this.
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { id, price, available, notes, pour_size } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (price !== undefined) updateData.price = price;
    if (available !== undefined) updateData.available = available;
    if (notes !== undefined) updateData.notes = notes;
    if (pour_size !== undefined) updateData.pour_size = pour_size;
    updateData.last_verified = new Date().toISOString();

    const { data, error } = await supabase
      .from('bar_whiskeys')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('PATCH /api/bar-whiskeys error:', error.message);
      return NextResponse.json({ error: 'Failed to update bar whiskey' }, { status: 500 });
    }

    return NextResponse.json({ bar_whiskey: data });
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 },
    );
  }
}
