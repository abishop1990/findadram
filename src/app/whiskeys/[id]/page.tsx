import { notFound } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { BarList } from '@/components/features/BarList';
import { LiquorStoreSection } from '@/components/features/LiquorStoreSection';
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

const typeColors: Record<string, string> = {
  bourbon: 'bg-amber-900/40 text-amber-200 border border-amber-700/40',
  scotch: 'bg-whiskey-800/50 text-whiskey-200 border border-whiskey-600/40',
  irish: 'bg-emerald-900/40 text-emerald-200 border border-emerald-700/40',
  rye: 'bg-orange-900/40 text-orange-200 border border-orange-700/40',
  japanese: 'bg-rose-900/40 text-rose-200 border border-rose-700/40',
  canadian: 'bg-red-900/40 text-red-200 border border-red-700/40',
  single_malt: 'bg-whiskey-800/50 text-whiskey-200 border border-whiskey-600/40',
  blended: 'bg-oak-800/50 text-oak-200 border border-oak-600/40',
  other: 'bg-oak-800/50 text-oak-200 border border-oak-600/40',
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
      last_verified,
      source_trawl:trawl_jobs (
        scraped_at,
        source_date
      ),
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

  const bars = (barEntries || []).map((entry) => {
    const rawTrawl = entry.source_trawl as unknown;
    const trawl = (Array.isArray(rawTrawl) ? rawTrawl[0] : rawTrawl) as { scraped_at: string | null; source_date: string | null } | null;
    return {
      id: entry.id,
      price: entry.price,
      pour_size: entry.pour_size,
      last_verified: entry.last_verified as string | null,
      source_scraped_at: trawl?.scraped_at ?? null,
      source_date: trawl?.source_date ?? null,
      bar: entry.bar as unknown as {
        id: string;
        name: string;
        address: string | null;
        city: string | null;
        state: string | null;
      },
    };
  });

  const typeBadgeClass = typeColors[whiskey.type] || typeColors.other;
  const typeLabel = typeLabels[whiskey.type] || whiskey.type;

  const prices = bars.filter((b) => b.price != null).map((b) => b.price!);
  const minPrice = prices.length > 0 ? Math.min(...prices) : null;
  const maxPrice = prices.length > 0 ? Math.max(...prices) : null;
  const priceRange =
    minPrice == null
      ? null
      : minPrice === maxPrice
      ? `$${minPrice.toFixed(2)}`
      : `$${minPrice.toFixed(2)} – $${maxPrice!.toFixed(2)}`;

  return (
    <div>
      {/* Hero Header */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-whiskey-950 via-whiskey-900 to-oak-900" />
        {/* Subtle texture */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCI+CjxyZWN0IHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgZmlsbD0ibm9uZSIvPgo8Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIxIiBmaWxsPSJyZ2JhKDIxMiwxNjcsODYsMC4wNSkiLz4KPC9zdmc+')] opacity-40" />

        <div className="relative mx-auto max-w-6xl px-4 py-10 md:py-14">
          {/* Back link */}
          <Link
            href="/search?type=whiskey"
            className="inline-flex items-center gap-1.5 text-sm text-whiskey-300 hover:text-whiskey-100 transition-colors mb-6"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clipRule="evenodd" />
            </svg>
            Back to search
          </Link>

          {/* Type badge */}
          <div className="mb-3">
            <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold tracking-wide uppercase ${typeBadgeClass}`}>
              {typeLabel}
            </span>
          </div>

          {/* Whiskey name */}
          <h1 className="text-3xl md:text-5xl font-bold text-whiskey-50 tracking-tight mb-2">
            {whiskey.name}
          </h1>

          {/* Distillery */}
          {whiskey.distillery && (
            <p className="text-lg text-whiskey-300 mb-1">{whiskey.distillery}</p>
          )}

          {/* Region / Country */}
          {(whiskey.region || whiskey.country) && (
            <p className="flex items-center gap-1.5 text-sm text-whiskey-400 mt-1">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                <path fillRule="evenodd" d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 0 0 .281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 1 0 3 9c0 3.492 1.698 5.988 3.355 7.584a13.731 13.731 0 0 0 2.273 1.765 11.842 11.842 0 0 0 .976.544l.062.029.018.008.006.003ZM10 11.25a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5Z" clipRule="evenodd" />
              </svg>
              {[whiskey.region, whiskey.country].filter(Boolean).join(', ')}
            </p>
          )}

          {/* Price range pill — shown if bars carry it */}
          {priceRange && (
            <div className="mt-4">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-whiskey-700/60 border border-whiskey-600/40 px-3 py-1 text-sm font-semibold text-whiskey-100">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-whiskey-300">
                  <path d="M10.75 10.818v2.614A3.13 3.13 0 0 0 11.888 13c.482-.315.612-.648.612-.875 0-.227-.13-.56-.612-.875a3.13 3.13 0 0 0-1.138-.432ZM8.33 8.62c.053.055.115.11.184.164.208.16.46.284.736.363V6.603a2.45 2.45 0 0 0-.35.13c-.14.065-.27.143-.386.233-.377.292-.514.627-.514.909 0 .184.058.39.33.576Z" />
                  <path fillRule="evenodd" d="M9.99 2.008A8 8 0 1 0 10 18a8 8 0 0 0-.01-15.992ZM10 5a.75.75 0 0 1 .75.75v.518a4.66 4.66 0 0 1 1.653.685c.156.103.298.22.427.346a.75.75 0 0 1-1.05 1.07 3.15 3.15 0 0 0-.578-.406 2.33 2.33 0 0 0-.452-.174v2.154l.197.046c.487.112.94.291 1.307.554.421.296.797.782.797 1.457 0 .792-.456 1.385-1.026 1.752-.301.192-.636.32-.975.384v.472a.75.75 0 0 1-1.5 0v-.52a4.894 4.894 0 0 1-1.655-.742 3.496 3.496 0 0 1-.422-.346.75.75 0 1 1 1.05-1.07c.11.108.232.202.363.287.244.15.515.258.664.314v-2.149l-.197-.046a4.23 4.23 0 0 1-1.29-.526c-.382-.27-.713-.74-.713-1.367 0-.676.355-1.22.75-1.578.312-.286.69-.497 1.012-.61V5.75A.75.75 0 0 1 10 5Z" clipRule="evenodd" />
                </svg>
                {priceRange} per pour
              </span>
            </div>
          )}
        </div>
      </section>

      {/* Page body */}
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Key stats grid */}
            {(whiskey.type || whiskey.age || whiskey.abv || whiskey.region || whiskey.country) && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                {/* Type */}
                <div className="rounded-xl bg-white border border-oak-200 shadow-sm px-3 py-3 sm:px-4 sm:py-4 text-center">
                  <p className="text-xs font-semibold uppercase tracking-widest text-oak-400 mb-1">Type</p>
                  <p className="text-sm font-bold text-whiskey-900 leading-snug">{typeLabel}</p>
                </div>

                {/* Age */}
                <div className="rounded-xl bg-white border border-oak-200 shadow-sm px-3 py-3 sm:px-4 sm:py-4 text-center">
                  <p className="text-xs font-semibold uppercase tracking-widest text-oak-400 mb-1">Age</p>
                  <p className="text-sm font-bold text-whiskey-900">
                    {whiskey.age ? `${whiskey.age} yr` : 'NAS'}
                  </p>
                </div>

                {/* ABV */}
                <div className="rounded-xl bg-white border border-oak-200 shadow-sm px-3 py-3 sm:px-4 sm:py-4 text-center">
                  <p className="text-xs font-semibold uppercase tracking-widest text-oak-400 mb-1">ABV</p>
                  <p className="text-sm font-bold text-whiskey-900">
                    {whiskey.abv ? `${whiskey.abv}%` : '—'}
                  </p>
                </div>

                {/* Region */}
                <div className="rounded-xl bg-white border border-oak-200 shadow-sm px-3 py-3 sm:px-4 sm:py-4 text-center">
                  <p className="text-xs font-semibold uppercase tracking-widest text-oak-400 mb-1">Region</p>
                  <p className="text-sm font-bold text-whiskey-900 leading-snug">
                    {whiskey.region || whiskey.country || '—'}
                  </p>
                </div>
              </div>
            )}

            {/* Description */}
            {whiskey.description && (
              <div className="relative rounded-xl border-l-4 border-whiskey-400 bg-white border border-oak-200 shadow-sm overflow-hidden">
                <div className="px-6 py-5">
                  <p className="text-xs font-semibold uppercase tracking-widest text-whiskey-500 mb-3 flex items-center gap-1.5">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                      <path fillRule="evenodd" d="M2 3.75C2 3.336 2.336 3 2.75 3h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 3.75Zm0 4.167c0-.414.336-.75.75-.75h14.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75Zm0 4.166c0-.414.336-.75.75-.75h14.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75Zm0 4.167c0-.414.336-.75.75-.75h7.5a.75.75 0 0 1 0 1.5h-7.5a.75.75 0 0 1-.75-.75Z" clipRule="evenodd" />
                    </svg>
                    About this whiskey
                  </p>
                  <blockquote className="text-oak-700 leading-relaxed text-base italic border-none p-0 m-0">
                    {whiskey.description}
                  </blockquote>
                </div>
              </div>
            )}

            {/* Where to find it */}
            <div className="bg-white rounded-xl border border-oak-200 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-oak-100 bg-gradient-to-r from-whiskey-50 to-oak-50">
                <div className="flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-whiskey-500">
                    <path fillRule="evenodd" d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 0 0 .281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 1 0 3 9c0 3.492 1.698 5.988 3.355 7.584a13.731 13.731 0 0 0 2.273 1.765 11.842 11.842 0 0 0 .976.544l.062.029.018.008.006.003ZM10 11.25a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5Z" clipRule="evenodd" />
                  </svg>
                  <h2 className="text-lg font-bold text-whiskey-900">Where to Find It</h2>
                </div>
                <Badge variant="amber">
                  {bars.length} {bars.length === 1 ? 'bar' : 'bars'}
                </Badge>
              </div>
              <div className="p-5">
                <BarList bars={bars} />
              </div>
            </div>

            {/* Buy a Bottle — OLCC liquor store search */}
            <div className="bg-white rounded-xl border border-oak-200 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-oak-100 bg-gradient-to-r from-amber-50 to-whiskey-50">
                <div className="flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-amber-600">
                    <path fillRule="evenodd" d="M6 5v1H4.667a1.75 1.75 0 0 0-1.743 1.598l-.826 9.5A1.75 1.75 0 0 0 3.84 19H16.16a1.75 1.75 0 0 0 1.743-1.902l-.826-9.5A1.75 1.75 0 0 0 15.334 6H14V5a4 4 0 0 0-8 0Zm4-2.5A2.5 2.5 0 0 0 7.5 5v1h5V5A2.5 2.5 0 0 0 10 2.5ZM7.5 10a2.5 2.5 0 0 0 5 0V8.75a.75.75 0 0 1 1.5 0V10a4 4 0 0 1-8 0V8.75a.75.75 0 0 1 1.5 0V10Z" clipRule="evenodd" />
                  </svg>
                  <h2 className="text-lg font-bold text-whiskey-900">Buy a Bottle</h2>
                </div>
                <span className="inline-flex items-center rounded-full bg-whiskey-100 border border-whiskey-200 px-2 py-0.5 text-xs font-medium text-whiskey-700">
                  Oregon
                </span>
              </div>
              <div className="p-5">
                <LiquorStoreSection whiskeyName={whiskey.name} />
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-20 space-y-5">
              {/* Specifications card */}
              <div className="bg-white rounded-xl border border-oak-200 shadow-sm overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-oak-100 bg-gradient-to-r from-whiskey-50 to-oak-50">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-whiskey-500">
                    <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z" clipRule="evenodd" />
                  </svg>
                  <h3 className="font-bold text-whiskey-900 text-sm uppercase tracking-wide">
                    Specifications
                  </h3>
                </div>
                <div className="p-4">
                  <dl className="space-y-3 text-sm">
                    <div className="flex justify-between items-center py-1.5 border-b border-oak-50 last:border-0">
                      <dt className="text-oak-500 font-medium">Type</dt>
                      <dd className="text-whiskey-900 font-semibold">{typeLabel}</dd>
                    </div>
                    {whiskey.distillery && (
                      <div className="flex justify-between items-center py-1.5 border-b border-oak-50 last:border-0">
                        <dt className="text-oak-500 font-medium">Distillery</dt>
                        <dd className="text-whiskey-900 font-semibold text-right max-w-[60%]">{whiskey.distillery}</dd>
                      </div>
                    )}
                    <div className="flex justify-between items-center py-1.5 border-b border-oak-50 last:border-0">
                      <dt className="text-oak-500 font-medium">Age</dt>
                      <dd className="text-whiskey-900 font-semibold">
                        {whiskey.age ? `${whiskey.age} years` : 'No Age Statement'}
                      </dd>
                    </div>
                    {whiskey.abv && (
                      <div className="flex justify-between items-center py-1.5 border-b border-oak-50 last:border-0">
                        <dt className="text-oak-500 font-medium">ABV</dt>
                        <dd className="text-whiskey-900 font-semibold">{whiskey.abv}%</dd>
                      </div>
                    )}
                    {whiskey.region && (
                      <div className="flex justify-between items-center py-1.5 border-b border-oak-50 last:border-0">
                        <dt className="text-oak-500 font-medium">Region</dt>
                        <dd className="text-whiskey-900 font-semibold">{whiskey.region}</dd>
                      </div>
                    )}
                    {whiskey.country && (
                      <div className="flex justify-between items-center py-1.5 border-b border-oak-50 last:border-0">
                        <dt className="text-oak-500 font-medium">Country</dt>
                        <dd className="text-whiskey-900 font-semibold">{whiskey.country}</dd>
                      </div>
                    )}
                  </dl>
                </div>
              </div>

              {/* Price range card */}
              {priceRange && (
                <div className="bg-gradient-to-br from-amber-50 to-whiskey-50 rounded-xl border border-amber-200 shadow-sm p-4">
                  <p className="text-xs font-semibold uppercase tracking-widest text-whiskey-500 mb-2">
                    Price Range
                  </p>
                  <p className="text-2xl font-bold text-whiskey-900">{priceRange}</p>
                  <p className="text-xs text-oak-500 mt-1">
                    across {bars.length} {bars.length === 1 ? 'bar' : 'bars'}
                  </p>
                </div>
              )}

              {/* Spotted it CTA */}
              <div className="rounded-xl border border-oak-200 bg-white shadow-sm p-4 text-center">
                <p className="text-sm font-semibold text-whiskey-900 mb-1">Spotted it somewhere?</p>
                <p className="text-xs text-oak-500 mb-3">Help others find great drams near them.</p>
                <Link
                  href={`/submit?whiskey=${id}`}
                  className="inline-flex items-center gap-2 rounded-lg bg-whiskey-700 px-4 py-2.5 text-sm font-semibold text-whiskey-50 hover:bg-whiskey-600 active:bg-whiskey-800 transition-colors w-full justify-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
                  </svg>
                  Log a Sighting
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
