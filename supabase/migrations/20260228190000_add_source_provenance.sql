-- =============================================================================
-- Add source provenance tracking to trawl_jobs and bar_whiskeys
-- Tracks BOTH when we found data AND when the source was originally created
-- =============================================================================

-- Add source date tracking to trawl_jobs
ALTER TABLE trawl_jobs ADD COLUMN IF NOT EXISTS source_date timestamptz;
  -- When the source was created/published (e.g., Google photo upload date, menu PDF date)
  -- NULL if unknown

ALTER TABLE trawl_jobs ADD COLUMN IF NOT EXISTS scraped_at timestamptz DEFAULT now();
  -- When we actually fetched/scraped this data

ALTER TABLE trawl_jobs ADD COLUMN IF NOT EXISTS source_attribution text;
  -- Human-readable source citation
  -- e.g., "Google Maps photo by @user123, uploaded 2025-11-15"
  -- e.g., "Website menu page at scotchlodge.com/menus, fetched 2026-02-28"
  -- e.g., "User-submitted photo via /submit"

ALTER TABLE trawl_jobs ADD COLUMN IF NOT EXISTS content_hash text;
  -- SHA-256 hash of the raw content for change detection

-- Add provenance to bar_whiskeys
ALTER TABLE bar_whiskeys ADD COLUMN IF NOT EXISTS first_seen_at timestamptz DEFAULT now();
  -- When we first discovered this whiskey at this bar

ALTER TABLE bar_whiskeys ADD COLUMN IF NOT EXISTS source_type text;
  -- How we found it: 'website_scrape', 'google_photo', 'pdf_menu', 'user_submitted', 'manual'

ALTER TABLE bar_whiskeys ADD COLUMN IF NOT EXISTS source_trawl_id uuid REFERENCES trawl_jobs(id) ON DELETE SET NULL;
  -- Link to the trawl job that last confirmed this entry

ALTER TABLE bar_whiskeys ADD COLUMN IF NOT EXISTS confidence numeric(3,2) DEFAULT 0.80;
  -- Extraction confidence 0.00-1.00

ALTER TABLE bar_whiskeys ADD COLUMN IF NOT EXISTS is_stale boolean DEFAULT false;
  -- Set true when a re-crawl does NOT find this whiskey anymore

-- Index for finding stale entries
CREATE INDEX IF NOT EXISTS bar_whiskeys_stale_idx ON bar_whiskeys (is_stale) WHERE is_stale = true;

-- Index for freshness queries
CREATE INDEX IF NOT EXISTS bar_whiskeys_last_verified_idx ON bar_whiskeys (last_verified);
CREATE INDEX IF NOT EXISTS trawl_jobs_scraped_at_idx ON trawl_jobs (scraped_at);
