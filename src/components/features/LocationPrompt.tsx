'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useLocation } from '@/hooks/useLocation';

export function LocationPrompt() {
  const { coords, loading, error, requestLocation, updateCoords, clearCoords } = useLocation();
  const [manualInput, setManualInput] = useState('');
  const [showManual, setShowManual] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState<string | null>(null);

  // Manual input form — check BEFORE coords so "Change" actually works
  if (showManual) {
    return (
      <form
        className="flex flex-col gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!manualInput.trim()) return;

          setGeocoding(true);
          setGeocodeError(null);

          try {
            const res = await fetch(`/api/geocode?q=${encodeURIComponent(manualInput)}`);
            if (!res.ok) {
              setGeocodeError('Could not find that location. Try a zip code or city name.');
              setGeocoding(false);
              return;
            }
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
              const { lat, lon } = data[0];
              updateCoords({ lat: parseFloat(lat), lng: parseFloat(lon) });
              setShowManual(false);
              setManualInput('');
            } else {
              setGeocodeError('No results found. Try a different search.');
            }
          } catch {
            setGeocodeError('Network error. Please try again.');
          } finally {
            setGeocoding(false);
          }
        }}
      >
        <div className="flex gap-2">
          <Input
            type="text"
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            placeholder="Enter city or zip code..."
            className="max-w-xs"
            disabled={geocoding}
          />
          <Button type="submit" size="sm" disabled={geocoding}>
            {geocoding ? 'Finding...' : 'Set Location'}
          </Button>
        </div>
        {geocodeError && (
          <p className="text-xs text-red-500">{geocodeError}</p>
        )}
        {coords && (
          <button
            type="button"
            className="text-xs text-oak-500 underline hover:text-oak-700 self-start"
            onClick={() => {
              setShowManual(false);
              setGeocodeError(null);
            }}
          >
            Cancel
          </button>
        )}
      </form>
    );
  }

  // Location already detected
  if (coords) {
    return (
      <div className="flex items-center gap-2 text-sm text-oak-600">
        <svg className="h-4 w-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
        </svg>
        <span>Location detected</span>
        <button
          className="text-amber-600 underline hover:text-amber-700"
          onClick={() => setShowManual(true)}
        >
          Change
        </button>
      </div>
    );
  }

  // No location yet — prompt user
  return (
    <div className="flex flex-col items-center gap-2">
      <Button
        onClick={requestLocation}
        disabled={loading}
        variant="outline"
        size="sm"
      >
        {loading ? 'Detecting...' : 'Use My Location'}
      </Button>
      {error && (
        <div className="flex flex-col items-center gap-1">
          <p className="text-xs text-red-500">{error}</p>
          <button
            className="text-xs text-amber-600 underline hover:text-amber-700"
            onClick={() => setShowManual(true)}
          >
            Enter location manually
          </button>
        </div>
      )}
      <button
        className="text-xs text-oak-500 underline hover:text-oak-700"
        onClick={() => setShowManual(true)}
      >
        or enter manually
      </button>
    </div>
  );
}
