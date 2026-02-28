export type WhiskeyType = 'bourbon' | 'scotch' | 'irish' | 'rye' | 'japanese' | 'canadian' | 'single_malt' | 'blended' | 'other';
export type TrawlStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type VenueCategory = 'whiskey_bar' | 'cocktail_bar' | 'restaurant' | 'pub' | 'hotel_bar' | 'distillery' | 'brewery' | 'wine_bar' | 'lounge' | 'other';

export interface Bar {
  id: string;
  name: string;
  location: string; // PostGIS geography point (WKB hex)
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  phone: string | null;
  website: string | null;
  google_place_id: string | null;
  category: VenueCategory;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Whiskey {
  id: string;
  name: string;
  normalized_name: string;
  distillery: string | null;
  region: string | null;
  country: string | null;
  type: WhiskeyType;
  age: number | null;
  abv: number | null;
  description: string | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface BarWhiskey {
  id: string;
  bar_id: string;
  whiskey_id: string;
  price: number | null;
  pour_size: string | null;
  available: boolean;
  last_verified: string;
  notes: string | null;
  first_seen_at: string;
  source_type: string | null;
  source_trawl_id: string | null;
  confidence: number;
  is_stale: boolean;
  created_at: string;
  updated_at: string;
}

export interface TrawlJob {
  id: string;
  bar_id: string | null;
  source_url: string | null;
  source_type: string;
  status: TrawlStatus;
  result: Record<string, unknown> | null;
  error: string | null;
  whiskey_count: number;
  submitted_by: string | null;
  source_date: string | null;
  scraped_at: string;
  source_attribution: string | null;
  content_hash: string | null;
  created_at: string;
  updated_at: string;
}

export type ConfirmationStatus = 'confirmed' | 'not_found';
export type PourSize = '1oz' | '1.5oz' | '2oz' | '25ml' | '35ml' | '50ml' | 'dram' | 'flight' | 'bottle' | 'other';

export interface UserProfile {
  id: string;
  session_id: string;
  display_name: string | null;
  avatar_url: string | null;
  favorite_type: string | null;
  sighting_count: number;
  confirmation_count: number;
  created_at: string;
  updated_at: string;
}

export interface Sighting {
  id: string;
  session_id: string;
  bar_id: string;
  whiskey_id: string;
  price: number | null;
  pour_size: PourSize | null;
  rating: number | null;
  notes: string | null;
  created_at: string;
}

export interface Confirmation {
  id: string;
  session_id: string;
  bar_whiskey_id: string;
  status: ConfirmationStatus;
  notes: string | null;
  created_at: string;
}

export interface BarActivity {
  activity_type: 'sighting' | 'confirmation';
  whiskey_name: string;
  whiskey_id: string;
  display_name: string;
  price: number | null;
  pour_size: string | null;
  rating: number | null;
  notes: string | null;
  status: string | null;
  created_at: string;
}

export type ClaimStatus = 'pending' | 'approved' | 'rejected';

export interface BarClaim {
  id: string;
  bar_id: string;
  user_id: string;
  status: ClaimStatus;
  created_at: string;
  updated_at: string;
}

export type BarClaimInsert = {
  bar_id: string;
  user_id: string;
  status?: ClaimStatus;
};

export type BarInsert = Omit<Bar, 'id' | 'created_at' | 'updated_at' | 'metadata' | 'category'> & {
  id?: string;
  category?: VenueCategory;
  metadata?: Record<string, unknown>;
};

export type WhiskeyInsert = Omit<Whiskey, 'id' | 'normalized_name' | 'created_at' | 'updated_at'> & {
  id?: string;
};

export type BarWhiskeyInsert = Omit<BarWhiskey, 'id' | 'created_at' | 'updated_at' | 'last_verified' | 'first_seen_at' | 'confidence' | 'is_stale'> & {
  id?: string;
  last_verified?: string;
  first_seen_at?: string;
  confidence?: number;
  is_stale?: boolean;
};

export interface BarSearchResult {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  category: VenueCategory | null;
  latitude: number;
  longitude: number;
  distance_meters: number | null;
  whiskey_count: number;
}

export interface WhiskeySearchResult {
  id: string;
  name: string;
  distillery: string | null;
  type: string;
  age: number | null;
  abv: number | null;
  bar_count: number;
  nearest_bar_name: string | null;
  nearest_bar_distance: number | null;
}

export interface Database {
  public: {
    Tables: {
      bars: {
        Row: Bar;
        Insert: BarInsert;
        Update: Partial<BarInsert>;
        Relationships: [];
      };
      whiskeys: {
        Row: Whiskey;
        Insert: WhiskeyInsert;
        Update: Partial<WhiskeyInsert>;
        Relationships: [];
      };
      bar_whiskeys: {
        Row: BarWhiskey;
        Insert: BarWhiskeyInsert;
        Update: Partial<BarWhiskeyInsert>;
        Relationships: [];
      };
      trawl_jobs: {
        Row: TrawlJob;
        Insert: Omit<TrawlJob, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<TrawlJob, 'id' | 'created_at' | 'updated_at'>>;
        Relationships: [];
      };
      sightings: {
        Row: Sighting;
        Insert: Omit<Sighting, 'id' | 'created_at'> & { id?: string };
        Update: Partial<Omit<Sighting, 'id' | 'created_at'>>;
        Relationships: [];
      };
      confirmations: {
        Row: Confirmation;
        Insert: Omit<Confirmation, 'id' | 'created_at'> & { id?: string };
        Update: Partial<Omit<Confirmation, 'id' | 'created_at'>>;
        Relationships: [];
      };
      user_profiles: {
        Row: UserProfile;
        Insert: Omit<UserProfile, 'id' | 'created_at' | 'updated_at' | 'sighting_count' | 'confirmation_count'> & { id?: string; sighting_count?: number; confirmation_count?: number };
        Update: Partial<Omit<UserProfile, 'id' | 'created_at' | 'updated_at'>>;
        Relationships: [];
      };
      bar_claims: {
        Row: BarClaim;
        Insert: BarClaimInsert;
        Update: Partial<BarClaimInsert>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      search_bars: {
        Args: { query: string; lat: number | null; lng: number | null; radius_meters: number; result_limit: number };
        Returns: BarSearchResult[];
      };
      search_whiskeys: {
        Args: { query: string; lat: number | null; lng: number | null; radius_meters: number; result_limit: number };
        Returns: WhiskeySearchResult[];
      };
      nearby_bars: {
        Args: { lat: number; lng: number; radius_meters: number };
        Returns: BarSearchResult[];
      };
    };
    Enums: {
      whiskey_type: WhiskeyType;
      trawl_status: TrawlStatus;
      claim_status: ClaimStatus;
      venue_category: VenueCategory;
    };
    CompositeTypes: Record<string, never>;
  };
}
