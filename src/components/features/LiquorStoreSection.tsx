'use client';

import { useState, useCallback } from 'react';
import type { LiquorStoreResult } from '@/lib/liquor-search';

interface LiquorStoreSectionProps {
  whiskeyName: string;
  defaultZip?: string;
}

export function LiquorStoreSection({ whiskeyName, defaultZip = '' }: LiquorStoreSectionProps) {
  const [zipCode, setZipCode] = useState(defaultZip);
  const [results, setResults] = useState<LiquorStoreResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const handleSearch = useCallback(async () => {
    setLoading(true);
    setError(null);
    setResults(null);
    setSearched(false);

    try {
      const params = new URLSearchParams({ q: whiskeyName, state: 'OR' });
      if (zipCode.trim()) params.set('zip', zipCode.trim());

      const res = await fetch(`/api/liquor-search?${params}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? `Search failed (${res.status})`);
      }

      setResults(data.results ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed. Try again.');
    } finally {
      setLoading(false);
      setSearched(true);
    }
  }, [whiskeyName, zipCode]);

  const inStockResults = results?.filter((r) => r.inStock) ?? [];

  return (
    <div>
      {/* Search trigger */}
      {!searched && !loading && (
        <div className="text-center py-4">
          <p className="text-sm text-oak-600 mb-3">
            Search Oregon liquor stores for a bottle to take home.
          </p>
          <div className="flex items-center gap-2 justify-center max-w-xs sm:max-w-sm mx-auto">
            <input
              type="text"
              inputMode="numeric"
              value={zipCode}
              onChange={(e) => setZipCode(e.target.value.replace(/\D/g, '').slice(0, 5))}
              placeholder="ZIP code (optional)"
              maxLength={5}
              className="flex-1 rounded-lg border border-oak-200 px-3 py-2 text-sm text-whiskey-900 placeholder-oak-400 focus:border-whiskey-400 focus:outline-none focus:ring-1 focus:ring-whiskey-400 transition-colors"
              aria-label="ZIP code for store search"
            />
            <button
              type="button"
              onClick={handleSearch}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-lg bg-whiskey-600 px-4 py-2 text-sm font-semibold text-white hover:bg-whiskey-500 disabled:opacity-50 transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              Search Stores
            </button>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="text-center py-6">
          <svg className="h-6 w-6 text-whiskey-500 animate-spin mx-auto mb-2" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="text-sm text-oak-500">Searching Oregon liquor stores&hellip;</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
          <button type="button" onClick={handleSearch} className="ml-2 underline hover:no-underline">
            Retry
          </button>
        </div>
      )}

      {/* Results */}
      {searched && !error && results && (
        <div>
          {results.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-sm text-oak-500">No bottles found at Oregon liquor stores.</p>
              <p className="text-xs text-oak-400 mt-1">
                Try the full{' '}
                <a href="/bottles" className="text-whiskey-600 hover:underline">Bottle Finder</a>
                {' '}with a different search term.
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-oak-600">
                  <strong className="text-whiskey-800">{results.length}</strong> {results.length === 1 ? 'product' : 'products'} found
                </p>
                <button
                  type="button"
                  onClick={() => { setSearched(false); setResults(null); }}
                  className="text-xs text-oak-400 hover:text-whiskey-600 transition-colors"
                >
                  New search
                </button>
              </div>

              <div className="space-y-2 max-h-80 overflow-y-auto">
                {results.slice(0, 10).map((store, idx) => (
                    <div
                      key={`${store.itemCode}-${store.bottleSize}-${idx}`}
                      className="flex items-start justify-between gap-3 rounded-lg border border-oak-200 bg-white px-3 py-2.5 text-sm transition-colors hover:border-whiskey-300"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-whiskey-900 text-sm">
                          {store.productName || whiskeyName}
                        </p>
                        {store.category && (
                          <p className="text-xs text-oak-500 mt-0.5">{store.category}</p>
                        )}
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-xs text-oak-500">
                          {store.bottleSize && <span>{store.bottleSize}</span>}
                          {store.proof != null && <span>{store.proof} proof</span>}
                          {store.itemCode && <span className="font-mono">#{store.itemCode}</span>}
                        </div>
                      </div>
                      <div className="shrink-0 flex flex-col items-end gap-1">
                        {store.price != null && (
                          <span className="text-sm font-bold text-whiskey-700">
                            ${store.price.toFixed(2)}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          OLCC statewide
                        </span>
                      </div>
                    </div>
                ))}
              </div>

              {results.length > 10 && (
                <p className="text-center text-xs text-oak-400 mt-2">
                  Showing 10 of {results.length} products.{' '}
                  <a href={`/bottles?q=${encodeURIComponent(whiskeyName)}`} className="text-whiskey-600 hover:underline">See all on Bottle Finder</a>
                </p>
              )}

              <p className="text-xs text-oak-400 mt-3 text-center">
                Data from{' '}
                <a href="https://www.oregonliquorsearch.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-whiskey-600">
                  Oregon Liquor Search
                </a>{' '}
                &mdash; updated daily
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
