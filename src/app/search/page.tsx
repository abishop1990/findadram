import { SearchBar } from '@/components/features/SearchBar';
import { BarCard } from '@/components/features/BarCard';
import { WhiskeyCard } from '@/components/features/WhiskeyCard';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { BarSearchResult, WhiskeySearchResult, SearchType } from '@/types/search';

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string; lat?: string; lng?: string }>;
}) {
  const params = await searchParams;
  const q = params.q || '';
  const type: SearchType = (params.type === 'bar' ? 'bar' : 'whiskey');
  const lat = params.lat ? parseFloat(params.lat) : undefined;
  const lng = params.lng ? parseFloat(params.lng) : undefined;
  const hasCoordinates = lat !== undefined && lng !== undefined;

  const supabase = await createServerSupabaseClient();

  let barResults: BarSearchResult[] = [];
  let whiskeyResults: WhiskeySearchResult[] = [];

  const rpcArgs = {
    query: q,
    lat: lat ?? null,
    lng: lng ?? null,
    radius_meters: 50000,
    result_limit: 20,
  };

  if (type === 'bar') {
    const { data } = await supabase.rpc('search_bars', rpcArgs);
    barResults = (data as BarSearchResult[] | null) ?? [];
  } else {
    const { data } = await supabase.rpc('search_whiskeys', rpcArgs);
    whiskeyResults = (data as WhiskeySearchResult[] | null) ?? [];
  }

  const hasResults = type === 'bar' ? barResults.length > 0 : whiskeyResults.length > 0;
  const resultCount = type === 'bar' ? barResults.length : whiskeyResults.length;

  return (
    <div className="min-h-screen bg-whiskey-50">
      {/* Search Header Section */}
      <section className="bg-gradient-to-br from-whiskey-950 via-whiskey-900 to-whiskey-800 py-8">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mb-4 flex justify-center">
            <SearchBar defaultQuery={q} defaultType={type} />
          </div>

          {q && (
            <div className="flex flex-col items-center gap-2">
              <p className="text-center text-sm font-semibold text-whiskey-100">
                Found {resultCount} {type === 'bar' ? 'bar' : 'whiskey'}{resultCount !== 1 ? 's' : ''} matching &quot;{q}&quot;
              </p>
              {hasCoordinates && (
                <p className="text-center text-xs text-oak-300 flex items-center gap-1">
                  <span>📍</span> Searching nearby area
                </p>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Results Section */}
      <section className="mx-auto max-w-6xl px-4 py-12">
        {!hasResults && q && (
          <div className="rounded-lg border border-oak-300 bg-oak-50 p-8 text-center">
            <p className="text-lg font-semibold text-whiskey-900">
              No {type === 'bar' ? 'bars' : 'whiskeys'} found for &quot;{q}&quot;
            </p>
            <p className="mt-3 text-sm text-whiskey-700">
              Try searching with different terms, or submit a menu from your favorite spot to help us grow our database.
            </p>
            <p className="mt-2 text-xs text-whiskey-600">
              {hasCoordinates ? 'Adjust your location or expand the search radius.' : 'Enable location access to search nearby areas.'}
            </p>
          </div>
        )}

        {!q && hasResults && (
          <div className="mb-6 rounded-lg border border-oak-200 bg-white px-5 py-3 text-center shadow-sm">
            <p className="text-sm text-oak-600">
              Showing all {resultCount} {type === 'bar' ? 'bar' : 'whiskey'}{resultCount !== 1 ? 's' : ''} — use the search bar above to filter
            </p>
          </div>
        )}

        {!q && !hasResults && (
          <div className="rounded-lg border border-oak-300 bg-oak-50 p-8 text-center">
            <p className="text-lg font-semibold text-whiskey-900">
              Explore our collection
            </p>
            <p className="mt-2 text-sm text-whiskey-700">
              Use the search bar above to find {type === 'bar' ? 'bars' : 'whiskeys'} near you or across the country.
            </p>
          </div>
        )}

        {hasResults && (
          <>
            <h2 className="mb-6 flex items-center gap-3 text-2xl font-bold text-whiskey-900">
              <span className="text-whiskey-500">🥃</span>
              <span>{type === 'bar' ? 'Bars' : 'Whiskeys'}</span>
              <span className="text-sm font-normal text-oak-600">({resultCount})</span>
            </h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {type === 'bar' &&
                barResults.map((bar) => (
                  <BarCard
                    key={bar.id}
                    id={bar.id}
                    name={bar.name}
                    address={bar.address}
                    city={bar.city}
                    state={bar.state}
                    distance_meters={bar.distance_meters}
                    whiskey_count={bar.whiskey_count}
                  />
                ))}
              {type === 'whiskey' &&
                whiskeyResults.map((w) => (
                  <WhiskeyCard
                    key={w.id}
                    id={w.id}
                    name={w.name}
                    distillery={w.distillery}
                    type={w.type}
                    age={w.age}
                    bar_count={w.bar_count}
                    nearest_bar_name={w.nearest_bar_name}
                    nearest_bar_distance={w.nearest_bar_distance}
                  />
                ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
