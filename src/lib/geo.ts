/**
 * Geo helpers for the Portland metro area.
 *
 * Covers: Portland OR, Vancouver WA, Beaverton, Tigard, Lake Oswego,
 *         Milwaukie, Gresham, Hillsboro, Oregon City, Happy Valley
 * Excludes: Portland ME, Vancouver BC, Salem, Eugene
 */

export const PORTLAND_METRO = {
  center: { lat: 45.5152, lng: -122.6784 },
  bounds: {
    north: 45.70,   // north edge of Vancouver WA
    south: 45.35,   // south of Oregon City
    east: -122.40,  // east of Gresham
    west: -122.90,  // west of Hillsboro
  },
  radiusMeters: 40_000, // ~25 miles from downtown
} as const;

/** Check if coordinates fall within the Portland metro bounding box. */
export function isInPortlandMetro(lat: number, lng: number): boolean {
  const { north, south, east, west } = PORTLAND_METRO.bounds;
  return lat >= south && lat <= north && lng >= west && lng <= east;
}

/** Haversine distance between two points in meters. */
export function distanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6_371_000; // Earth radius in meters
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/** Format distance for display: "0.3 mi", "2.1 mi", etc. */
export function formatDistance(meters: number): string {
  const miles = meters / 1609.34;
  if (miles < 0.1) return `${Math.round(meters)} ft`;
  return `${miles.toFixed(1)} mi`;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}
