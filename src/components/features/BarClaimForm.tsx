'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';

// ─── types ────────────────────────────────────────────────────────────────────

interface BarSearchResult {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
}

type ClaimState =
  | { type: 'idle' }
  | { type: 'searching' }
  | { type: 'results'; bars: BarSearchResult[] }
  | { type: 'no_results' }
  | { type: 'claiming'; barId: string }
  | { type: 'claimed'; barName: string }
  | { type: 'already_claimed' }
  | { type: 'error'; message: string };

interface BarClaimFormProps {
  userId: string;
  existingBarIds?: string[];
}

// ─── component ────────────────────────────────────────────────────────────────

export function BarClaimForm({ userId, existingBarIds = [] }: BarClaimFormProps) {
  const [query, setQuery] = useState('');
  const [state, setState] = useState<ClaimState>({ type: 'idle' });
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounced search
  const handleQueryChange = useCallback((value: string) => {
    setQuery(value);

    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    if (value.trim().length < 2) {
      setState({ type: 'idle' });
      return;
    }

    setState({ type: 'searching' });
    searchTimeout.current = setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          q: value.trim(),
          type: 'bar',
          limit: '8',
        });
        const res = await fetch(`/api/search?${params}`);
        if (!res.ok) throw new Error('Search failed');
        const data = await res.json();
        const bars: BarSearchResult[] = (data.bars ?? []).map((b: BarSearchResult) => ({
          id: b.id,
          name: b.name,
          address: b.address,
          city: b.city,
          state: b.state,
        }));
        if (bars.length === 0) {
          setState({ type: 'no_results' });
        } else {
          setState({ type: 'results', bars });
        }
      } catch {
        setState({ type: 'error', message: 'Search failed. Please try again.' });
      }
    }, 350);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, []);

  async function handleClaim(bar: BarSearchResult) {
    if (existingBarIds.includes(bar.id)) {
      setState({ type: 'already_claimed' });
      return;
    }

    setState({ type: 'claiming', barId: bar.id });

    try {
      const res = await fetch('/api/bar-claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bar_id: bar.id, user_id: userId }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          setState({ type: 'already_claimed' });
        } else {
          setState({ type: 'error', message: data.error ?? 'Failed to submit claim.' });
        }
        return;
      }

      setState({ type: 'claimed', barName: bar.name });
      setQuery('');
    } catch {
      setState({ type: 'error', message: 'Network error. Please try again.' });
    }
  }

  function resetForm() {
    setState({ type: 'idle' });
    setQuery('');
    inputRef.current?.focus();
  }

  // ── success state ──────────────────────────────────────────────────────────
  if (state.type === 'claimed') {
    return (
      <div className="rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 px-6 py-6">
        <div className="flex items-start gap-4">
          <div className="shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-green-100 text-green-600">
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-green-900">Claim submitted for {state.barName}</h3>
            <p className="text-sm text-green-700 mt-1 leading-relaxed">
              Your ownership request is now pending review. Our team will verify your claim
              within 1–2 business days. You&apos;ll gain full menu management access once approved.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 border border-amber-200 px-3 py-1 text-xs font-medium text-amber-800">
                <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 000-1.5H10.75V5z" clipRule="evenodd" />
                </svg>
                Pending review
              </div>
            </div>
          </div>
        </div>
        <div className="mt-5 pt-4 border-t border-green-200">
          <button
            type="button"
            onClick={resetForm}
            className="text-sm font-medium text-green-700 hover:text-green-900 transition-colors"
          >
            Claim another bar &rarr;
          </button>
        </div>
      </div>
    );
  }

  // ── already claimed state ──────────────────────────────────────────────────
  if (state.type === 'already_claimed') {
    return (
      <div className="rounded-xl bg-amber-50 border border-amber-200 px-6 py-5">
        <div className="flex items-start gap-3">
          <svg className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
          <div>
            <p className="font-semibold text-amber-900">You already have a claim for this bar</p>
            <p className="text-sm text-amber-700 mt-1">
              You can only submit one claim per bar. Check your pending claims above.
            </p>
          </div>
        </div>
        <div className="mt-4">
          <button type="button" onClick={resetForm} className="text-sm font-medium text-amber-700 hover:text-amber-900 transition-colors">
            Search a different bar &rarr;
          </button>
        </div>
      </div>
    );
  }

  // ── main search form ───────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <Card className="p-0 overflow-hidden">
        {/* Search header */}
        <div className="flex items-center gap-2 px-5 py-4 border-b border-oak-100 bg-gradient-to-r from-whiskey-50 to-oak-50">
          <svg className="w-4 h-4 text-whiskey-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <h3 className="font-bold text-whiskey-900 text-sm uppercase tracking-wide">Search for your bar</h3>
        </div>

        {/* Search input */}
        <div className="px-5 py-4">
          <div className="relative">
            <Input
              ref={inputRef}
              type="text"
              placeholder="Type your bar name..."
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              aria-label="Search for a bar to claim"
              aria-autocomplete="list"
              aria-controls="bar-search-results"
              className="pr-10"
            />
            {state.type === 'searching' && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2" aria-hidden="true">
                <svg className="h-4 w-4 text-oak-400 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              </div>
            )}
          </div>
          <p className="mt-1.5 text-xs text-oak-400">
            Enter at least 2 characters to search bars
          </p>
        </div>

        {/* Results */}
        {state.type === 'results' && state.bars.length > 0 && (
          <ul
            id="bar-search-results"
            role="listbox"
            aria-label="Bar search results"
            className="border-t border-oak-100 divide-y divide-oak-50"
          >
            {state.bars.map((bar) => {
              const alreadyClaimed = existingBarIds.includes(bar.id);
              return (
                <li
                  key={bar.id}
                  role="option"
                  aria-selected={false}
                  className="px-5 py-3 hover:bg-whiskey-50 transition-colors"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-whiskey-900 text-sm truncate">{bar.name}</p>
                      {(bar.address || bar.city) && (
                        <p className="text-xs text-oak-500 truncate mt-0.5">
                          {bar.address ?? [bar.city, bar.state].filter(Boolean).join(', ')}
                        </p>
                      )}
                    </div>
                    <div className="shrink-0">
                      {alreadyClaimed ? (
                        <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                          Already claimed
                        </span>
                      ) : (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleClaim(bar)}
                          disabled={false}
                          aria-label={`Claim ${bar.name}`}
                        >
                          Claim this bar
                        </Button>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {state.type === 'no_results' && (
          <div className="border-t border-oak-100 px-5 py-6 text-center">
            <svg className="h-8 w-8 text-oak-300 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <p className="text-sm text-oak-600 font-medium">No bars found for &ldquo;{query}&rdquo;</p>
            <p className="text-xs text-oak-400 mt-1">
              Try a shorter search term, or contact us to add your bar to the directory.
            </p>
          </div>
        )}

        {state.type === 'error' && (
          <div className="border-t border-oak-100 px-5 py-4">
            <p className="text-sm text-red-600 flex items-center gap-2">
              <svg className="h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
              </svg>
              {state.message}
            </p>
          </div>
        )}
      </Card>

      {/* How it works */}
      <div className="rounded-xl bg-oak-50 border border-oak-200 px-5 py-4">
        <h4 className="text-xs font-semibold text-oak-700 uppercase tracking-wider mb-3">How claiming works</h4>
        <ol className="space-y-2">
          {[
            'Search for your bar by name',
            'Click "Claim this bar" to submit your ownership request',
            'Our team reviews your claim within 1–2 business days',
            'Once approved, manage your full whiskey menu from your dashboard',
          ].map((step, i) => (
            <li key={i} className="flex items-start gap-2.5 text-xs text-oak-600">
              <span className="shrink-0 flex items-center justify-center w-4 h-4 rounded-full bg-whiskey-200 text-whiskey-700 font-bold text-[10px] mt-0.5">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
