'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useLocation } from '@/hooks/useLocation';

export function LocationPrompt() {
  const { coords, loading, error, requestLocation } = useLocation();
  const [manualInput, setManualInput] = useState('');
  const [showManual, setShowManual] = useState(false);

  if (coords) {
    return (
      <div className="flex items-center gap-2 text-sm text-stone-600">
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

  if (showManual) {
    return (
      <form
        className="flex gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          if (manualInput.trim()) {
            try {
              const res = await fetch(`/api/geocode?q=${encodeURIComponent(manualInput)}`);
              const data = await res.json();
              if (Array.isArray(data) && data.length > 0) {
                const { lat, lon } = data[0];
                sessionStorage.setItem('findadram_location', JSON.stringify({ lat: parseFloat(lat), lng: parseFloat(lon) }));
                window.location.reload();
              }
            } catch {
              // Silently fail
            }
          }
        }}
      >
        <Input
          type="text"
          value={manualInput}
          onChange={(e) => setManualInput(e.target.value)}
          placeholder="Enter city or zip code..."
          className="max-w-xs"
        />
        <Button type="submit" size="sm">Set Location</Button>
      </form>
    );
  }

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
        className="text-xs text-stone-500 underline hover:text-stone-700"
        onClick={() => setShowManual(true)}
      >
        or enter manually
      </button>
    </div>
  );
}
