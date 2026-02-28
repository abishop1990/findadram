/**
 * Liquor store search — barrel export + shared types.
 *
 * Designed for extensibility: add new state providers by implementing
 * the LiquorSearchProvider type and registering them in searchLiquorStores.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

/** A single result row returned by any state liquor-search provider. */
export interface LiquorStoreResult {
  /** Human-readable store name (e.g. "Portland Liquor Store #1185") */
  storeName: string;
  /** Street address line */
  storeAddress: string;
  /** City name */
  city: string;
  /** Two-letter state abbreviation */
  state: string;
  /** ZIP / postal code */
  zipCode: string;
  /** Retail bottle price in USD */
  price: number | null;
  /** Bottle size label as reported by the state (e.g. "750 ML", "1.75 L", "LITER") */
  bottleSize: string;
  /** Whether the product was in stock at time of query (based on qty > 0) */
  inStock: boolean;
  /** Straight-line distance in meters from the search location, if available */
  distanceMeters?: number;
  /** On-hand quantity as reported by the state (updated daily by OLCC) */
  quantity?: number;
  /** Store phone number, if available */
  phone?: string;
  /** Store hours string, if available */
  storeHours?: string;
  /** Product name (e.g. "BUFFALO TRACE BOURBON") — present for catalog-level results */
  productName?: string;
  /** Liquor category (e.g. "DOMESTIC WHISKEY|STRAIGHT|SMALL BATCH") */
  category?: string;
  /** Proof value (e.g. 90.0) */
  proof?: number;
  /** OLCC item code */
  itemCode?: string;
}

/**
 * Supported state liquor-search providers.
 * Extend this union as new states are added.
 */
export type LiquorSearchProvider = 'OR' | 'WA';

/** Options accepted by the top-level searchLiquorStores function. */
export interface LiquorSearchOptions {
  /** Two-letter state abbreviation — defaults to 'OR' */
  state?: LiquorSearchProvider;
  /** ZIP code to center the search around */
  zipCode?: string;
  /** Latitude for geo-based search (future use) */
  lat?: number;
  /** Longitude for geo-based search (future use) */
  lng?: number;
}

// ─── Provider implementations ─────────────────────────────────────────────────

export { searchOregonLiquor } from './oregon';

// ─── Router ───────────────────────────────────────────────────────────────────

/**
 * Search for a spirit across all liquor stores for the given state provider.
 *
 * @param query  - Product name, brand, or category (e.g. "Buffalo Trace")
 * @param options - Provider selection and location context
 * @returns      Sorted list of stores carrying matching products
 */
export async function searchLiquorStores(
  query: string,
  options: LiquorSearchOptions = {},
): Promise<LiquorStoreResult[]> {
  // lat/lng are reserved for future provider implementations (e.g. WSLCB geo-search)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { state = 'OR', zipCode, lat: _lat, lng: _lng } = options;

  switch (state) {
    case 'OR': {
      const { searchOregonLiquor } = await import('./oregon');
      return searchOregonLiquor(query, zipCode);
    }

    case 'WA': {
      // Washington State Liquor and Cannabis Board (WSLCB) — not yet implemented.
      // WSLCB product search: https://www.liq.wa.gov/stores/store-search
      throw new Error(
        'Washington state liquor search is not yet implemented. Coming soon.',
      );
    }

    default: {
      const exhaustive: never = state;
      throw new Error(`Unknown liquor search provider: ${exhaustive}`);
    }
  }
}
