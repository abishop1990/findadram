'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useDebounce } from '@/hooks/useDebounce';
import type { SearchType } from '@/types/search';

export function SearchBar({ defaultQuery = '', defaultType = 'whiskey' as SearchType }) {
  const router = useRouter();
  const [query, setQuery] = useState(defaultQuery);
  const [type, setType] = useState<SearchType>(defaultType);
  const [suggestions, setSuggestions] = useState<Array<{ id: string; name: string; type: string }>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debouncedQuery = useDebounce(query, 300);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (debouncedQuery.length < 2) {
      return;
    }

    let cancelled = false;

    const fetchSuggestions = async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}&type=${type}&limit=5`);
        const data = await res.json();
        if (!cancelled) {
          setSuggestions(
            (data.results || []).map((r: { id: string; name: string }) => ({
              id: r.id,
              name: r.name,
              type,
            }))
          );
          setShowSuggestions(true);
        }
      } catch {
        // Ignore fetch errors
      }
    };

    fetchSuggestions();

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, type]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (query.trim()) {
        setShowSuggestions(false);
        router.push(`/search?q=${encodeURIComponent(query)}&type=${type}`);
      }
    },
    [query, type, router]
  );

  const handleSuggestionClick = useCallback(
    (suggestion: { id: string; type: string }) => {
      setShowSuggestions(false);
      const path = suggestion.type === 'bar' ? `/bars/${suggestion.id}` : `/whiskeys/${suggestion.id}`;
      router.push(path);
    },
    [router]
  );

  return (
    <div ref={wrapperRef} className="relative w-full max-w-2xl">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <Input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            placeholder={type === 'bar' ? 'Search bars near you...' : 'Search whiskeys...'}
            className="pr-4"
          />
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-lg border border-oak-200 bg-white shadow-lg">
              {suggestions.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className="w-full px-4 py-2 text-left text-sm hover:bg-amber-50 first:rounded-t-lg last:rounded-b-lg"
                  onClick={() => handleSuggestionClick(s)}
                >
                  {s.name}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex rounded-lg border border-oak-300 overflow-hidden">
          <button
            type="button"
            className={`px-3 py-2 text-sm font-medium transition-colors ${type === 'whiskey' ? 'bg-amber-600 text-white' : 'bg-white text-oak-600 hover:bg-oak-50'}`}
            onClick={() => setType('whiskey')}
          >
            Whiskey
          </button>
          <button
            type="button"
            className={`px-3 py-2 text-sm font-medium transition-colors ${type === 'bar' ? 'bg-amber-600 text-white' : 'bg-white text-oak-600 hover:bg-oak-50'}`}
            onClick={() => setType('bar')}
          >
            Bar
          </button>
        </div>
        <Button type="submit">Search</Button>
      </form>
    </div>
  );
}
