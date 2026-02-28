import Link from 'next/link';
import { BottleFinder } from '@/components/features/BottleFinder';

export const metadata = {
  title: 'Find a Bottle | findadram',
  description:
    'Search Oregon OLCC liquor stores for bottles near you. Find Buffalo Trace, Pappy Van Winkle, Weller, and more at state liquor stores across Oregon.',
};

export default async function BottlesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q: initialQuery } = await searchParams;
  return (
    <div>
      {/* ── Dark hero header ─────────────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-whiskey-950 via-whiskey-900 to-whiskey-800">
        <div className="mx-auto max-w-6xl px-4 py-14 text-center">
          {/* Eyebrow */}
          <div className="inline-flex items-center gap-1.5 rounded-full bg-whiskey-800/60 border border-whiskey-700 px-3 py-1 mb-5 text-xs font-medium text-whiskey-300 uppercase tracking-widest">
            <svg
              className="h-3 w-3 text-whiskey-400"
              fill="currentColor"
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 00.281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 103 9c0 3.492 1.698 5.988 3.355 7.584a13.731 13.731 0 002.273 1.765 11.842 11.842 0 00.757.433 5.737 5.737 0 00.28.14l.019.008.006.003zM10 11.25a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5z"
                clipRule="evenodd"
              />
            </svg>
            Oregon Liquor Stores
          </div>

          <h1 className="text-2xl sm:text-3xl md:text-5xl font-bold text-whiskey-100 mb-4 tracking-tight leading-tight">
            Find a Bottle
          </h1>

          <p className="text-whiskey-300 max-w-xl mx-auto mb-3 leading-relaxed">
            Search all Oregon state liquor stores for a specific bottle.
            Oregon controls liquor sales through the OLCC — this tool tells you
            exactly which stores have your bottle and how many are on the shelf.
          </p>

          <p className="text-sm text-whiskey-500">
            Enter a spirit name and your ZIP code to find the nearest stores
            with stock.
          </p>
        </div>
      </section>

      {/* ── Search tool ──────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-2xl px-4 py-10" aria-labelledby="bottle-finder-heading">
        <h2 id="bottle-finder-heading" className="sr-only">
          Bottle finder search
        </h2>
        <BottleFinder initialQuery={initialQuery} />
      </section>

      {/* ── Also find at bars ──────────────────────────────────────────── */}
      <section className="border-t border-oak-200 bg-white">
        <div className="mx-auto max-w-4xl px-4 py-8">
          <div className="rounded-xl bg-gradient-to-r from-whiskey-50 to-amber-50 border border-whiskey-200 p-6 text-center">
            <h2 className="text-lg font-bold text-whiskey-900 mb-2">
              Want to try it at a bar instead?
            </h2>
            <p className="text-sm text-oak-600 mb-4 max-w-lg mx-auto">
              Find Portland bars and restaurants that pour your favorite whiskey by the glass.
              Browse menus, see prices, and discover new spots.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/search?type=whiskey"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-whiskey-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-whiskey-600 transition-colors"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                Search Whiskeys at Bars
              </Link>
              <Link
                href="/bars"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-whiskey-300 bg-white px-5 py-2.5 text-sm font-semibold text-whiskey-800 hover:bg-whiskey-50 transition-colors"
              >
                Browse Portland Bars
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section
        className="border-t border-oak-200 bg-oak-50"
        aria-labelledby="how-it-works-heading"
      >
        <div className="mx-auto max-w-4xl px-4 py-12">
          <h2
            id="how-it-works-heading"
            className="text-lg font-semibold text-whiskey-900 mb-6 text-center"
          >
            How it works
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
            <div>
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-whiskey-100 text-whiskey-600">
                <span className="text-lg font-bold" aria-hidden="true">1</span>
              </div>
              <h3 className="font-medium text-whiskey-900 mb-1 text-sm">Search by name</h3>
              <p className="text-xs text-oak-500 leading-relaxed">
                Enter any spirit name, brand, or OLCC category — e.g.
                &ldquo;Buffalo Trace&rdquo;, &ldquo;Scotch&rdquo;, or
                &ldquo;0532B&rdquo;.
              </p>
            </div>

            <div>
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-whiskey-100 text-whiskey-600">
                <span className="text-lg font-bold" aria-hidden="true">2</span>
              </div>
              <h3 className="font-medium text-whiskey-900 mb-1 text-sm">Add your ZIP code</h3>
              <p className="text-xs text-oak-500 leading-relaxed">
                Provide an Oregon ZIP code to limit results to stores within
                10 miles of your location.
              </p>
            </div>

            <div>
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-whiskey-100 text-whiskey-600">
                <span className="text-lg font-bold" aria-hidden="true">3</span>
              </div>
              <h3 className="font-medium text-whiskey-900 mb-1 text-sm">See store inventory</h3>
              <p className="text-xs text-oak-500 leading-relaxed">
                OLCC updates store quantities daily. Results show on-hand
                quantity, price, and store hours.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Coming soon: Washington ───────────────────────────────────────── */}
      <section className="border-t border-oak-200" aria-labelledby="coming-soon-heading">
        <div className="mx-auto max-w-4xl px-4 py-10 text-center">
          <h2
            id="coming-soon-heading"
            className="text-base font-semibold text-whiskey-800 mb-2"
          >
            More states coming soon
          </h2>
          <p className="text-sm text-oak-500 max-w-lg mx-auto leading-relaxed">
            Washington state also controls liquor sales through the WSLCB. Support for
            Washington liquor store searches is on the roadmap — enter your email to
            be notified when it launches.
          </p>
          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-oak-200 bg-white px-4 py-1.5 text-xs text-oak-400">
            <svg
              className="h-3.5 w-3.5 text-whiskey-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            Washington (WSLCB) — in development
          </div>
        </div>
      </section>
    </div>
  );
}
