-- =============================================================================
-- Tighten RLS policies
-- Public users can read but NOT write bars, whiskeys, or trawl_jobs.
-- Only service_role (server-side API routes) can mutate these tables.
-- User-engagement tables (sightings, confirmations) use session_id ownership.
-- =============================================================================

-- Drop overly permissive write policies on core data tables
DROP POLICY IF EXISTS "Authenticated insert bars" ON bars;
DROP POLICY IF EXISTS "Authenticated update bars" ON bars;
DROP POLICY IF EXISTS "Authenticated insert whiskeys" ON whiskeys;
DROP POLICY IF EXISTS "Authenticated update whiskeys" ON whiskeys;
DROP POLICY IF EXISTS "Authenticated insert bar_whiskeys" ON bar_whiskeys;
DROP POLICY IF EXISTS "Authenticated update bar_whiskeys" ON bar_whiskeys;
DROP POLICY IF EXISTS "Authenticated insert trawl_jobs" ON trawl_jobs;
DROP POLICY IF EXISTS "Authenticated update trawl_jobs" ON trawl_jobs;

-- Service-role-only write policies for core tables
-- (service_role bypasses RLS, so these are belt-and-suspenders for
-- any future role that isn't service_role)
CREATE POLICY "Service role insert bars" ON bars FOR INSERT
  WITH CHECK (current_setting('request.jwt.claim.role', true) = 'service_role');
CREATE POLICY "Service role update bars" ON bars FOR UPDATE
  USING (current_setting('request.jwt.claim.role', true) = 'service_role');

CREATE POLICY "Service role insert whiskeys" ON whiskeys FOR INSERT
  WITH CHECK (current_setting('request.jwt.claim.role', true) = 'service_role');
CREATE POLICY "Service role update whiskeys" ON whiskeys FOR UPDATE
  USING (current_setting('request.jwt.claim.role', true) = 'service_role');

CREATE POLICY "Service role insert bar_whiskeys" ON bar_whiskeys FOR INSERT
  WITH CHECK (current_setting('request.jwt.claim.role', true) = 'service_role');
CREATE POLICY "Service role update bar_whiskeys" ON bar_whiskeys FOR UPDATE
  USING (current_setting('request.jwt.claim.role', true) = 'service_role');

CREATE POLICY "Service role insert trawl_jobs" ON trawl_jobs FOR INSERT
  WITH CHECK (current_setting('request.jwt.claim.role', true) = 'service_role');
CREATE POLICY "Service role update trawl_jobs" ON trawl_jobs FOR UPDATE
  USING (current_setting('request.jwt.claim.role', true) = 'service_role');
