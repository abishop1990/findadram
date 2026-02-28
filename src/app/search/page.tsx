import Link from 'next/link';
import { headers } from 'next/headers';
import { SearchBar } from '@/components/features/SearchBar';
import { BarCard } from '@/components/features/BarCard';
import { WhiskeyCard } from '@/components/features/WhiskeyCard';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { BarSearchResult, WhiskeySearchResult, SearchType } from '@/types/search';

async function reverseGeocode(lat: number, lng: number, baseUrl: string): Promise<string | null> {
  try {
    const res = await fetch(`${baseUrl}/api/geocode?lat=${lat}&lng=${lng}`, {
      next: { revalidate: 86400 },
    });
    if (!res.ok) return null;
    const data = await res.json() as {
      address?: {
        city?: string;
        town?: string;
        village?: string;
        state?: string;
        country?: string;
      };
      display_name?: string;
    };
    const addr = data.address;
    if (!addr) return null;
    const city = addr.city ?? addr.town ?? addr.village;
    const state = addr.state;
    if (city && state) return `${city}, ${state}`;
    if (city) return city;
    if (data.display_name) return data.display_name.split(',')[0];
    return null;
  } catch {
    return null;
  }
}

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
  const hasCoordinates = lat !== undefined && lng !== undefined && !isNaN(lat) && !isNaN(lng);

  // Resolve base URL for internal API calls (server-side)
  const headersList = await headers();
  const host = headersList.get('host') ?? 'localhost:3000';
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
  const baseUrl = `${protocol}://${host}`;

  // Reverse geocode if coordinates are present
  const locationName = hasCoordinates
    ? await reverseGeocode(lat as number, lng as number, baseUrl)
    : null;

  const supabase = await createServerSupabaseClient();

  let barResults: BarSearchResult[] = [];
  let whiskeyResults: WhiskeySearchResult[] = [];
  let totalCount = 0;

  const RESULT_LIMIT = 50;

  const rpcArgs = {
    query: q,
    lat: lat ?? null,
    lng: lng ?? null,
    radius_meters: 50000,
    result_limit: RESULT_LIMIT,
  };

  if (type === 'bar') {
    const [{ data }, { count }] = await Promise.all([
      supabase.rpc('search_bars', rpcArgs),
      supabase.from('bars').select('id', { count: 'exact', head: true }),
    ]);
    barResults = (data as BarSearchResult[] | null) ?? [];
    totalCount = count ?? barResults.length;
  } else {
    const [{ data }, { count }] = await Promise.all([
      supabase.rpc('search_whiskeys', rpcArgs),
      supabase.from('whiskeys').select('id', { count: 'exact', head: true }),
    ]);
    whiskeyResults = (data as WhiskeySearchResult[] | null) ?? [];
    totalCount = count ?? whiskeyResults.length;
  }

  const hasResults = type === 'bar' ? barResults.length > 0 : whiskeyResults.length > 0;
  const resultCount = type === 'bar' ? barResults.length : whiskeyResults.length;

  return (
    <div className="min-h-screen bg-whiskey-50">
      {/* Search Header Section */}
      <section className="bg-gradient-to-br from-whiskey-950 via-whiskey-900 to-whiskey-800 py-8">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mb-4 flex justify-center">
            <SearchBar
              defaultQuery={q}
              defaultType={type}
              defaultLat={hasCoordinates ? lat : undefined}
              defaultLng={hasCoordinates ? lng : undefined}
              defaultLocationName={locationName ?? undefined}
            />
          </div>

          <div className="flex flex-col items-center gap-2">
            {q && (
              <p className="text-center text-sm font-semibold text-whiskey-100">
                Found {resultCount} {type === 'bar' ? 'bar' : 'whiskey'}{resultCount !== 1 ? 's' : ''} matching &quot;{q}&quot;
                {resultCount >= RESULT_LIMIT && (
                  <span className="font-normal text-whiskey-300"> (showing top {RESULT_LIMIT})</span>
                )}
              </p>
            )}
            {hasCoordinates && (
              <p className="text-center text-xs text-oak-300 flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {locationName ? `Showing results near ${locationName}` : 'Showing results near your location'}
              </p>
            )}
          </div>
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
              {hasCoordinates
                ? `Adjust your location or expand the search radius${locationName ? ` around ${locationName}` : ''}.`
                : 'Enable location access to search nearby areas.'}
            </p>
          </div>
        )}

        {!q && hasResults && (
          <div className="mb-6 rounded-lg border border-oak-200 bg-white px-5 py-3 text-center shadow-sm">
            <p className="text-sm text-oak-600">
              {hasCoordinates
                ? `Showing ${resultCount} of ${totalCount} ${type === 'bar' ? 'bar' : 'whiskey'}${totalCount !== 1 ? 's' : ''} near ${locationName ?? 'your location'} — use the search bar above to filter`
                : `Showing ${resultCount} of ${totalCount} ${type === 'bar' ? 'bar' : 'whiskey'}${totalCount !== 1 ? 's' : ''} — use the search bar above to filter`}
            </p>
            {resultCount < totalCount && (
              <p className="text-xs text-oak-500 mt-1">
                <Link href={type === 'bar' ? '/bars' : '/whiskeys'} className="text-whiskey-600 hover:text-whiskey-500 underline underline-offset-2">
                  Browse all {totalCount} {type === 'bar' ? 'bars' : 'whiskeys'}
                </Link>
              </p>
            )}
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3">
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

        {/* Cross-link to bottle search */}
        {q && type === 'whiskey' && (
          <div className="mt-8 rounded-xl bg-gradient-to-r from-amber-50 to-whiskey-50 border border-amber-200 p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-whiskey-900">Want to buy a bottle?</p>
              <p className="text-sm text-oak-600 mt-0.5">
                Search Oregon liquor stores for &ldquo;{q}&rdquo; to find bottles in stock near you.
              </p>
            </div>
            <Link
              href={`/bottles?q=${encodeURIComponent(q)}`}
              className="shrink-0 inline-flex items-center gap-2 rounded-lg bg-whiskey-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-whiskey-500 transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              Find Bottles
            </Link>
          </div>
        )}

        {/* Cross-link to whiskey search from bars */}
        {q && type === 'bar' && (
          <div className="mt-8 rounded-xl bg-gradient-to-r from-whiskey-50 to-oak-50 border border-oak-200 p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-whiskey-900">Looking for a specific whiskey?</p>
              <p className="text-sm text-oak-600 mt-0.5">
                Search our whiskey catalog to find which Portland bars carry it.
              </p>
            </div>
            <Link
              href={`/search?q=${encodeURIComponent(q)}&type=whiskey`}
              className="shrink-0 inline-flex items-center gap-2 rounded-lg border border-whiskey-300 bg-white px-5 py-2.5 text-sm font-semibold text-whiskey-800 hover:bg-whiskey-50 transition-colors"
            >
              Search Whiskeys Instead
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
