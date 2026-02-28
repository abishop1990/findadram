import { createServerSupabaseClient } from '@/lib/supabase/server';
import { BarCard } from '@/components/features/BarCard';
import { SearchBar } from '@/components/features/SearchBar';

export default async function BarsPage() {
  const supabase = await createServerSupabaseClient();

  const { data: bars } = await supabase
    .from('bars')
    .select('id, name, address, city, state, bar_whiskeys(count)')
    .order('name');

  return (
    <div>
      {/* Header */}
      <section className="bg-gradient-to-br from-whiskey-950 via-whiskey-900 to-whiskey-800">
        <div className="mx-auto max-w-6xl px-4 py-12 text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-whiskey-100 mb-3">
            Bars
          </h1>
          <p className="text-whiskey-300 mb-6 max-w-lg mx-auto">
            Browse whiskey bars across the Pacific Northwest. Click any bar to see their full whiskey menu.
          </p>
          <div className="flex justify-center">
            <SearchBar defaultType="bar" />
          </div>
        </div>
      </section>

      {/* Bar Grid */}
      <section className="mx-auto max-w-6xl px-4 py-10">
        {bars && bars.length > 0 ? (
          <>
            <p className="text-sm text-oak-500 mb-6">
              Showing {bars.length} {bars.length === 1 ? 'bar' : 'bars'}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {bars.map((bar) => (
                <BarCard
                  key={bar.id}
                  id={bar.id}
                  name={bar.name}
                  address={bar.address}
                  city={bar.city}
                  state={bar.state}
                  whiskey_count={(bar.bar_whiskeys as unknown as { count: number }[])?.[0]?.count ?? 0}
                />
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-16">
            <p className="text-whiskey-800 text-lg font-medium">No bars found</p>
            <p className="text-oak-500 mt-1">Check back soon — we&apos;re adding more bars.</p>
          </div>
        )}
      </section>
    </div>
  );
}
