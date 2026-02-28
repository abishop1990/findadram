'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useDebounce } from '@/hooks/useDebounce';
import { useLocation } from '@/hooks/useLocation';
import type { SearchType } from '@/types/search';

interface LocationState {
  lat: number;
  lng: number;
  displayName: string;
}

interface SearchBarProps {
  defaultQuery?: string;
  defaultType?: SearchType;
  defaultLat?: number;
  defaultLng?: number;
  defaultLocationName?: string;
}

export function SearchBar({
  defaultQuery = '',
  defaultType = 'whiskey' as SearchType,
  defaultLat,
  defaultLng,
  defaultLocationName,
}: SearchBarProps) {
  const router = useRouter();
  const { coords, loading: geoLoading, error: geoError, requestLocation, updateCoords, clearCoords } = useLocation();

  // Search state
  const [query, setQuery] = useState(defaultQuery);
  const [type, setType] = useState<SearchType>(defaultType);
  const [suggestions, setSuggestions] = useState<Array<{ id: string; name: string; type: string }>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debouncedQuery = useDebounce(query, 300);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Location state
  const [locationInput, setLocationInput] = useState('');
  const [location, setLocation] = useState<LocationState | null>(
    defaultLat !== undefined && defaultLng !== undefined
      ? { lat: defaultLat, lng: defaultLng, displayName: defaultLocationName || `${defaultLat.toFixed(2)}, ${defaultLng.toFixed(2)}` }
      : null
  );
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState<string | null>(null);
  const [showLocationInput, setShowLocationInput] = useState(false);
  const [reverseGeocoding, setReverseGeocoding] = useState(false);

  // Reverse geocode browser coordinates to get a display name
  const reverseGeocode = useCallback(async (lat: number, lng: number): Promise<string> => {
    try {
      const res = await fetch(`/api/geocode?lat=${lat}&lng=${lng}`);
      if (!res.ok) return `${lat.toFixed(2)}, ${lng.toFixed(2)}`;
      const data = await res.json();
      if (data && data.address) {
        const parts: string[] = [];
        const addr = data.address;
        if (addr.neighbourhood || addr.suburb) {
          parts.push(addr.neighbourhood || addr.suburb);
        }
        if (addr.city || addr.town || addr.village) {
          parts.push(addr.city || addr.town || addr.village);
        }
        if (addr.state) {
          parts.push(addr.state);
        }
        return parts.length > 0 ? parts.join(', ') : data.display_name || `${lat.toFixed(2)}, ${lng.toFixed(2)}`;
      }
      if (data && data.display_name) {
        const name = data.display_name as string;
        const segments = name.split(', ');
        return segments.length > 3 ? segments.slice(0, 3).join(', ') : name;
      }
      return `${lat.toFixed(2)}, ${lng.toFixed(2)}`;
    } catch {
      return `${lat.toFixed(2)}, ${lng.toFixed(2)}`;
    }
  }, []);

  // When browser geolocation provides new coords, reverse geocode and set location
  useEffect(() => {
    if (!coords) return;
    // Don't overwrite if the coords match the current location
    if (location && Math.abs(location.lat - coords.lat) < 0.001 && Math.abs(location.lng - coords.lng) < 0.001) {
      return;
    }

    let cancelled = false;
    setReverseGeocoding(true);

    reverseGeocode(coords.lat, coords.lng).then((displayName) => {
      if (!cancelled) {
        setLocation({ lat: coords.lat, lng: coords.lng, displayName });
        setShowLocationInput(false);
        setReverseGeocoding(false);
      }
    });

    return () => { cancelled = true; };
  }, [coords, location, reverseGeocode]);

  // Fetch autocomplete suggestions
  useEffect(() => {
    if (debouncedQuery.length < 2) {
      return;
    }

    let cancelled = false;

    const fetchSuggestions = async () => {
      try {
        const params = new URLSearchParams({
          q: debouncedQuery,
          type,
          limit: '5',
        });
        if (location) {
          params.set('lat', String(location.lat));
          params.set('lng', String(location.lng));
        }
        const res = await fetch(`/api/search?${params.toString()}`);
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
  }, [debouncedQuery, type, location]);

  // Close suggestions on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Geocode a location string
  const geocodeLocation = useCallback(async (input: string) => {
    if (!input.trim()) return;

    setGeocoding(true);
    setGeocodeError(null);

    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(input)}`);
      if (!res.ok) {
        setGeocodeError('Could not find that location. Try a zip code or city name.');
        setGeocoding(false);
        return;
      }
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const result = data[0];
        const lat = parseFloat(result.lat);
        const lon = parseFloat(result.lon);

        // Build a clean display name from address parts
        let displayName = '';
        if (result.address) {
          const parts: string[] = [];
          const addr = result.address;
          if (addr.neighbourhood || addr.suburb) {
            parts.push(addr.neighbourhood || addr.suburb);
          }
          if (addr.city || addr.town || addr.village) {
            parts.push(addr.city || addr.town || addr.village);
          }
          if (addr.state) {
            parts.push(addr.state);
          }
          displayName = parts.length > 0 ? parts.join(', ') : result.display_name || input;
        } else {
          displayName = result.display_name || input;
        }

        setLocation({ lat, lng: lon, displayName });
        updateCoords({ lat, lng: lon });
        setLocationInput('');
        setShowLocationInput(false);
        setGeocodeError(null);
      } else {
        setGeocodeError('No results found. Try a different search.');
      }
    } catch {
      setGeocodeError('Network error. Please try again.');
    } finally {
      setGeocoding(false);
    }
  }, [updateCoords]);

  // Handle "Near me" button
  const handleNearMe = useCallback(() => {
    setLocation(null);
    requestLocation();
  }, [requestLocation]);

  // Clear location
  const handleClearLocation = useCallback(() => {
    setLocation(null);
    setLocationInput('');
    setGeocodeError(null);
    clearCoords();
  }, [clearCoords]);

  // Submit search
  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (query.trim()) {
        setShowSuggestions(false);
        const params = new URLSearchParams({ q: query, type });
        if (location) {
          params.set('lat', location.lat.toFixed(4));
          params.set('lng', location.lng.toFixed(4));
        }
        router.push(`/search?${params.toString()}`);
      }
    },
    [query, type, location, router]
  );

  // Handle suggestion click
  const handleSuggestionClick = useCallback(
    (suggestion: { id: string; type: string }) => {
      setShowSuggestions(false);
      const path = suggestion.type === 'bar' ? `/bars/${suggestion.id}` : `/whiskeys/${suggestion.id}`;
      router.push(path);
    },
    [router]
  );

  // Handle location input submit
  const handleLocationSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      geocodeLocation(locationInput);
    },
    [locationInput, geocodeLocation]
  );

  return (
    <div ref={wrapperRef} className="relative w-full max-w-2xl px-4 sm:px-0">
      {/* Main search form */}
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1 order-2 sm:order-1">
          <Input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            placeholder={type === 'bar' ? 'Search bars near you...' : 'Search whiskeys...'}
            className="w-full pr-4 h-11 sm:h-10"
            aria-label={`Search ${type === 'bar' ? 'bars' : 'whiskeys'}`}
          />
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 z-50 mt-2 rounded-lg border border-oak-200 bg-white shadow-lg max-h-48 sm:max-h-60 overflow-y-auto scrollbar-none">
              {suggestions.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className="w-full px-4 py-3 sm:py-2 text-left text-sm hover:bg-amber-50 first:rounded-t-lg last:rounded-b-lg transition-colors duration-150 min-h-11 sm:min-h-auto"
                  onClick={() => handleSuggestionClick(s)}
                >
                  {s.name}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex rounded-lg border border-oak-300 overflow-hidden order-3 sm:order-2">
          <button
            type="button"
            className={`flex-1 sm:flex-none px-3 py-2.5 sm:py-2 text-xs sm:text-sm font-medium transition-colors duration-150 min-h-11 sm:min-h-auto ${type === 'whiskey' ? 'bg-amber-600 text-white' : 'bg-white text-oak-600 hover:bg-oak-50'}`}
            onClick={() => setType('whiskey')}
          >
            Whiskey
          </button>
          <button
            type="button"
            className={`flex-1 sm:flex-none px-3 py-2.5 sm:py-2 text-xs sm:text-sm font-medium transition-colors duration-150 min-h-11 sm:min-h-auto ${type === 'bar' ? 'bg-amber-600 text-white' : 'bg-white text-oak-600 hover:bg-oak-50'}`}
            onClick={() => setType('bar')}
          >
            Bar
          </button>
        </div>
        <Button type="submit" className="order-1 sm:order-3 w-full sm:w-auto min-h-11">Search</Button>
      </form>

      {/* Location row */}
      <div className="mt-2">
        {/* Active location pill */}
        {location && !showLocationInput && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 border border-amber-200 px-3 py-1 text-xs font-medium text-amber-800">
              <svg className="h-3 w-3 text-amber-600 shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                <path fillRule="evenodd" d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 00.281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 103 9c0 3.492 1.698 5.988 3.355 7.584a13.731 13.731 0 002.273 1.765 11.842 11.842 0 00.757.433 5.737 5.737 0 00.28.14l.019.008.006.003zM10 11.25a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5z" clipRule="evenodd" />
              </svg>
              <span className="truncate max-w-48 sm:max-w-72">{location.displayName}</span>
              <button
                type="button"
                onClick={handleClearLocation}
                className="ml-0.5 rounded-full p-0.5 hover:bg-amber-200 transition-colors"
                aria-label="Clear location"
              >
                <svg className="h-3 w-3 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
            <button
              type="button"
              onClick={() => setShowLocationInput(true)}
              className="text-xs text-oak-400 hover:text-oak-600 transition-colors"
            >
              Change
            </button>
          </div>
        )}

        {/* Reverse geocoding in progress */}
        {reverseGeocoding && !location && (
          <div className="flex items-center gap-2 text-xs text-oak-400">
            <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Detecting your location...
          </div>
        )}

        {/* Collapsed location prompt (no location set) */}
        {!location && !reverseGeocoding && !showLocationInput && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowLocationInput(true)}
              className="inline-flex items-center gap-1.5 text-xs text-oak-400 hover:text-oak-600 transition-colors"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
              </svg>
              Add location for nearby results
            </button>
          </div>
        )}

        {/* Expanded location input */}
        {showLocationInput && (
          <form onSubmit={handleLocationSubmit} className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5">
              <div className="relative flex-1">
                <Input
                  type="text"
                  value={locationInput}
                  onChange={(e) => {
                    setLocationInput(e.target.value);
                    setGeocodeError(null);
                  }}
                  placeholder="City, zip code, or neighborhood..."
                  className="w-full h-11 text-xs pr-3 pl-3"
                  disabled={geocoding}
                  aria-label="Location search"
                />
              </div>
              {/* Near me button */}
              <button
                type="button"
                onClick={handleNearMe}
                disabled={geoLoading}
                className="shrink-0 inline-flex items-center justify-center h-11 w-11 rounded-lg border border-oak-300 bg-white text-oak-500 hover:bg-oak-50 hover:text-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Use my location"
                title="Use my location"
              >
                {geoLoading ? (
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  /* Crosshair / locate icon */
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <circle cx="12" cy="12" r="3" />
                    <path strokeLinecap="round" d="M12 2v4m0 12v4m10-10h-4M6 12H2" />
                  </svg>
                )}
              </button>
              {/* Set location button */}
              <Button
                type="submit"
                size="sm"
                disabled={geocoding || !locationInput.trim()}
                className="shrink-0 h-11 text-xs px-3"
              >
                {geocoding ? 'Finding...' : 'Set'}
              </Button>
            </div>

            {/* Errors */}
            {geocodeError && (
              <p className="text-xs text-red-400">{geocodeError}</p>
            )}
            {geoError && (
              <p className="text-xs text-red-400">{geoError}</p>
            )}

            {/* Cancel when location already set and user is changing */}
            {location && (
              <button
                type="button"
                onClick={() => {
                  setShowLocationInput(false);
                  setGeocodeError(null);
                  setLocationInput('');
                }}
                className="self-start text-xs text-oak-400 hover:text-oak-600 transition-colors"
              >
                Cancel
              </button>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
