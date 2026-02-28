'use client';

import { useState, useCallback } from 'react';
import type { LiquorStoreResult } from '@/lib/liquor-search';

// ─── Sub-components ───────────────────────────────────────────────────────────

function StoreCard({ store }: { store: LiquorStoreResult }) {
  const distanceMiles =
    store.distanceMeters != null
      ? (store.distanceMeters / 1609.34).toFixed(1)
      : null;

  return (
    <article className="rounded-xl border border-oak-200 bg-white p-4 shadow-sm hover:border-whiskey-300 hover:shadow-md transition-all duration-150">
      {/* Store name + in-stock badge */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <h3 className="font-semibold text-whiskey-900 text-sm leading-snug">
          {store.storeName}
        </h3>
        <span
          className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
            store.inStock
              ? 'bg-emerald-100 text-emerald-800'
              : 'bg-oak-100 text-oak-500'
          }`}
          aria-label={store.inStock ? 'In stock' : 'Out of stock'}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${store.inStock ? 'bg-emerald-500' : 'bg-oak-400'}`}
            aria-hidden="true"
          />
          {store.inStock ? 'In Stock' : 'Out of Stock'}
        </span>
      </div>

      {/* Address */}
      <address className="not-italic text-xs text-oak-600 leading-relaxed mb-3">
        {store.storeAddress}
        {store.storeAddress && <br />}
        {store.city}, {store.state} {store.zipCode}
      </address>

      {/* Details row */}
      <dl className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {store.price != null && (
          <div className="flex items-center gap-1">
            <dt className="text-oak-500 sr-only">Price</dt>
            <dd className="font-bold text-whiskey-700 text-sm">
              ${store.price.toFixed(2)}
            </dd>
          </div>
        )}

        {store.bottleSize && (
          <div className="flex items-center gap-1">
            <dt className="text-oak-500">Size:</dt>
            <dd className="text-whiskey-800">{store.bottleSize}</dd>
          </div>
        )}

        {store.quantity != null && (
          <div className="flex items-center gap-1">
            <dt className="text-oak-500">Qty:</dt>
            <dd className="text-whiskey-800">{store.quantity}</dd>
          </div>
        )}

        {distanceMiles != null && (
          <div className="flex items-center gap-1">
            <dt className="text-oak-500">
              <svg
                className="h-3 w-3 inline"
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
              <span className="sr-only">Distance</span>
            </dt>
            <dd className="text-whiskey-800">{distanceMiles} mi</dd>
          </div>
        )}
      </dl>

      {/* Phone / hours */}
      {(store.phone || store.storeHours) && (
        <div className="mt-2 pt-2 border-t border-oak-100 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-oak-500">
          {store.phone && (
            <a
              href={`tel:${store.phone.replace(/\D/g, '')}`}
              className="hover:text-whiskey-700 transition-colors"
              aria-label={`Call ${store.storeName}`}
            >
              {store.phone}
            </a>
          )}
          {store.storeHours && <span>{store.storeHours}</span>}
        </div>
      )}
    </article>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface SearchResponse {
  results: LiquorStoreResult[];
  fromCache: boolean;
  error?: string;
}

export function BottleFinder() {
  const [query, setQuery] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [results, setResults] = useState<LiquorStoreResult[] | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

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

  const inStockCount = results?.filter((r) => r.inStock).length ?? 0;

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
                  (optional — narrows to 10 miles)
                </span>
              </label>
              <input
                id="bottle-zip"
                type="text"
                inputMode="numeric"
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value.replace(/\D/g, '').slice(0, 5))}
                placeholder="97201"
                maxLength={5}
                pattern="\d{5}"
                className="w-full rounded-lg border border-oak-300 bg-white px-4 py-2.5 text-whiskey-900 placeholder:text-oak-400 shadow-sm focus:border-whiskey-400 focus:ring-2 focus:ring-whiskey-300/50 focus:outline-none transition-colors text-sm"
                aria-label="Oregon ZIP code for nearby store search"
              />
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
                <>No stores found for &ldquo;{query}&rdquo;.</>
              ) : (
                <>
                  Found{' '}
                  <strong className="text-whiskey-800">{results.length}</strong>{' '}
                  {results.length === 1 ? 'store' : 'stores'}
                  {inStockCount > 0 && (
                    <>
                      {' '}
                      &mdash;{' '}
                      <strong className="text-emerald-700">{inStockCount} in stock</strong>
                    </>
                  )}
                  {fromCache && (
                    <span className="ml-2 text-xs text-oak-400">(cached)</span>
                  )}
                </>
              )}
            </p>

            {results.length > 0 && (
              <p className="text-xs text-oak-400 hidden sm:block">
                Quantities updated daily by OLCC
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
              <p className="text-oak-600 font-medium">No bottles found nearby</p>
              <p className="text-sm text-oak-500 mt-1">
                Try a broader search term or a different ZIP code.
              </p>
            </div>
          )}

          {/* Store cards */}
          {results.length > 0 && (
            <div className="grid grid-cols-1 gap-3">
              {results.map((store, idx) => (
                <StoreCard key={`${store.storeAddress}-${store.bottleSize}-${idx}`} store={store} />
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
