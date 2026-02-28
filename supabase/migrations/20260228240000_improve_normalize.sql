-- =============================================================================
-- Improve normalize_whiskey_name() to match the TypeScript normalizer
-- in src/lib/trawler/normalize.ts
-- =============================================================================

-- Replace the function with the expanded version.
-- The function must be IMMUTABLE because it backs a GENERATED ALWAYS column.
CREATE OR REPLACE FUNCTION normalize_whiskey_name(name text)
RETURNS text AS $$
DECLARE
  s text;
BEGIN
  s := name;

  -- 1. Normalize unicode punctuation
  -- Em dash / en dash → space-hyphen-space
  s := regexp_replace(s, E'[\u2014\u2013]', ' - ', 'g');
  -- Fancy single quotes / apostrophes → straight apostrophe
  s := regexp_replace(s, E'[\u2018\u2019\u201a\u201b\u2032\u2035`]', '''', 'g');
  -- Fancy double quotes → straight double quote
  s := regexp_replace(s, E'[\u201c\u201d\u201e\u201f\u2033\u2036]', '"', 'g');
  -- Strip trademark / registered / copyright symbols
  s := regexp_replace(s, E'[\u2122\u00ae\u00a9]', '', 'g');
  -- Multiple hyphens → single hyphen
  s := regexp_replace(s, '-{2,}', '-', 'g');
  -- Collapse whitespace
  s := regexp_replace(s, '\s+', ' ', 'g');

  -- 2. Lowercase
  s := lower(trim(s));

  -- 3. Strip leading "the "
  s := regexp_replace(s, '^the\s+', '', 'i');

  -- 4. Strip ABV / proof annotations
  -- "100 proof" / "86.4 proof"
  s := regexp_replace(s, '\m\d+(?:\.\d+)?\s*proof\M', '', 'gi');
  -- "46%", "46.0% ABV", "46% abv"
  s := regexp_replace(s, '\m\d+(?:\.\d+)?\s*%(?:\s*abv)?\M', '', 'gi');
  -- "ABV 46%"
  s := regexp_replace(s, '\mabv\s+\d+(?:\.\d+)?\s*%?\M', '', 'gi');

  -- 5. Strip legal category descriptions (longest first to avoid partial matches)
  s := regexp_replace(s, '\mkentucky\s+straight\s+bourbon\s+whiske?y\M', '', 'gi');
  s := regexp_replace(s, '\mstraight\s+bourbon\s+whiske?y\M', '', 'gi');
  s := regexp_replace(s, '\mblended\s+(?:scotch\s+)?whiske?y\M', '', 'gi');
  s := regexp_replace(s, '\msingle\s+malt\s+scotch\s+whiske?y\M', '', 'gi');
  s := regexp_replace(s, '\mirish\s+whiske?y\M', '', 'gi');
  s := regexp_replace(s, '\mamerican\s+whiske?y\M', '', 'gi');
  s := regexp_replace(s, '\mtennessee\s+whiske?y\M', '', 'gi');
  s := regexp_replace(s, '\mjapanese\s+whiske?y\M', '', 'gi');
  s := regexp_replace(s, '\mcanadian\s+whiske?y\M', '', 'gi');
  s := regexp_replace(s, '\mscotch\s+whiske?y\M', '', 'gi');
  -- Standalone trailing "whiskey/whisky"
  s := regexp_replace(s, '\mwhiske?y\s*$', '', 'gi');
  -- Trailing "distillery"
  s := regexp_replace(s, '\mdistillery\s*$', '', 'gi');

  -- 6. Normalize age statements
  -- "Aged N Years/Year/Yr" → "N year"
  s := regexp_replace(s, '\maged\s+(\d+)\s*(?:years?|yrs?|yo)\M', '\1 year', 'gi');
  -- "N Year Old", "N YO", "N yr(s)", "N-year-old" → "N year"
  s := regexp_replace(s, '\m(\d+)[-\s]?(?:years?[-\s]?old|years?|yrs?|yo)\M', '\1 year', 'gi');

  -- 7. Strip remaining quote characters (straight quotes and apostrophes)
  s := regexp_replace(s, '[''"]', '', 'g');

  -- 8. Collapse whitespace, strip trailing dashes/spaces, trim
  s := regexp_replace(s, '[-\s]+$', '', 'g');
  s := regexp_replace(s, '\s+', ' ', 'g');
  s := trim(s);

  RETURN s;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Force recomputation of the generated column by dropping and re-adding it
-- with the updated function.
ALTER TABLE whiskeys DROP COLUMN normalized_name;
ALTER TABLE whiskeys ADD COLUMN normalized_name text GENERATED ALWAYS AS (normalize_whiskey_name(name)) STORED;

-- Recreate the dedup index on the new column
DROP INDEX IF EXISTS whiskeys_dedup_idx;
CREATE UNIQUE INDEX whiskeys_dedup_idx ON whiskeys (normalized_name, coalesce(distillery, ''));
