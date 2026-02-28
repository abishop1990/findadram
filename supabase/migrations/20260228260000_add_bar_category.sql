-- Add venue_category enum and category column to bars
-- Enables filtering bars by type (restaurant, cocktail bar, pub, etc.)

-- Create enum for venue categories
CREATE TYPE venue_category AS ENUM (
  'whiskey_bar',
  'cocktail_bar',
  'restaurant',
  'pub',
  'hotel_bar',
  'distillery',
  'brewery',
  'wine_bar',
  'lounge',
  'other'
);

-- Add category column with default 'other'
ALTER TABLE bars ADD COLUMN category venue_category DEFAULT 'other';

-- Backfill from metadata where possible
UPDATE bars SET category = 'whiskey_bar'
WHERE metadata->>'discovered_via' = 'google_places_search'
  AND (name ILIKE '%whiskey%' OR name ILIKE '%whisky%' OR name ILIKE '%bourbon%' OR name ILIKE '%scotch%');

UPDATE bars SET category = 'cocktail_bar'
WHERE category = 'other'
  AND (name ILIKE '%cocktail%' OR name ILIKE '%lounge%' OR name ILIKE '%speakeasy%');

UPDATE bars SET category = 'distillery'
WHERE category = 'other'
  AND (name ILIKE '%distill%' OR name ILIKE '%tasting room%');

UPDATE bars SET category = 'pub'
WHERE category = 'other'
  AND (name ILIKE '%pub%' OR name ILIKE '%tavern%' OR name ILIKE '%alehouse%');

UPDATE bars SET category = 'brewery'
WHERE category = 'other'
  AND (name ILIKE '%brew%');

UPDATE bars SET category = 'restaurant'
WHERE category = 'other'
  AND (name ILIKE '%kitchen%' OR name ILIKE '%grill%' OR name ILIKE '%steakhouse%');

UPDATE bars SET category = 'hotel_bar'
WHERE category = 'other'
  AND (name ILIKE '%hotel%' OR name ILIKE '%inn %');

-- Index for category filtering
CREATE INDEX idx_bars_category ON bars (category);

-- Update search_bars RPC to include category
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
  category venue_category,
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
    b.category,
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
