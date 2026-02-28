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

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8 flex justify-center">
        <SearchBar defaultQuery={q} defaultType={type} />
      </div>

      {q && (
        <p className="text-sm text-stone-500 mb-4">
          {type === 'bar'
            ? `${barResults.length} bars found for "${q}"`
            : `${whiskeyResults.length} whiskeys found for "${q}"`}
        </p>
      )}

      {!hasResults && q && (
        <div className="text-center py-12">
          <p className="text-stone-500">No {type === 'bar' ? 'bars' : 'whiskeys'} found for &quot;{q}&quot;</p>
          <p className="text-sm text-stone-400 mt-2">Try a different search term or broaden your location radius.</p>
        </div>
      )}

      {!q && (
        <div className="text-center py-12">
          <p className="text-stone-500">Enter a search term to find {type === 'bar' ? 'bars' : 'whiskeys'}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
    </div>
  );
}
