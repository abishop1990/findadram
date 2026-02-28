'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Coordinates } from '@/types/geo';

const STORAGE_KEY = 'findadram_location';

export function useLocation() {
  const [coords, setCoords] = useState<Coordinates | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load cached location on mount
  useEffect(() => {
    try {
      const cached = sessionStorage.getItem(STORAGE_KEY);
      if (cached) {
        setCoords(JSON.parse(cached));
      }
    } catch {
      // Ignore
    }
  }, []);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }

    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newCoords: Coordinates = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setCoords(newCoords);
        setLoading(false);
        try {
          sessionStorage.setItem(STORAGE_KEY, JSON.stringify(newCoords));
        } catch {
          // Ignore
        }
      },
      (err) => {
        setLoading(false);
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setError('Location permission denied');
            break;
          case err.POSITION_UNAVAILABLE:
            setError('Location unavailable');
            break;
          case err.TIMEOUT:
            setError('Location request timed out');
            break;
          default:
            setError('Failed to get location');
        }
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  }, []);

  const updateCoords = useCallback((newCoords: Coordinates) => {
    setCoords(newCoords);
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(newCoords));
    } catch {
      // Ignore
    }
  }, []);

  const clearCoords = useCallback(() => {
    setCoords(null);
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore
    }
  }, []);

  return { coords, loading, error, requestLocation, updateCoords, clearCoords };
}
