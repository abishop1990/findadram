/**
 * Geo helpers for the Pacific Northwest service area.
 *
 * Covers: Portland OR, Vancouver WA, Olympia WA, Tacoma WA, Seattle WA,
 *         Bellevue WA, Beaverton OR, Hillsboro OR, Gresham OR, Oregon City OR
 * Excludes: Portland ME, Vancouver BC (49.28°N — well north of our 47.75 ceiling),
 *           Salem OR, Eugene OR
 */

export const SERVICE_AREA = {
  bounds: {
    north: 47.75,    // north edge of Seattle metro / Everett area
    south: 45.35,    // south of Oregon City
    east:  -122.10,  // east of Bellevue / Issaquah
    west:  -122.90,  // west of Hillsboro / Tacoma
  },
} as const;

/** Named regions within the service area, ordered south → north. */
export const REGIONS = [
  { id: 'portland',      name: 'Portland, OR',   center: { lat: 45.5152, lng: -122.6784 }, radiusMeters: 40_000 },
  { id: 'vancouver-wa',  name: 'Vancouver, WA',  center: { lat: 45.6387, lng: -122.6615 }, radiusMeters: 15_000 },
  { id: 'seattle',       name: 'Seattle, WA',    center: { lat: 47.6062, lng: -122.3321 }, radiusMeters: 40_000 },
] as const;

export type RegionId = typeof REGIONS[number]['id'];

/**
 * Check if coordinates fall within the Pacific Northwest service area bounding box.
 * Vancouver BC is at ~49.28°N and is therefore excluded by the 47.75 north ceiling.
 */
export function isInServiceArea(lat: number, lng: number): boolean {
  const { north, south, east, west } = SERVICE_AREA.bounds;
  return lat >= south && lat <= north && lng >= west && lng <= east;
}

/** Backwards-compatible alias — prefer isInServiceArea() in new code. */
export const isInPortlandMetro = isInServiceArea;

/**
 * Backwards-compatible constant alias.
 * @deprecated Use SERVICE_AREA instead.
 */
export const PORTLAND_METRO = {
  center: REGIONS[0].center,
  bounds: SERVICE_AREA.bounds,
  radiusMeters: REGIONS[0].radiusMeters,
} as const;

/**
 * Return the region whose center is closest to the given coordinates.
 * Falls back to the first region if no valid region is found.
 */
export function getClosestRegion(lat: number, lng: number): typeof REGIONS[number] {
  let closest: typeof REGIONS[number] = REGIONS[0];
  let minDist = distanceMeters(lat, lng, closest.center.lat, closest.center.lng);

  for (let i = 1; i < REGIONS.length; i++) {
    const region = REGIONS[i];
    const dist = distanceMeters(lat, lng, region.center.lat, region.center.lng);
    if (dist < minDist) {
      minDist = dist;
      closest = region;
    }
  }

  return closest;
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
