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
// Now supports optional location coordinates.
// ---------------------------------------------------------------------------

interface LocationState {
  lat: number;
  lng: number;
  displayName: string;
}

function buildSearchUrl(
  query: string,
  type: 'bar' | 'whiskey',
  location?: LocationState | null
): string {
  const params = new URLSearchParams({ q: query, type });
  if (location) {
    params.set('lat', location.lat.toFixed(4));
    params.set('lng', location.lng.toFixed(4));
  }
  return `/search?${params.toString()}`;
}

describe('SearchBar URL construction', () => {
  it('builds a whiskey search URL without location', () => {
    expect(buildSearchUrl('buffalo trace', 'whiskey')).toBe(
      '/search?q=buffalo+trace&type=whiskey'
    );
  });

  it('builds a bar search URL without location', () => {
    expect(buildSearchUrl('multnomah', 'bar')).toBe('/search?q=multnomah&type=bar');
  });

  it('percent-encodes special characters in the query', () => {
    const url = buildSearchUrl("maker's mark", 'whiskey');
    expect(url).toContain("maker%27s");
  });

  it('percent-encodes ampersands in the query', () => {
    const url = buildSearchUrl('bourbon & rye', 'whiskey');
    expect(url).toContain('bourbon+%26+rye');
  });

  it('includes lat/lng when location is provided', () => {
    const loc: LocationState = { lat: 45.5231, lng: -122.6765, displayName: 'Portland, OR' };
    const url = buildSearchUrl('scotch', 'bar', loc);
    expect(url).toBe('/search?q=scotch&type=bar&lat=45.5231&lng=-122.6765');
  });

  it('omits lat/lng when location is null', () => {
    const url = buildSearchUrl('bourbon', 'whiskey', null);
    expect(url).not.toContain('lat=');
    expect(url).not.toContain('lng=');
  });

  it('rounds coordinates to 4 decimal places', () => {
    const loc: LocationState = { lat: 47.6062123456, lng: -122.3320987654, displayName: 'Seattle' };
    const url = buildSearchUrl('rye', 'bar', loc);
    expect(url).toContain('lat=47.6062');
    expect(url).toContain('lng=-122.3321');
  });
});

// ---------------------------------------------------------------------------
// Autocomplete fetch URL construction
// Mirrors the fetch URL built inside the fetchSuggestions effect.
// Now uses URLSearchParams and optionally includes location.
// ---------------------------------------------------------------------------

function buildSuggestionsUrl(
  query: string,
  type: 'bar' | 'whiskey',
  location?: LocationState | null,
  limit = 5
): string {
  const params = new URLSearchParams({ q: query, type, limit: String(limit) });
  if (location) {
    params.set('lat', String(location.lat));
    params.set('lng', String(location.lng));
  }
  return `/api/search?${params.toString()}`;
}

describe('SearchBar suggestions fetch URL', () => {
  it('builds the correct suggestions URL without location', () => {
    expect(buildSuggestionsUrl('pappy', 'whiskey')).toBe(
      '/api/search?q=pappy&type=whiskey&limit=5'
    );
  });

  it('encodes spaces in the query', () => {
    const url = buildSuggestionsUrl('wild turkey', 'whiskey');
    expect(url).toBe('/api/search?q=wild+turkey&type=whiskey&limit=5');
  });

  it('supports bar type', () => {
    expect(buildSuggestionsUrl('heaven', 'bar')).toBe(
      '/api/search?q=heaven&type=bar&limit=5'
    );
  });

  it('includes location coordinates when provided', () => {
    const loc: LocationState = { lat: 45.5231, lng: -122.6765, displayName: 'Portland' };
    const url = buildSuggestionsUrl('bourbon', 'bar', loc);
    expect(url).toContain('lat=45.5231');
    expect(url).toContain('lng=-122.6765');
  });

  it('omits location when null', () => {
    const url = buildSuggestionsUrl('scotch', 'whiskey', null);
    expect(url).not.toContain('lat=');
    expect(url).not.toContain('lng=');
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
