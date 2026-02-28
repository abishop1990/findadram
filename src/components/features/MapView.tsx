'use client';

import { useEffect, useState } from 'react';
import type { Coordinates } from '@/types/geo';

interface MapMarker {
  id: string;
  name: string;
  lat: number;
  lng: number;
  address?: string;
}

interface MapViewProps {
  center: Coordinates;
  markers: MapMarker[];
  zoom?: number;
  className?: string;
}

export function MapView({ center, markers, zoom = 13, className = '' }: MapViewProps) {
  const [MapComponent, setMapComponent] = useState<React.ComponentType<MapViewProps> | null>(null);

  useEffect(() => {
    // Dynamically import Leaflet only on client
    import('./MapViewInner').then((mod) => {
      setMapComponent(() => mod.MapViewInner);
    });
  }, []);

  if (!MapComponent) {
    return (
      <div className={`flex items-center justify-center rounded-lg bg-stone-100 ${className}`} style={{ minHeight: '300px' }}>
        <p className="text-stone-500">Loading map...</p>
      </div>
    );
  }

  return <MapComponent center={center} markers={markers} zoom={zoom} className={className} />;
}
