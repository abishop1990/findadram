import { notFound } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { WhiskeyListWithActions } from '@/components/features/WhiskeyListWithActions';
import { ActivityFeed } from '@/components/features/ActivityFeed';
import { Badge } from '@/components/ui/Badge';
import Link from 'next/link';

export default async function BarDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();

  const { data: bar, error: barError } = await supabase
    .from('bars')
    .select('*')
    .eq('id', id)
    .single();

  if (barError || !bar) {
    notFound();
  }

  const { data: whiskeyEntries } = await supabase
    .from('bar_whiskeys')
    .select(`
      id,
      price,
      pour_size,
      available,
      notes,
      last_verified,
      confidence,
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

  const whiskeys = (whiskeyEntries || []).map((entry) => ({
    id: entry.id,
    price: entry.price,
    pour_size: entry.pour_size,
    notes: entry.notes,
    last_verified: entry.last_verified,
    confidence: entry.confidence,
    whiskey: entry.whiskey as unknown as {
      id: string;
      name: string;
      distillery: string | null;
      type: string;
      age: number | null;
      abv: number | null;
    },
  }));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Link href="/search?type=bar" className="text-sm text-whiskey-500 hover:text-whiskey-400 mb-4 inline-flex items-center gap-1">
        <span>&larr;</span> Back to search
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-4">
        {/* Bar Info + Whiskey List */}
        <div className="lg:col-span-2">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-whiskey-900 mb-2">{bar.name}</h1>
            {bar.address && (
              <p className="text-oak-600">{bar.address}</p>
            )}
            {(bar.city || bar.state) && (
              <p className="text-oak-500 text-sm">
                {[bar.city, bar.state, bar.country].filter(Boolean).join(', ')}
              </p>
            )}
            <div className="flex flex-wrap gap-2 mt-3">
              {bar.phone && <Badge variant="default">{bar.phone}</Badge>}
              {bar.website && (
                <a href={bar.website} target="_blank" rel="noopener noreferrer">
                  <Badge variant="blue">Website</Badge>
                </a>
              )}
              <Badge variant="amber">{whiskeys.length} whiskeys</Badge>
            </div>
          </div>

          {/* Whiskey Menu */}
          <div className="bg-white rounded-xl border border-oak-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-whiskey-900">Whiskey Menu</h2>
            </div>
            <WhiskeyListWithActions whiskeys={whiskeys} barId={id} barName={bar.name} />
          </div>
        </div>

        {/* Sidebar: Activity Feed */}
        <div className="lg:col-span-1">
          <div className="sticky top-20 space-y-6">
            {bar.website && (
              <a
                href={bar.website}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full text-center px-4 py-2.5 bg-whiskey-600 text-whiskey-50 rounded-lg hover:bg-whiskey-500 transition-colors font-medium"
              >
                Visit Website
              </a>
            )}

            <div className="bg-white rounded-xl border border-oak-200 shadow-sm p-4">
              <h3 className="font-semibold text-whiskey-900 mb-3 flex items-center gap-2">
                <span>📋</span> Recent Activity
              </h3>
              <ActivityFeed barId={id} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
