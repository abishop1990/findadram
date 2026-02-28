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

  const locationParts = [bar.city, bar.state, bar.country].filter(Boolean);

  return (
    <div>
      {/* Hero Header */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-whiskey-950 via-whiskey-900 to-whiskey-800" />
        {/* Subtle dot texture overlay */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCI+CjxyZWN0IHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgZmlsbD0ibm9uZSIvPgo8Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIxIiBmaWxsPSJyZ2JhKDIxMiwxNjcsODYsMC4wNSkiLz4KPC9zdmc+')] opacity-40" />

        <div className="relative mx-auto max-w-6xl px-4 py-10 md:py-14">
          {/* Back link */}
          <Link
            href="/search?type=bar"
            className="inline-flex items-center gap-1.5 text-sm text-whiskey-300 hover:text-whiskey-100 transition-colors mb-6"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clipRule="evenodd" />
            </svg>
            Back to search
          </Link>

          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              {/* Bar name */}
              <h1 className="text-3xl md:text-5xl font-bold text-whiskey-50 tracking-tight mb-3">
                {bar.name}
              </h1>

              {/* Location row */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-whiskey-300">
                {bar.address && (
                  <span className="flex items-center gap-1.5 text-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 shrink-0 text-whiskey-400">
                      <path fillRule="evenodd" d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 0 0 .281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 1 0 3 9c0 3.492 1.698 5.988 3.355 7.584a13.731 13.731 0 0 0 2.273 1.765 11.842 11.842 0 0 0 .976.544l.062.029.018.008.006.003ZM10 11.25a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5Z" clipRule="evenodd" />
                    </svg>
                    {bar.address}
                  </span>
                )}
                {locationParts.length > 0 && (
                  <span className="text-sm text-whiskey-400">
                    {locationParts.join(', ')}
                  </span>
                )}
              </div>
            </div>

            {/* Whiskey count badge */}
            <div className="shrink-0">
              <div className="inline-flex flex-col items-center justify-center bg-whiskey-800/60 border border-whiskey-700/50 rounded-xl px-5 py-3 backdrop-blur-sm">
                <span className="text-3xl font-bold text-whiskey-100">{whiskeys.length}</span>
                <span className="text-xs text-whiskey-400 uppercase tracking-widest mt-0.5">
                  {whiskeys.length === 1 ? 'whiskey' : 'whiskeys'} available
                </span>
              </div>
            </div>
          </div>

          {/* Contact info row */}
          {(bar.phone || bar.website) && (
            <div className="flex flex-wrap items-center gap-4 mt-5 pt-5 border-t border-whiskey-800/60">
              {bar.phone && (
                <a
                  href={`tel:${bar.phone}`}
                  className="flex items-center gap-2 text-sm text-whiskey-300 hover:text-whiskey-100 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-whiskey-400">
                    <path fillRule="evenodd" d="M2 3.5A1.5 1.5 0 0 1 3.5 2h1.148a1.5 1.5 0 0 1 1.465 1.175l.716 3.223a1.5 1.5 0 0 1-1.052 1.767l-.933.267c-.41.117-.643.555-.48.95a11.542 11.542 0 0 0 6.254 6.254c.395.163.833-.07.95-.48l.267-.933a1.5 1.5 0 0 1 1.767-1.052l3.223.716A1.5 1.5 0 0 1 18 16.352V17.5a1.5 1.5 0 0 1-1.5 1.5H15c-1.149 0-2.263-.15-3.326-.43A13.022 13.022 0 0 1 2.43 8.326 13.019 13.019 0 0 1 2 5V3.5Z" clipRule="evenodd" />
                  </svg>
                  {bar.phone}
                </a>
              )}
              {bar.website && (
                <a
                  href={bar.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-whiskey-300 hover:text-whiskey-100 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-whiskey-400">
                    <path d="M10 1a9 9 0 1 0 0 18A9 9 0 0 0 10 1ZM6.562 3.23a7.5 7.5 0 0 0-3.03 5.27H5.5c.13-1.83.55-3.46 1.062-4.77ZM5.5 9.5H3.532a7.5 7.5 0 0 0 3.03 5.27C6.05 13.46 5.63 11.83 5.5 9.5Zm1.008 0c.152 2.24.7 4.12 1.492 5.25.314.453.636.75.998.75s.684-.297.998-.75C10.788 13.62 11.34 11.74 11.492 9.5H6.508Zm4.984 0c-.13 1.83-.55 3.46-1.062 4.77a7.5 7.5 0 0 0 3.03-5.27H11.5ZM14.5 8.5h1.968a7.5 7.5 0 0 0-3.03-5.27C13.95 4.54 14.37 6.17 14.5 8.5Zm-3.008 0C11.34 6.26 10.788 4.38 9.998 3.25 9.684 2.797 9.362 2.5 9 2.5s-.684.297-.998.75C7.212 4.38 6.66 6.26 6.508 8.5h4.984Z" />
                  </svg>
                  {bar.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                </a>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Page body */}
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main column: Whiskey Menu */}
          <div className="lg:col-span-2 space-y-4">
            {/* Log a Sighting CTA */}
            <div className="flex items-center justify-between rounded-xl bg-gradient-to-r from-amber-50 to-whiskey-50 border border-amber-200 px-5 py-4">
              <div>
                <p className="font-semibold text-whiskey-900">Spotted a pour?</p>
                <p className="text-sm text-oak-600 mt-0.5">Help others by logging what you had tonight.</p>
              </div>
              <Link
                href={`/submit?bar=${id}`}
                className="shrink-0 inline-flex items-center gap-2 rounded-lg bg-whiskey-700 px-4 py-2.5 text-sm font-semibold text-whiskey-50 hover:bg-whiskey-600 active:bg-whiskey-800 transition-colors shadow-sm"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
                </svg>
                Log a Sighting
              </Link>
            </div>

            {/* Whiskey Menu card */}
            <div className="bg-white rounded-xl border border-oak-200 shadow-sm overflow-hidden">
              {/* Card header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-oak-100 bg-gradient-to-r from-whiskey-50 to-oak-50">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🥃</span>
                  <h2 className="text-lg font-bold text-whiskey-900">Whiskey Menu</h2>
                </div>
                <Badge variant="amber">{whiskeys.length} available</Badge>
              </div>

              {/* List */}
              <div className="p-5">
                <WhiskeyListWithActions whiskeys={whiskeys} barId={id} barName={bar.name} />
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-20 space-y-5">
              {/* Visit website button */}
              {bar.website && (
                <a
                  href={bar.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-whiskey-700 text-whiskey-50 rounded-xl hover:bg-whiskey-600 active:bg-whiskey-800 transition-colors font-semibold shadow-sm"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path fillRule="evenodd" d="M4.25 5.5a.75.75 0 0 0-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 0 0 .75-.75v-4a.75.75 0 0 1 1.5 0v4A2.25 2.25 0 0 1 12.75 17h-8.5A2.25 2.25 0 0 1 2 14.75v-8.5A2.25 2.25 0 0 1 4.25 4h5a.75.75 0 0 1 0 1.5h-5Z" clipRule="evenodd" />
                    <path fillRule="evenodd" d="M6.194 12.753a.75.75 0 0 0 1.06.053L16.5 4.44v2.81a.75.75 0 0 0 1.5 0v-4.5a.75.75 0 0 0-.75-.75h-4.5a.75.75 0 0 0 0 1.5h2.553l-9.056 8.194a.75.75 0 0 0-.053 1.06Z" clipRule="evenodd" />
                  </svg>
                  Visit Website
                </a>
              )}

              {/* Activity feed card */}
              <div className="bg-white rounded-xl border border-oak-200 shadow-sm overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-oak-100 bg-gradient-to-r from-whiskey-50 to-oak-50">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-whiskey-500">
                    <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-13a.75.75 0 0 0-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 0 0 0-1.5h-3.25V5Z" clipRule="evenodd" />
                  </svg>
                  <h3 className="font-bold text-whiskey-900 text-sm uppercase tracking-wide">
                    Recent Activity
                  </h3>
                </div>
                <div className="p-4">
                  <ActivityFeed barId={id} />
                </div>
              </div>

              {/* Bar contact details card */}
              {(bar.address || bar.phone || bar.website) && (
                <div className="bg-white rounded-xl border border-oak-200 shadow-sm overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-oak-100 bg-gradient-to-r from-whiskey-50 to-oak-50">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-whiskey-500">
                      <path fillRule="evenodd" d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 0 0 .281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 1 0 3 9c0 3.492 1.698 5.988 3.355 7.584a13.731 13.731 0 0 0 2.273 1.765 11.842 11.842 0 0 0 .976.544l.062.029.018.008.006.003ZM10 11.25a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5Z" clipRule="evenodd" />
                    </svg>
                    <h3 className="font-bold text-whiskey-900 text-sm uppercase tracking-wide">
                      Location &amp; Contact
                    </h3>
                  </div>
                  <div className="p-4 space-y-3">
                    {bar.address && (
                      <div className="flex items-start gap-2.5 text-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-oak-400 mt-0.5 shrink-0">
                          <path fillRule="evenodd" d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 0 0 .281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 1 0 3 9c0 3.492 1.698 5.988 3.355 7.584a13.731 13.731 0 0 0 2.273 1.765 11.842 11.842 0 0 0 .976.544l.062.029.018.008.006.003ZM10 11.25a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5Z" clipRule="evenodd" />
                        </svg>
                        <div>
                          <p className="text-whiskey-800">{bar.address}</p>
                          {locationParts.length > 0 && (
                            <p className="text-oak-500 text-xs mt-0.5">{locationParts.join(', ')}</p>
                          )}
                        </div>
                      </div>
                    )}
                    {bar.phone && (
                      <div className="flex items-center gap-2.5 text-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-oak-400 shrink-0">
                          <path fillRule="evenodd" d="M2 3.5A1.5 1.5 0 0 1 3.5 2h1.148a1.5 1.5 0 0 1 1.465 1.175l.716 3.223a1.5 1.5 0 0 1-1.052 1.767l-.933.267c-.41.117-.643.555-.48.95a11.542 11.542 0 0 0 6.254 6.254c.395.163.833-.07.95-.48l.267-.933a1.5 1.5 0 0 1 1.767-1.052l3.223.716A1.5 1.5 0 0 1 18 16.352V17.5a1.5 1.5 0 0 1-1.5 1.5H15c-1.149 0-2.263-.15-3.326-.43A13.022 13.022 0 0 1 2.43 8.326 13.019 13.019 0 0 1 2 5V3.5Z" clipRule="evenodd" />
                        </svg>
                        <a href={`tel:${bar.phone}`} className="text-whiskey-800 hover:text-whiskey-600 transition-colors">
                          {bar.phone}
                        </a>
                      </div>
                    )}
                    {bar.website && (
                      <div className="flex items-center gap-2.5 text-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-oak-400 shrink-0">
                          <path d="M10 1a9 9 0 1 0 0 18A9 9 0 0 0 10 1ZM6.562 3.23a7.5 7.5 0 0 0-3.03 5.27H5.5c.13-1.83.55-3.46 1.062-4.77ZM5.5 9.5H3.532a7.5 7.5 0 0 0 3.03 5.27C6.05 13.46 5.63 11.83 5.5 9.5Zm1.008 0c.152 2.24.7 4.12 1.492 5.25.314.453.636.75.998.75s.684-.297.998-.75C10.788 13.62 11.34 11.74 11.492 9.5H6.508Zm4.984 0c-.13 1.83-.55 3.46-1.062 4.77a7.5 7.5 0 0 0 3.03-5.27H11.5ZM14.5 8.5h1.968a7.5 7.5 0 0 0-3.03-5.27C13.95 4.54 14.37 6.17 14.5 8.5Zm-3.008 0C11.34 6.26 10.788 4.38 9.998 3.25 9.684 2.797 9.362 2.5 9 2.5s-.684.297-.998.75C7.212 4.38 6.66 6.26 6.508 8.5h4.984Z" />
                        </svg>
                        <a
                          href={bar.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-whiskey-600 hover:text-whiskey-500 transition-colors truncate"
                        >
                          {bar.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
