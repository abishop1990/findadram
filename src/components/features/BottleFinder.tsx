'use client';

import { useState, useCallback, useEffect } from 'react';
import { useLocation } from '@/hooks/useLocation';
import type { LiquorStoreResult } from '@/lib/liquor-search';

// ─── Sub-components ───────────────────────────────────────────────────────────

function ProductCard({ store, searchQuery }: { store: LiquorStoreResult; searchQuery?: string }) {
  return (
    <article className="rounded-xl border border-oak-200 bg-white p-4 shadow-sm hover:border-whiskey-300 hover:shadow-md transition-all duration-150">
      {/* Product name + price */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <h3 className="font-semibold text-whiskey-900 text-sm leading-snug">
          {store.productName || searchQuery || 'Unknown Product'}
        </h3>
        {store.price != null && (
          <span className="shrink-0 text-lg font-bold text-whiskey-700">
            ${store.price.toFixed(2)}
          </span>
        )}
      </div>

      {/* Category */}
      {store.category && (
        <p className="text-xs text-oak-500 mb-3">{store.category}</p>
      )}

      {/* Details row */}
      <dl className="flex flex-wrap gap-x-2 sm:gap-x-4 gap-y-1 text-xs">
        {store.bottleSize && (
          <div className="flex items-center gap-1">
            <dt className="text-oak-500">Size:</dt>
            <dd className="text-whiskey-800">{store.bottleSize}</dd>
          </div>
        )}

        {store.proof != null && (
          <div className="flex items-center gap-1">
            <dt className="text-oak-500">Proof:</dt>
            <dd className="text-whiskey-800">{store.proof}</dd>
          </div>
        )}

        {store.itemCode && (
          <div className="flex items-center gap-1">
            <dt className="text-oak-500">Item:</dt>
            <dd className="text-whiskey-800 font-mono">{store.itemCode}</dd>
          </div>
        )}
      </dl>

      {/* Availability note */}
      <div className="mt-3 pt-2 border-t border-oak-100">
        <p className="text-xs text-oak-400">
          Available at all Oregon OLCC liquor stores &mdash; uniform state pricing
        </p>
      </div>
    </article>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface SearchResponse {
  results: LiquorStoreResult[];
  fromCache: boolean;
  error?: string;
}

interface BottleFinderProps {
  initialQuery?: string;
}

export function BottleFinder({ initialQuery }: BottleFinderProps = {}) {
  const [query, setQuery] = useState(initialQuery ?? '');
  const [zipCode, setZipCode] = useState('');
  const [results, setResults] = useState<LiquorStoreResult[] | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const { coords, requestLocation, loading: locLoading } = useLocation();

  // Auto-fill ZIP from geolocation
  useEffect(() => {
    if (coords && !zipCode) {
      fetch(`/api/geocode?lat=${coords.lat}&lng=${coords.lng}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.zip) setZipCode(data.zip);
        })
        .catch(() => { /* ignore geocode failure */ });
    }
  }, [coords]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      if (!query.trim()) return;

      setLoading(true);
      setError(null);
      setResults(null);
      setSearched(false);

      try {
        const params = new URLSearchParams({ q: query.trim(), state: 'OR' });
        if (zipCode.trim()) params.set('zip', zipCode.trim());

        const response = await fetch(`/api/liquor-search?${params.toString()}`);
        const data: SearchResponse = await response.json();

        if (!response.ok) {
          throw new Error(data.error ?? `Search failed (${response.status})`);
        }

        setResults(data.results);
        setFromCache(data.fromCache);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'An unexpected error occurred. Please try again.',
        );
      } finally {
        setLoading(false);
        setSearched(true);
      }
    },
    [query, zipCode],
  );

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Search form */}
      <form onSubmit={handleSearch} noValidate aria-label="Find a bottle">
        <div className="flex flex-col gap-3">
          {/* Product name input */}
          <div>
            <label
              htmlFor="bottle-query"
              className="block text-sm font-medium text-whiskey-800 mb-1"
            >
              Spirit name
            </label>
            <input
              id="bottle-query"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. Buffalo Trace, Lagavulin, Weller"
              required
              maxLength={120}
              className="w-full rounded-lg border border-oak-300 bg-white px-4 py-2.5 text-whiskey-900 placeholder:text-oak-400 shadow-sm focus:border-whiskey-400 focus:ring-2 focus:ring-whiskey-300/50 focus:outline-none transition-colors text-sm"
              aria-required="true"
            />
          </div>

          {/* ZIP code input + submit — side by side on sm+ */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <label
                htmlFor="bottle-zip"
                className="block text-sm font-medium text-whiskey-800 mb-1"
              >
                ZIP code
                <span className="ml-1 text-xs font-normal text-oak-400">
                  (optional)
                </span>
              </label>
              <div className="flex gap-2">
                <input
                  id="bottle-zip"
                  type="text"
                  inputMode="numeric"
                  value={zipCode}
                  onChange={(e) => setZipCode(e.target.value.replace(/\D/g, '').slice(0, 5))}
                  placeholder="97201"
                  maxLength={5}
                  pattern="\d{5}"
                  className="flex-1 rounded-lg border border-oak-300 bg-white px-4 py-2.5 text-whiskey-900 placeholder:text-oak-400 shadow-sm focus:border-whiskey-400 focus:ring-2 focus:ring-whiskey-300/50 focus:outline-none transition-colors text-sm"
                  aria-label="Oregon ZIP code for nearby store search"
                />
                {!zipCode && (
                  <button
                    type="button"
                    onClick={requestLocation}
                    disabled={locLoading}
                    className="shrink-0 inline-flex items-center min-h-11 min-w-11 justify-center gap-1.5 rounded-lg border border-oak-300 bg-white px-3 py-2.5 text-sm text-oak-600 hover:bg-oak-50 hover:text-whiskey-700 disabled:opacity-50 transition-colors shadow-sm"
                    aria-label="Use my location to find ZIP code"
                  >
                    {locLoading ? (
                      <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    ) : (
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                      </svg>
                    )}
                    <span className="hidden sm:inline">Locate me</span>
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                disabled={loading || !query.trim()}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-whiskey-500 px-6 py-2.5 text-sm font-semibold text-white shadow hover:bg-whiskey-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-whiskey-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                aria-label="Search for bottle"
              >
                {loading ? (
                  <>
                    <svg
                      className="h-4 w-4 animate-spin"
                      viewBox="0 0 24 24"
                      fill="none"
                      aria-hidden="true"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z"
                      />
                    </svg>
                    Searching…
                  </>
                ) : (
                  <>
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803a7.5 7.5 0 0010.607 0z"
                      />
                    </svg>
                    Find Bottles
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* Error state */}
      {error && (
        <div
          role="alert"
          className="mt-6 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          <svg
            className="mt-0.5 h-4 w-4 shrink-0 text-red-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
            />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* Results */}
      {searched && !error && results && (
        <div className="mt-6">
          {/* Result count header */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-oak-600">
              {results.length === 0 ? (
                <>No products found for &ldquo;{query}&rdquo;.</>
              ) : (
                <>
                  Found{' '}
                  <strong className="text-whiskey-800">{results.length}</strong>{' '}
                  {results.length === 1 ? 'product' : 'products'}
                  {fromCache && (
                    <span className="ml-2 text-xs text-oak-400">(cached)</span>
                  )}
                </>
              )}
            </p>

            {results.length > 0 && (
              <p className="text-xs text-oak-400 hidden sm:block">
                OLCC statewide pricing
              </p>
            )}
          </div>

          {/* Empty state */}
          {results.length === 0 && (
            <div className="rounded-xl border border-oak-200 bg-oak-50 px-6 py-10 text-center">
              <svg
                className="mx-auto h-10 w-10 text-oak-300 mb-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21a48.309 48.309 0 01-8.135-.687c-1.718-.293-2.3-2.379-1.067-3.61L5 14.5"
                />
              </svg>
              <p className="text-oak-600 font-medium">No products found</p>
              <p className="text-sm text-oak-500 mt-1">
                Try a different search term (brand, category, or item code).
              </p>
            </div>
          )}

          {/* Product cards */}
          {results.length > 0 && (
            <div className="grid grid-cols-1 gap-3">
              {results.map((store, idx) => (
                <ProductCard key={`${store.itemCode}-${store.bottleSize}-${idx}`} store={store} searchQuery={query} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Attribution */}
      <p className="mt-8 text-center text-xs text-oak-400">
        Powered by{' '}
        <a
          href="https://www.oregonliquorsearch.com"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:text-whiskey-600 transition-colors"
          aria-label="Oregon Liquor Search (opens in new tab)"
        >
          Oregon Liquor Search
        </a>{' '}
        &mdash; OLCC data updated daily
      </p>
    </div>
  );
}
