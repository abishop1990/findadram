import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { clampInt } from '@/lib/api-helpers';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const searchParams = request.nextUrl.searchParams;
  const limit = clampInt(searchParams.get('limit'), 20, 1, 100);

  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase.rpc('bar_activity', {
    target_bar_id: id,
    activity_limit: limit,
  });

  if (error) {
    console.error('GET /api/bars/[id]/activity error:', error.message);
    return NextResponse.json({ error: 'Failed to fetch activity' }, { status: 500 });
  }

  return NextResponse.json({ activity: data });
}
