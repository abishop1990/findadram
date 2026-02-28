'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useLocation } from '@/hooks/useLocation';
import { BarCard } from '@/components/features/BarCard';
import type { BarSearchResult } from '@/types/database';

interface NearbyBarsState {
  bars: BarSearchResult[];
  loading: boolean;
  error: string | null;
}

export function NearbyBars() {
  const { coords, loading: locationLoading, error: locationError, requestLocation } = useLocation();
  const [{ bars, loading: barsLoading, error: barsError }, setState] = useState<NearbyBarsState>({
    bars: [],
    loading: false,
    error: null,
  });

  useEffect(() => {
    if (!coords) return;

    const controller = new AbortController();

    async function fetchNearbyBars() {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      const params = new URLSearchParams({
        type: 'bar',
        lat: String(coords!.lat),
        lng: String(coords!.lng),
        limit: '8',
      });

      try {
        const res = await fetch(`/api/search?${params.toString()}`, {
          signal: controller.signal,
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error((body as { error?: string }).error ?? `Request failed (${res.status})`);
        }

        const body = (await res.json()) as { results: BarSearchResult[] };
        setState({ bars: body.results ?? [], loading: false, error: null });
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        setState((prev) => ({
          ...prev,
          loading: false,
          error: (err as Error).message ?? 'Failed to load nearby bars',
        }));
      }
    }

    fetchNearbyBars();

    return () => {
      controller.abort();
    };
  }, [coords]);

  // --- No location yet ---
  if (!coords) {
    return (
      <section aria-label="Nearby bars" className="rounded-xl border border-oak-200 bg-whiskey-50 p-6 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-whiskey-100">
          {/* Location pin icon */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6 text-whiskey-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
            />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <h2 className="mb-1 text-lg font-semibold text-whiskey-900">Bars near you</h2>
        <p className="mb-4 text-sm text-oak-500">
          {locationError ?? 'Enable location to see nearby bars serving your favourite drams.'}
        </p>
        <button
          type="button"
          onClick={requestLocation}
          disabled={locationLoading}
          className="inline-flex items-center gap-2 rounded-lg bg-whiskey-500 px-4 py-2 text-sm font-medium text-whiskey-50 transition-colors hover:bg-whiskey-600 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-whiskey-400"
        >
          {locationLoading ? (
            <>
              <svg
                className="h-4 w-4 animate-spin"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Locating&hellip;
            </>
          ) : (
            'Enable location'
          )}
        </button>
      </section>
    );
  }

  // --- Loading bars ---
  if (barsLoading) {
    return (
      <section aria-label="Nearby bars" aria-busy="true">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-whiskey-900">Bars near you</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-xl border border-oak-100 bg-oak-100"
              aria-hidden="true"
            />
          ))}
        </div>
      </section>
    );
  }

  // --- Fetch error ---
  if (barsError) {
    return (
      <section aria-label="Nearby bars">
        <h2 className="mb-3 text-lg font-semibold text-whiskey-900">Bars near you</h2>
        <div className="rounded-xl border border-oak-200 bg-whiskey-50 p-5 text-center">
          <p className="text-sm text-oak-500">
            {barsError}. Try{' '}
            <button
              type="button"
              onClick={() => {
                // Re-trigger by clearing and re-requesting (coords already set — force re-fetch via key trick).
                // Simplest: just reload the search.
                setState({ bars: [], loading: false, error: null });
              }}
              className="text-whiskey-500 underline underline-offset-2 hover:text-whiskey-600"
            >
              refreshing
            </button>
            .
          </p>
        </div>
      </section>
    );
  }

  // --- Empty results ---
  if (bars.length === 0) {
    return (
      <section aria-label="Nearby bars">
        <h2 className="mb-3 text-lg font-semibold text-whiskey-900">Bars near you</h2>
        <div className="rounded-xl border border-oak-200 bg-whiskey-50 p-5 text-center">
          <p className="text-sm text-oak-500">No bars found within 50 km. Try searching a different area.</p>
          <Link
            href="/search?type=bar"
            className="mt-3 inline-block text-sm font-medium text-whiskey-500 underline underline-offset-2 hover:text-whiskey-600"
          >
            Browse all bars
          </Link>
        </div>
      </section>
    );
  }

  // --- Results ---
  return (
    <section aria-label="Nearby bars">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-whiskey-900">Bars near you</h2>
        <Link
          href="/search?type=bar"
          className="text-sm font-medium text-whiskey-500 hover:text-whiskey-600 hover:underline hover:underline-offset-2 transition-colors"
        >
          See all nearby &rarr;
        </Link>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {bars.map((bar) => (
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
      </div>
    </section>
  );
}
