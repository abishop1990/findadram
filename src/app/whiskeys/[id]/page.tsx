import { notFound } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { BarList } from '@/components/features/BarList';
import { Badge } from '@/components/ui/Badge';
import Link from 'next/link';

const typeLabels: Record<string, string> = {
  bourbon: 'Bourbon',
  scotch: 'Scotch',
  irish: 'Irish Whiskey',
  rye: 'Rye',
  japanese: 'Japanese Whisky',
  canadian: 'Canadian Whisky',
  single_malt: 'Single Malt',
  blended: 'Blended',
  other: 'Whiskey',
};

export default async function WhiskeyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();

  const { data: whiskey, error: whiskeyError } = await supabase
    .from('whiskeys')
    .select('*')
    .eq('id', id)
    .single();

  if (whiskeyError || !whiskey) {
    notFound();
  }

  const { data: barEntries } = await supabase
    .from('bar_whiskeys')
    .select(`
      id,
      price,
      pour_size,
      bar:bars (
        id,
        name,
        address,
        city,
        state
      )
    `)
    .eq('whiskey_id', id)
    .eq('available', true);

  const bars = (barEntries || []).map((entry) => ({
    id: entry.id,
    price: entry.price,
    pour_size: entry.pour_size,
    bar: entry.bar as unknown as {
      id: string;
      name: string;
      address: string | null;
      city: string | null;
      state: string | null;
    },
  }));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Link href="/search?type=whiskey" className="text-sm text-amber-600 hover:text-amber-700 mb-4 inline-block">
        &larr; Back to search
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Whiskey Info */}
        <div className="lg:col-span-2">
          <h1 className="text-3xl font-bold text-stone-900 mb-2">{whiskey.name}</h1>
          {whiskey.distillery && (
            <p className="text-lg text-stone-600 mb-2">{whiskey.distillery}</p>
          )}
          {whiskey.region && (
            <p className="text-stone-500 text-sm mb-4">{whiskey.region}{whiskey.country ? `, ${whiskey.country}` : ''}</p>
          )}

          <div className="flex flex-wrap gap-2 mb-6">
            <Badge variant="amber">{typeLabels[whiskey.type] || whiskey.type}</Badge>
            {whiskey.age && <Badge variant="default">{whiskey.age} years</Badge>}
            {whiskey.abv && <Badge variant="default">{whiskey.abv}% ABV</Badge>}
          </div>

          {whiskey.description && (
            <p className="text-stone-600 mb-8 leading-relaxed">{whiskey.description}</p>
          )}

          {/* Bars carrying this whiskey */}
          <div className="bg-white rounded-lg border border-stone-200 p-4">
            <h2 className="text-xl font-semibold text-stone-900 mb-4">
              Available at {bars.length} {bars.length === 1 ? 'bar' : 'bars'}
            </h2>
            <BarList bars={bars} />
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="sticky top-20 bg-white rounded-lg border border-stone-200 p-4">
            <h3 className="font-semibold text-stone-900 mb-3">Details</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-stone-500">Type</dt>
                <dd className="text-stone-900 font-medium">{typeLabels[whiskey.type] || whiskey.type}</dd>
              </div>
              {whiskey.distillery && (
                <div className="flex justify-between">
                  <dt className="text-stone-500">Distillery</dt>
                  <dd className="text-stone-900 font-medium">{whiskey.distillery}</dd>
                </div>
              )}
              {whiskey.age && (
                <div className="flex justify-between">
                  <dt className="text-stone-500">Age</dt>
                  <dd className="text-stone-900 font-medium">{whiskey.age} years</dd>
                </div>
              )}
              {whiskey.abv && (
                <div className="flex justify-between">
                  <dt className="text-stone-500">ABV</dt>
                  <dd className="text-stone-900 font-medium">{whiskey.abv}%</dd>
                </div>
              )}
              {whiskey.region && (
                <div className="flex justify-between">
                  <dt className="text-stone-500">Region</dt>
                  <dd className="text-stone-900 font-medium">{whiskey.region}</dd>
                </div>
              )}
              {whiskey.country && (
                <div className="flex justify-between">
                  <dt className="text-stone-500">Country</dt>
                  <dd className="text-stone-900 font-medium">{whiskey.country}</dd>
                </div>
              )}
            </dl>
            {bars.length > 0 && (
              <div className="mt-4 pt-4 border-t border-stone-100">
                <p className="text-sm text-stone-500">
                  Price range: {' '}
                  <span className="text-amber-700 font-medium">
                    {(() => {
                      const prices = bars.filter(b => b.price != null).map(b => b.price!);
                      if (prices.length === 0) return 'N/A';
                      const min = Math.min(...prices);
                      const max = Math.max(...prices);
                      return min === max ? `$${min.toFixed(2)}` : `$${min.toFixed(2)} — $${max.toFixed(2)}`;
                    })()}
                  </span>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
