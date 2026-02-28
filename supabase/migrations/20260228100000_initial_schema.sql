-- Enable extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS moddatetime;

-- Normalize whiskey name function
CREATE OR REPLACE FUNCTION normalize_whiskey_name(name text)
RETURNS text AS $$
BEGIN
  RETURN regexp_replace(
    regexp_replace(
      regexp_replace(
        regexp_replace(
          lower(trim(name)),
          '\s+', ' ', 'g'
        ),
        '^the\s+', '', 'i'
      ),
      '\b(\d+)\s*(yr|yo|year)s?\b', '\1 year', 'gi'
    ),
    '[''"]', '', 'g'
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Enums
CREATE TYPE whiskey_type AS ENUM (
  'bourbon', 'scotch', 'irish', 'rye', 'japanese', 'canadian', 'single_malt', 'blended', 'other'
);

CREATE TYPE trawl_status AS ENUM (
  'pending', 'processing', 'completed', 'failed'
);

-- Bars table
CREATE TABLE bars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  location geography(Point, 4326) NOT NULL,
  address text,
  city text,
  state text,
  country text DEFAULT 'US',
  phone text,
  website text,
  google_place_id text UNIQUE,
  metadata jsonb DEFAULT '{}',
  search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(name, '') || ' ' || coalesce(city, '') || ' ' || coalesce(address, ''))
  ) STORED,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Whiskeys table
CREATE TABLE whiskeys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  normalized_name text GENERATED ALWAYS AS (normalize_whiskey_name(name)) STORED,
  distillery text,
  region text,
  country text,
  type whiskey_type DEFAULT 'other',
  age integer,
  abv numeric(5,2),
  description text,
  image_url text,
  search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(name, '') || ' ' || coalesce(distillery, '') || ' ' || coalesce(region, ''))
  ) STORED,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Bar-whiskeys join table
CREATE TABLE bar_whiskeys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bar_id uuid NOT NULL REFERENCES bars(id) ON DELETE CASCADE,
  whiskey_id uuid NOT NULL REFERENCES whiskeys(id) ON DELETE CASCADE,
  price numeric(8,2),
  pour_size text,
  available boolean DEFAULT true,
  last_verified timestamptz DEFAULT now(),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(bar_id, whiskey_id)
);

-- Trawl jobs table
CREATE TABLE trawl_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bar_id uuid REFERENCES bars(id) ON DELETE SET NULL,
  source_url text,
  source_type text DEFAULT 'url',
  status trawl_status DEFAULT 'pending',
  result jsonb,
  error text,
  whiskey_count integer DEFAULT 0,
  submitted_by text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX bars_location_idx ON bars USING GIST (location);
CREATE INDEX bars_search_vector_idx ON bars USING GIN (search_vector);
CREATE INDEX bars_name_trgm_idx ON bars USING GIN (name gin_trgm_ops);

CREATE INDEX whiskeys_search_vector_idx ON whiskeys USING GIN (search_vector);
CREATE INDEX whiskeys_name_trgm_idx ON whiskeys USING GIN (name gin_trgm_ops);
CREATE UNIQUE INDEX whiskeys_dedup_idx ON whiskeys (normalized_name, coalesce(distillery, ''));

CREATE INDEX bar_whiskeys_bar_id_idx ON bar_whiskeys (bar_id);
CREATE INDEX bar_whiskeys_whiskey_id_idx ON bar_whiskeys (whiskey_id);

CREATE INDEX trawl_jobs_status_idx ON trawl_jobs (status);
CREATE INDEX trawl_jobs_bar_id_idx ON trawl_jobs (bar_id);

-- Updated_at triggers
CREATE TRIGGER bars_updated_at BEFORE UPDATE ON bars
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

CREATE TRIGGER whiskeys_updated_at BEFORE UPDATE ON whiskeys
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

CREATE TRIGGER bar_whiskeys_updated_at BEFORE UPDATE ON bar_whiskeys
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

CREATE TRIGGER trawl_jobs_updated_at BEFORE UPDATE ON trawl_jobs
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

-- RLS
ALTER TABLE bars ENABLE ROW LEVEL SECURITY;
ALTER TABLE whiskeys ENABLE ROW LEVEL SECURITY;
ALTER TABLE bar_whiskeys ENABLE ROW LEVEL SECURITY;
ALTER TABLE trawl_jobs ENABLE ROW LEVEL SECURITY;

-- Public read policies
CREATE POLICY "Public read bars" ON bars FOR SELECT USING (true);
CREATE POLICY "Public read whiskeys" ON whiskeys FOR SELECT USING (true);
CREATE POLICY "Public read bar_whiskeys" ON bar_whiskeys FOR SELECT USING (true);
CREATE POLICY "Public read trawl_jobs" ON trawl_jobs FOR SELECT USING (true);

-- Authenticated write policies
CREATE POLICY "Authenticated insert bars" ON bars FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated update bars" ON bars FOR UPDATE USING (true);
CREATE POLICY "Authenticated insert whiskeys" ON whiskeys FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated update whiskeys" ON whiskeys FOR UPDATE USING (true);
CREATE POLICY "Authenticated insert bar_whiskeys" ON bar_whiskeys FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated update bar_whiskeys" ON bar_whiskeys FOR UPDATE USING (true);
CREATE POLICY "Authenticated insert trawl_jobs" ON trawl_jobs FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated update trawl_jobs" ON trawl_jobs FOR UPDATE USING (true);

-- RPC: Search bars by text + location
CREATE OR REPLACE FUNCTION search_bars(
  query text DEFAULT '',
  lat double precision DEFAULT NULL,
  lng double precision DEFAULT NULL,
  radius_meters integer DEFAULT 50000,
  result_limit integer DEFAULT 20
)
RETURNS TABLE (
  id uuid,
  name text,
  address text,
  city text,
  state text,
  latitude double precision,
  longitude double precision,
  distance_meters double precision,
  whiskey_count bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.id,
    b.name,
    b.address,
    b.city,
    b.state,
    ST_Y(b.location::geometry) as latitude,
    ST_X(b.location::geometry) as longitude,
    CASE
      WHEN lat IS NOT NULL AND lng IS NOT NULL
      THEN ST_Distance(b.location, ST_MakePoint(lng, lat)::geography)
      ELSE NULL
    END as distance_meters,
    (SELECT count(*) FROM bar_whiskeys bw WHERE bw.bar_id = b.id AND bw.available = true) as whiskey_count
  FROM bars b
  WHERE
    (query = '' OR b.search_vector @@ plainto_tsquery('english', query) OR b.name ILIKE '%' || query || '%')
    AND (lat IS NULL OR lng IS NULL OR ST_DWithin(b.location, ST_MakePoint(lng, lat)::geography, radius_meters))
  ORDER BY
    CASE WHEN lat IS NOT NULL AND lng IS NOT NULL
      THEN ST_Distance(b.location, ST_MakePoint(lng, lat)::geography)
      ELSE 0
    END ASC
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- RPC: Search whiskeys by text + location
CREATE OR REPLACE FUNCTION search_whiskeys(
  query text DEFAULT '',
  lat double precision DEFAULT NULL,
  lng double precision DEFAULT NULL,
  radius_meters integer DEFAULT 50000,
  result_limit integer DEFAULT 20
)
RETURNS TABLE (
  id uuid,
  name text,
  distillery text,
  type whiskey_type,
  age integer,
  abv numeric,
  bar_count bigint,
  nearest_bar_name text,
  nearest_bar_distance double precision
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    w.id,
    w.name,
    w.distillery,
    w.type,
    w.age,
    w.abv,
    (SELECT count(DISTINCT bw.bar_id) FROM bar_whiskeys bw WHERE bw.whiskey_id = w.id AND bw.available = true) as bar_count,
    nearest.bar_name as nearest_bar_name,
    nearest.dist as nearest_bar_distance
  FROM whiskeys w
  LEFT JOIN LATERAL (
    SELECT b.name as bar_name, ST_Distance(b.location, ST_MakePoint(lng, lat)::geography) as dist
    FROM bar_whiskeys bw
    JOIN bars b ON b.id = bw.bar_id
    WHERE bw.whiskey_id = w.id AND bw.available = true
      AND (lat IS NULL OR lng IS NULL OR ST_DWithin(b.location, ST_MakePoint(lng, lat)::geography, radius_meters))
    ORDER BY dist ASC
    LIMIT 1
  ) nearest ON true
  WHERE
    (query = '' OR w.search_vector @@ plainto_tsquery('english', query) OR w.name ILIKE '%' || query || '%')
    AND (lat IS NULL OR lng IS NULL OR EXISTS (
      SELECT 1 FROM bar_whiskeys bw
      JOIN bars b ON b.id = bw.bar_id
      WHERE bw.whiskey_id = w.id AND bw.available = true
        AND ST_DWithin(b.location, ST_MakePoint(lng, lat)::geography, radius_meters)
    ))
  ORDER BY
    CASE WHEN nearest.dist IS NOT NULL THEN nearest.dist ELSE 999999999 END ASC
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- RPC: Nearby bars
CREATE OR REPLACE FUNCTION nearby_bars(
  lat double precision,
  lng double precision,
  radius_meters integer DEFAULT 10000
)
RETURNS TABLE (
  id uuid,
  name text,
  address text,
  city text,
  state text,
  latitude double precision,
  longitude double precision,
  distance_meters double precision,
  whiskey_count bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.id,
    b.name,
    b.address,
    b.city,
    b.state,
    ST_Y(b.location::geometry) as latitude,
    ST_X(b.location::geometry) as longitude,
    ST_Distance(b.location, ST_MakePoint(lng, lat)::geography) as distance_meters,
    (SELECT count(*) FROM bar_whiskeys bw WHERE bw.bar_id = b.id AND bw.available = true) as whiskey_count
  FROM bars b
  WHERE ST_DWithin(b.location, ST_MakePoint(lng, lat)::geography, radius_meters)
  ORDER BY distance_meters ASC;
END;
$$ LANGUAGE plpgsql STABLE;
