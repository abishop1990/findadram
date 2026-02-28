export interface Coordinates {
  lat: number;
  lng: number;
}

export interface BoundingBox {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface GeocodingResult {
  display_name: string;
  lat: number;
  lng: number;
  address?: {
    city?: string;
    state?: string;
    country?: string;
  };
}
