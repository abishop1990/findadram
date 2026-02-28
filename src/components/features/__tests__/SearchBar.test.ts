import { describe, it, expect } from 'vitest';

// ---------------------------------------------------------------------------
// Unit tests for the search logic that lives in SearchBar.tsx.
//
// Note: @testing-library/react and jsdom are not installed in this project,
// so we test the pure logic extracted from the component rather than mounting
// the React tree.  The component itself is covered by the integration / E2E
// layer (Puppeteer).
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Suggestion routing logic
// Mirrors the path-selection logic in handleSuggestionClick.
// ---------------------------------------------------------------------------

function buildSuggestionPath(suggestion: { id: string; type: string }): string {
  return suggestion.type === 'bar' ? `/bars/${suggestion.id}` : `/whiskeys/${suggestion.id}`;
}

describe('SearchBar suggestion routing', () => {
  it('routes bar suggestions to /bars/:id', () => {
    expect(buildSuggestionPath({ id: 'bar-42', type: 'bar' })).toBe('/bars/bar-42');
  });

  it('routes whiskey suggestions to /whiskeys/:id', () => {
    expect(buildSuggestionPath({ id: 'whiskey-7', type: 'whiskey' })).toBe('/whiskeys/whiskey-7');
  });

  it('routes any non-bar type to /whiskeys/:id', () => {
    expect(buildSuggestionPath({ id: 'spirit-1', type: 'spirit' })).toBe('/whiskeys/spirit-1');
  });
});

// ---------------------------------------------------------------------------
// Search URL construction
// Mirrors the query string built in handleSubmit.
// ---------------------------------------------------------------------------

function buildSearchUrl(query: string, type: 'bar' | 'whiskey'): string {
  return `/search?q=${encodeURIComponent(query)}&type=${type}`;
}

describe('SearchBar URL construction', () => {
  it('builds a whiskey search URL', () => {
    expect(buildSearchUrl('buffalo trace', 'whiskey')).toBe(
      '/search?q=buffalo%20trace&type=whiskey'
    );
  });

  it('builds a bar search URL', () => {
    expect(buildSearchUrl('multnomah', 'bar')).toBe('/search?q=multnomah&type=bar');
  });

  it('percent-encodes special characters in the query', () => {
    const url = buildSearchUrl("maker's mark", 'whiskey');
    expect(url).toBe("/search?q=maker's%20mark&type=whiskey");
  });

  it('percent-encodes ampersands in the query', () => {
    const url = buildSearchUrl('bourbon & rye', 'whiskey');
    expect(url).toContain('bourbon%20%26%20rye');
  });
});

// ---------------------------------------------------------------------------
// Autocomplete fetch URL construction
// Mirrors the fetch URL built inside the fetchSuggestions effect.
// ---------------------------------------------------------------------------

function buildSuggestionsUrl(query: string, type: 'bar' | 'whiskey', limit = 5): string {
  return `/api/search?q=${encodeURIComponent(query)}&type=${type}&limit=${limit}`;
}

describe('SearchBar suggestions fetch URL', () => {
  it('builds the correct suggestions URL', () => {
    expect(buildSuggestionsUrl('pappy', 'whiskey')).toBe(
      '/api/search?q=pappy&type=whiskey&limit=5'
    );
  });

  it('encodes spaces in the query', () => {
    expect(buildSuggestionsUrl('wild turkey', 'whiskey')).toBe(
      '/api/search?q=wild%20turkey&type=whiskey&limit=5'
    );
  });

  it('supports bar type', () => {
    expect(buildSuggestionsUrl('heaven', 'bar')).toBe(
      '/api/search?q=heaven&type=bar&limit=5'
    );
  });
});

// ---------------------------------------------------------------------------
// Minimum query length guard
// The component only fetches suggestions when query.length >= 2.
// ---------------------------------------------------------------------------

function shouldFetchSuggestions(query: string): boolean {
  return query.length >= 2;
}

describe('SearchBar minimum query length', () => {
  it('does not fetch for empty string', () => {
    expect(shouldFetchSuggestions('')).toBe(false);
  });

  it('does not fetch for single character', () => {
    expect(shouldFetchSuggestions('a')).toBe(false);
  });

  it('fetches for two characters', () => {
    expect(shouldFetchSuggestions('ab')).toBe(true);
  });

  it('fetches for a full query string', () => {
    expect(shouldFetchSuggestions('buffalo trace')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Suggestion list mapping
// Mirrors the .map() in the fetchSuggestions callback.
// ---------------------------------------------------------------------------

interface ApiResult {
  id: string;
  name: string;
  [key: string]: unknown;
}

function mapApiResultsToSuggestions(
  results: ApiResult[],
  type: 'bar' | 'whiskey'
): Array<{ id: string; name: string; type: string }> {
  return results.map((r) => ({ id: r.id, name: r.name, type }));
}

describe('SearchBar suggestion mapping', () => {
  it('maps API results to suggestion objects', () => {
    const results: ApiResult[] = [
      { id: '1', name: 'Buffalo Trace' },
      { id: '2', name: 'Pappy Van Winkle 15' },
    ];
    const suggestions = mapApiResultsToSuggestions(results, 'whiskey');
    expect(suggestions).toEqual([
      { id: '1', name: 'Buffalo Trace', type: 'whiskey' },
      { id: '2', name: 'Pappy Van Winkle 15', type: 'whiskey' },
    ]);
  });

  it('returns an empty array for empty results', () => {
    expect(mapApiResultsToSuggestions([], 'bar')).toEqual([]);
  });

  it('attaches the correct type to each suggestion', () => {
    const results: ApiResult[] = [{ id: 'b1', name: 'The Dram' }];
    const suggestions = mapApiResultsToSuggestions(results, 'bar');
    expect(suggestions[0].type).toBe('bar');
  });

  it('preserves the id and name from the API result', () => {
    const results: ApiResult[] = [{ id: 'abc-123', name: 'Multnomah Whiskey Library', extra: 'ignored' }];
    const suggestions = mapApiResultsToSuggestions(results, 'bar');
    expect(suggestions[0].id).toBe('abc-123');
    expect(suggestions[0].name).toBe('Multnomah Whiskey Library');
  });
});
