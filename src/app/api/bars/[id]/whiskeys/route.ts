import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// ─── helpers ─────────────────────────────────────────────────────────────────

/**
 * Verify that the currently authenticated user has an approved bar_claim for
 * the given barId. Returns the user's profile id on success, or null if the
 * check fails (unauthenticated, no profile, or no approved claim).
 */
async function verifyBarOwner(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  barId: string
): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('auth_user_id', user.id)
    .single();

  if (!profile) return null;

  const { data: claim } = await supabase
    .from('bar_claims')
    .select('id')
    .eq('bar_id', barId)
    .eq('user_id', profile.id)
    .eq('status', 'approved')
    .single();

  return claim ? profile.id : null;
}

const VALID_POUR_SIZES = [
  '1oz', '1.5oz', '2oz', '25ml', '35ml', '50ml',
  'dram', 'flight', 'bottle', 'other',
] as const;

const VALID_WHISKEY_TYPES = [
  'bourbon', 'scotch', 'irish', 'rye', 'japanese',
  'canadian', 'single_malt', 'blended', 'other',
] as const;

// ─── GET /api/bars/[id]/whiskeys ──────────────────────────────────────────────
// Returns the full whiskey list for a bar (including unavailable entries).
// Requires authenticated bar owner. Public menu is at GET /api/bars/[id].

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();

  const ownerId = await verifyBarOwner(supabase, id);
  if (!ownerId) {
    return NextResponse.json(
      { error: 'Unauthorized — must be an approved bar owner' },
      { status: 401 }
    );
  }

  const { data: whiskeys, error } = await supabase
    .from('bar_whiskeys')
    .select(`
      id,
      bar_id,
      whiskey_id,
      price,
      pour_size,
      available,
      notes,
      last_verified,
      confidence,
      is_stale,
      created_at,
      updated_at,
      whiskey:whiskeys (
        id,
        name,
        normalized_name,
        distillery,
        region,
        country,
        type,
        age,
        abv,
        description,
        image_url,
        created_at,
        updated_at
      )
    `)
    .eq('bar_id', id)
    .order('available', { ascending: false })
    .order('price', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ whiskeys: whiskeys ?? [] });
}

// ─── PATCH /api/bars/[id]/whiskeys ────────────────────────────────────────────
// Update price, pour_size, notes, or available on a bar_whiskey entry.
// Requires authenticated bar owner.
// Body: { id: string (bar_whiskey id), price?, pour_size?, available?, notes? }

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: barId } = await params;
  const supabase = await createServerSupabaseClient();

  const ownerId = await verifyBarOwner(supabase, barId);
  if (!ownerId) {
    return NextResponse.json(
      { error: 'Unauthorized — must be an approved bar owner' },
      { status: 401 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { id: barWhiskeyId, price, pour_size, available, notes } = body as {
    id?: string;
    price?: number | null;
    pour_size?: string | null;
    available?: boolean;
    notes?: string | null;
  };

  if (!barWhiskeyId || typeof barWhiskeyId !== 'string') {
    return NextResponse.json({ error: 'id (bar_whiskey id) is required' }, { status: 400 });
  }

  // Confirm this bar_whiskey belongs to this bar
  const { data: existing } = await supabase
    .from('bar_whiskeys')
    .select('id')
    .eq('id', barWhiskeyId)
    .eq('bar_id', barId)
    .single();

  if (!existing) {
    return NextResponse.json(
      { error: 'bar_whiskey not found or does not belong to this bar' },
      { status: 404 }
    );
  }

  // Validate
  if (pour_size !== undefined && pour_size !== null && !VALID_POUR_SIZES.includes(pour_size as typeof VALID_POUR_SIZES[number])) {
    return NextResponse.json({ error: `Invalid pour_size: ${pour_size}` }, { status: 400 });
  }
  if (price !== undefined && price !== null && (typeof price !== 'number' || price < 0)) {
    return NextResponse.json({ error: 'price must be a non-negative number' }, { status: 400 });
  }

  // Build update payload — only include fields that were sent
  const updates: Record<string, unknown> = { last_verified: new Date().toISOString() };
  if (price !== undefined) updates.price = price;
  if (pour_size !== undefined) updates.pour_size = pour_size;
  if (available !== undefined) updates.available = available;
  if (notes !== undefined) updates.notes = notes;

  const { data: updated, error: updateError } = await supabase
    .from('bar_whiskeys')
    .update(updates)
    .eq('id', barWhiskeyId)
    .select('id, price, pour_size, available, notes, last_verified, is_stale')
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ bar_whiskey: updated });
}

// ─── POST /api/bars/[id]/whiskeys ─────────────────────────────────────────────
// Add a whiskey to the bar's menu.
// Requires authenticated bar owner.
// Body: { whiskey_id: string, price?, pour_size?, notes? }
//   OR: { new_whiskey: { name, type, distillery?, age? }, price?, pour_size?, notes? }

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: barId } = await params;
  const supabase = await createServerSupabaseClient();

  const ownerId = await verifyBarOwner(supabase, barId);
  if (!ownerId) {
    return NextResponse.json(
      { error: 'Unauthorized — must be an approved bar owner' },
      { status: 401 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { whiskey_id, price, pour_size, notes, new_whiskey } = body as {
    whiskey_id?: string;
    price?: number | null;
    pour_size?: string | null;
    notes?: string | null;
    new_whiskey?: {
      name: string;
      type: string;
      distillery?: string | null;
      age?: number | null;
    };
  };

  if (pour_size && !VALID_POUR_SIZES.includes(pour_size as typeof VALID_POUR_SIZES[number])) {
    return NextResponse.json({ error: `Invalid pour_size: ${pour_size}` }, { status: 400 });
  }

  let resolvedWhiskeyId: string;

  if (whiskey_id) {
    // Verify whiskey exists
    const { data: wCheck } = await supabase
      .from('whiskeys')
      .select('id')
      .eq('id', whiskey_id)
      .single();

    if (!wCheck) {
      return NextResponse.json({ error: 'Whiskey not found' }, { status: 404 });
    }
    resolvedWhiskeyId = whiskey_id;

  } else if (new_whiskey) {
    // Create a brand-new whiskey record
    if (!new_whiskey.name?.trim() || !new_whiskey.type) {
      return NextResponse.json(
        { error: 'new_whiskey requires name and type' },
        { status: 400 }
      );
    }
    if (!VALID_WHISKEY_TYPES.includes(new_whiskey.type as typeof VALID_WHISKEY_TYPES[number])) {
      return NextResponse.json({ error: `Invalid whiskey type: ${new_whiskey.type}` }, { status: 400 });
    }

    const { data: created, error: createError } = await supabase
      .from('whiskeys')
      .insert({
        name: new_whiskey.name.trim(),
        type: new_whiskey.type as typeof VALID_WHISKEY_TYPES[number],
        distillery: new_whiskey.distillery ?? null,
        age: new_whiskey.age ?? null,
      })
      .select('id')
      .single();

    if (createError || !created) {
      return NextResponse.json(
        { error: createError?.message ?? 'Failed to create whiskey' },
        { status: 500 }
      );
    }
    resolvedWhiskeyId = created.id;

  } else {
    return NextResponse.json(
      { error: 'Provide either whiskey_id or new_whiskey' },
      { status: 400 }
    );
  }

  // Insert the bar_whiskey join row
  const { data: inserted, error: insertError } = await supabase
    .from('bar_whiskeys')
    .insert({
      bar_id: barId,
      whiskey_id: resolvedWhiskeyId,
      price: price ?? null,
      pour_size: pour_size ?? null,
      notes: notes ?? null,
      available: true,
      source_type: 'bar_owner',
      confidence: 1,
    })
    .select('id, bar_id, whiskey_id, price, pour_size, available, notes, last_verified')
    .single();

  if (insertError) {
    if (insertError.code === '23505') {
      return NextResponse.json(
        { error: 'This whiskey is already on the menu' },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ ...inserted }, { status: 201 });
}
