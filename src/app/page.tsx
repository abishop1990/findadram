import Link from 'next/link';
import { SearchBar } from '@/components/features/SearchBar';
import { LocationPrompt } from '@/components/features/LocationPrompt';
import { BarCard } from '@/components/features/BarCard';
import { WhiskeyCard } from '@/components/features/WhiskeyCard';
import { NearbyBars } from '@/components/features/NearbyBars';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// ─── helpers ────────────────────────────────────────────────────────────────

function timeAgo(dateString: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ─── page ────────────────────────────────────────────────────────────────────

export default async function HomePage() {
  const supabase = await createServerSupabaseClient();

  // All queries run in parallel
  const [
    { data: bars },
    { data: whiskeys },
    { data: recentSightings },
    { count: barsCount },
    { count: whiskeysCount },
    { count: sightingsCount },
  ] = await Promise.all([
    supabase
      .from('bars')
      .select('id, name, address, city, state, bar_whiskeys(count)')
      .order('name', { ascending: true })
      .limit(6),
    supabase
      .from('whiskeys')
      .select('id, name, distillery, type, age')
      .limit(8),
    supabase
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
      .limit(5),
    supabase.from('bars').select('id', { count: 'exact', head: true }),
    supabase.from('whiskeys').select('id', { count: 'exact', head: true }),
    supabase.from('sightings').select('id', { count: 'exact', head: true }),
  ]);

  const stats = [
    {
      label: 'Bars',
      value: barsCount ?? 0,
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
        </svg>
      ),
    },
    {
      label: 'Whiskeys',
      value: whiskeysCount ?? 0,
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21a48.309 48.309 0 01-8.135-.687c-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
        </svg>
      ),
    },
    {
      label: 'Sightings',
      value: sightingsCount ?? 0,
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
  ].filter(({ value }) => value > 0);

  return (
    <div className="min-h-screen bg-whiskey-50">

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-whiskey-950 via-whiskey-900 to-whiskey-800" />

        {/* Subtle dot pattern */}
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `radial-gradient(circle, rgba(212,164,86,0.15) 1px, transparent 1px)`,
            backgroundSize: '32px 32px',
          }}
        />

        {/* Decorative glass SVG — right side, desktop only */}
        <div className="pointer-events-none absolute right-8 top-1/2 -translate-y-1/2 hidden lg:block opacity-10" aria-hidden="true">
          <svg width="240" height="320" viewBox="0 0 240 320" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Glass body */}
            <path
              d="M60 20 L40 280 Q40 300 120 300 Q200 300 200 280 L180 20 Z"
              stroke="#d4a456"
              strokeWidth="6"
              fill="none"
              strokeLinejoin="round"
            />
            {/* Liquid fill */}
            <path
              d="M55 180 L42 278 Q42 295 120 295 Q198 295 198 278 L185 180 Z"
              fill="#a06b1b"
              opacity="0.6"
            />
            {/* Rim highlight */}
            <line x1="60" y1="20" x2="180" y2="20" stroke="#d4a456" strokeWidth="6" strokeLinecap="round" />
            {/* Ice cube suggestion */}
            <rect x="90" y="200" width="28" height="28" rx="4" stroke="#e8c992" strokeWidth="3" fill="none" opacity="0.5" />
            <rect x="122" y="210" width="24" height="24" rx="4" stroke="#e8c992" strokeWidth="3" fill="none" opacity="0.4" />
          </svg>
        </div>

        {/* Content */}
        <div className="relative mx-auto max-w-6xl px-4 py-12 sm:py-20 md:py-32 text-center">
          {/* Portland badge */}
          <div className="inline-flex items-center gap-1.5 rounded-full bg-whiskey-800/60 border border-whiskey-700 px-3 py-1 mb-4 sm:mb-6 text-xs font-medium text-whiskey-300 uppercase tracking-widest">
            <svg className="h-3 w-3 text-whiskey-400" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path fillRule="evenodd" d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 00.281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 103 9c0 3.492 1.698 5.988 3.355 7.584a13.731 13.731 0 002.273 1.765 11.842 11.842 0 00.757.433 5.737 5.737 0 00.28.14l.019.008.006.003zM10 11.25a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5z" clipRule="evenodd" />
            </svg>
            Pacific Northwest
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold text-whiskey-100 mb-3 sm:mb-5 tracking-tight leading-tight">
            Discover the Pacific Northwest&apos;s<br className="hidden sm:block" /> Best Whiskey
          </h1>

          <p className="text-base sm:text-lg md:text-xl text-whiskey-300 mb-2 sm:mb-3 max-w-xl mx-auto leading-relaxed">
            Find whiskeys at bars near you. Track prices. Share discoveries.
          </p>
          <p className="text-xs sm:text-sm text-whiskey-500 mb-8 sm:mb-10">
            Search by name, distillery, or style — or use your location to see what&apos;s nearby.
          </p>

          <div className="flex flex-col items-center gap-3 sm:gap-4">
            <SearchBar />
            <LocationPrompt />
          </div>
        </div>
      </section>

      {/* ── Stats bar ─────────────────────────────────────────────────────── */}
      <section className="border-b border-oak-200 bg-white" aria-label="Platform statistics">
        <div className="mx-auto max-w-6xl px-4 py-4 sm:py-6">
          <dl className={`grid gap-2 sm:gap-0 sm:divide-x divide-oak-200 ${stats.length === 2 ? 'grid-cols-2 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-3'}`}>
            {stats.map(({ label, value, icon }) => (
              <div key={label} className="flex flex-col items-center gap-1 px-2 sm:px-4 py-2 sm:py-2 text-center border-b border-oak-200 sm:border-0 last:border-0">
                <div className="text-whiskey-400 mb-0.5 sm:mb-1">{icon}</div>
                <dt className="text-xs font-medium uppercase tracking-wider text-oak-500">{label}</dt>
                <dd className="text-xl sm:text-2xl md:text-3xl font-bold text-whiskey-800">
                  {value.toLocaleString()}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ── Nearby Bars (location-aware) ──────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-8">
        <NearbyBars />
      </section>

      {/* ── Recent Sightings ──────────────────────────────────────────────── */}
      {recentSightings && recentSightings.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-12" aria-labelledby="sightings-heading">
          <div className="flex items-center justify-between mb-6">
            <h2
              id="sightings-heading"
              className="text-2xl font-bold text-whiskey-900 flex items-center gap-2"
            >
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-700" aria-hidden="true">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                </svg>
              </span>
              Recent Sightings
            </h2>
            <Link
              href="/sightings"
              className="text-sm font-medium text-whiskey-600 hover:text-whiskey-800 transition-colors"
            >
              View all &rarr;
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {recentSightings.map((s) => {
              const bar = s.bar as unknown as { id: string; name: string } | null;
              const whiskey = s.whiskey as unknown as { id: string; name: string; type: string } | null;
              if (!bar || !whiskey) return null;
              return (
                <div
                  key={s.id}
                  className="group rounded-xl border border-oak-200 bg-white p-4 shadow-sm hover:border-amber-300 hover:shadow-md transition-all"
                >
                  {/* Whiskey name links to whiskey page */}
                  <Link
                    href={`/whiskeys/${whiskey.id}`}
                    className="block font-semibold text-whiskey-900 text-sm leading-snug hover:text-whiskey-600 transition-colors truncate"
                  >
                    {whiskey.name}
                  </Link>

                  {/* Type badge */}
                  {whiskey.type && whiskey.type !== 'other' && (
                    <span className="mt-1 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                      {whiskey.type.replace('_', ' ')}
                    </span>
                  )}

                  {/* Bar link */}
                  <Link
                    href={`/bars/${bar.id}`}
                    className="mt-2 flex items-center gap-1 text-xs text-oak-500 hover:text-whiskey-700 transition-colors"
                  >
                    <svg className="h-3 w-3 shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                      <path fillRule="evenodd" d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 00.281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 103 9c0 3.492 1.698 5.988 3.355 7.584a13.731 13.731 0 002.273 1.765 11.842 11.842 0 00.757.433 5.737 5.737 0 00.28.14l.019.008.006.003zM10 11.25a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5z" clipRule="evenodd" />
                    </svg>
                    <span className="truncate">{bar.name}</span>
                  </Link>

                  {/* Price / rating / time row */}
                  <div className="mt-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {s.price != null && (
                        <span className="text-xs font-bold text-whiskey-700">
                          ${(s.price as number).toFixed(2)}
                        </span>
                      )}
                      {s.rating != null && (
                        <span className="text-xs text-amber-500" aria-label={`Rating: ${s.rating} out of 5`}>
                          {'★'.repeat(s.rating as number)}{'☆'.repeat(5 - (s.rating as number))}
                        </span>
                      )}
                    </div>
                    <time
                      dateTime={s.created_at as string}
                      className="text-xs text-oak-400"
                    >
                      {timeAgo(s.created_at as string)}
                    </time>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Featured Bars ─────────────────────────────────────────────────── */}
      {bars && bars.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-12" aria-labelledby="bars-heading">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2
                id="bars-heading"
                className="text-2xl font-bold text-whiskey-900"
              >
                Explore Bars
              </h2>
              <p className="text-sm text-oak-500 mt-0.5">Top spots for whiskey in the city</p>
            </div>
            <Link
              href="/bars"
              className="text-sm font-medium text-whiskey-600 hover:text-whiskey-800 transition-colors"
            >
              All bars &rarr;
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {bars.map((bar) => {
              const bwRows = (bar as unknown as { bar_whiskeys?: { count: number }[] }).bar_whiskeys;
              const whiskey_count = bwRows && bwRows.length > 0 ? Number(bwRows[0].count) : undefined;
              return (
                <BarCard
                  key={bar.id}
                  id={bar.id}
                  name={bar.name}
                  address={bar.address}
                  city={bar.city}
                  state={bar.state}
                  whiskey_count={whiskey_count}
                />
              );
            })}
          </div>
        </section>
      )}

      {/* ── Popular Whiskeys ──────────────────────────────────────────────── */}
      {whiskeys && whiskeys.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-12" aria-labelledby="whiskeys-heading">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2
                id="whiskeys-heading"
                className="text-2xl font-bold text-whiskey-900"
              >
                Popular Whiskeys
              </h2>
              <p className="text-sm text-oak-500 mt-0.5">Spotted at bars this month</p>
            </div>
            <Link
              href="/whiskeys"
              className="text-sm font-medium text-whiskey-600 hover:text-whiskey-800 transition-colors"
            >
              Browse all &rarr;
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

      {/* ── CTA ───────────────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-whiskey-900 to-whiskey-800" aria-labelledby="cta-heading">
        <div className="mx-auto max-w-6xl px-4 py-16 text-center">
          {/* Decorative divider */}
          <div className="flex items-center justify-center gap-4 mb-8" aria-hidden="true">
            <div className="h-px w-16 bg-whiskey-700" />
            <svg className="h-5 w-5 text-whiskey-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401z" clipRule="evenodd" />
            </svg>
            <div className="h-px w-16 bg-whiskey-700" />
          </div>

          <h2
            id="cta-heading"
            className="text-3xl md:text-4xl font-bold text-whiskey-100 mb-4"
          >
            Know a bar&apos;s whiskey menu?
          </h2>
          <p className="text-whiskey-300 max-w-lg mx-auto mb-8 leading-relaxed">
            Help the whiskey community by submitting a bar&apos;s menu.
            We&apos;ll catalog every bottle, price, and pour size so others can
            find their next dram.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full sm:w-auto px-4 sm:px-0">
            <Link
              href="/submit"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-whiskey-400 px-6 py-3 text-sm font-semibold text-whiskey-950 shadow hover:bg-whiskey-300 transition-colors min-h-11 sm:min-h-auto"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Submit a Bar Menu
            </Link>
            <Link
              href="/bars"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg border border-whiskey-700 px-6 py-3 text-sm font-medium text-whiskey-300 hover:bg-whiskey-800/50 hover:text-whiskey-100 transition-colors min-h-11 sm:min-h-auto"
            >
              Browse Bars
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
