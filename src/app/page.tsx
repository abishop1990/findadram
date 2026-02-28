import { SearchBar } from '@/components/features/SearchBar';
import { LocationPrompt } from '@/components/features/LocationPrompt';
import { BarCard } from '@/components/features/BarCard';
import { WhiskeyCard } from '@/components/features/WhiskeyCard';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export default async function HomePage() {
  const supabase = await createServerSupabaseClient();

  const { data: bars } = await supabase
    .from('bars')
    .select('id, name, address, city, state')
    .limit(6);

  const { data: whiskeys } = await supabase
    .from('whiskeys')
    .select('id, name, distillery, type, age')
    .limit(8);

  const { data: recentSightings } = await supabase
    .from('sightings')
    .select(`
      id,
      price,
      pour_size,
      rating,
      created_at,
      bar:bars ( id, name ),
      whiskey:whiskeys ( id, name, type )
    `)
    .order('created_at', { ascending: false })
    .limit(5);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-whiskey-950 via-whiskey-900 to-whiskey-800" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCI+CjxyZWN0IHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgZmlsbD0ibm9uZSIvPgo8Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIxIiBmaWxsPSJyZ2JhKDIxMiwxNjcsODYsMC4wNSkiLz4KPC9zdmc+')] opacity-50" />
        <div className="relative mx-auto max-w-6xl px-4 py-20 md:py-28 text-center">
          <div className="text-5xl mb-4">🥃</div>
          <h1 className="text-4xl md:text-6xl font-bold text-whiskey-100 mb-4 tracking-tight">
            Find Your Next Dram
          </h1>
          <p className="text-lg md:text-xl text-whiskey-300 mb-10 max-w-2xl mx-auto leading-relaxed">
            Discover whiskeys at bars near you. Search by name, distillery, or style —
            or submit a bar menu and we&apos;ll catalog it.
          </p>
          <div className="flex flex-col items-center gap-4">
            <SearchBar />
            <LocationPrompt />
          </div>
        </div>
      </section>

      {/* Recent Sightings */}
      {recentSightings && recentSightings.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-12">
          <h2 className="text-2xl font-bold text-whiskey-900 mb-6 flex items-center gap-2">
            <span>🔥</span> Recent Sightings
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            {recentSightings.map((s) => {
              const bar = s.bar as unknown as { id: string; name: string } | null;
              const whiskey = s.whiskey as unknown as { id: string; name: string; type: string } | null;
              if (!bar || !whiskey) return null;
              return (
                <div key={s.id} className="rounded-lg border border-oak-200 bg-white p-3 shadow-sm">
                  <p className="font-medium text-whiskey-800 text-sm truncate">{whiskey.name}</p>
                  <p className="text-xs text-oak-500 truncate">at {bar.name}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    {s.price != null && (
                      <span className="text-xs font-semibold text-whiskey-600">${(s.price as number).toFixed(2)}</span>
                    )}
                    {s.rating && (
                      <span className="text-amber-500 text-xs">{'★'.repeat(s.rating as number)}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Featured Bars */}
      {bars && bars.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-12">
          <h2 className="text-2xl font-bold text-whiskey-900 mb-6">Featured Bars</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {bars.map((bar) => (
              <BarCard
                key={bar.id}
                id={bar.id}
                name={bar.name}
                address={bar.address}
                city={bar.city}
                state={bar.state}
              />
            ))}
          </div>
        </section>
      )}

      {/* Featured Whiskeys */}
      {whiskeys && whiskeys.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-12">
          <h2 className="text-2xl font-bold text-whiskey-900 mb-6">Popular Whiskeys</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {whiskeys.map((whiskey) => (
              <WhiskeyCard
                key={whiskey.id}
                id={whiskey.id}
                name={whiskey.name}
                distillery={whiskey.distillery}
                type={whiskey.type}
                age={whiskey.age}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
