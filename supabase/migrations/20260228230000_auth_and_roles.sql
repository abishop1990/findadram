-- =============================================================================
-- Auth & Roles migration
-- Adds Supabase Auth linkage to user_profiles, a role column for bar_owner /
-- admin support, and a bar_claims table for ownership requests.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Extend user_profiles with auth linkage and role
-- ---------------------------------------------------------------------------

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS auth_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'user'
    CHECK (role IN ('user', 'bar_owner', 'admin'));

-- Unique partial index: one profile per auth user (NULLs are excluded)
CREATE UNIQUE INDEX IF NOT EXISTS user_profiles_auth_user_id_uniq
  ON user_profiles (auth_user_id)
  WHERE auth_user_id IS NOT NULL;

-- Index to speed up auth-user lookups
CREATE INDEX IF NOT EXISTS user_profiles_auth_user_id_idx
  ON user_profiles (auth_user_id);

-- ---------------------------------------------------------------------------
-- 2. bar_claims table
-- Bar owners can request ownership of a bar; admins approve/reject.
-- ---------------------------------------------------------------------------

CREATE TYPE claim_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE bar_claims (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bar_id        uuid NOT NULL REFERENCES bars(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  status        claim_status NOT NULL DEFAULT 'pending',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  -- Only one active claim per (bar, user) pair
  CONSTRAINT bar_claims_bar_user_uniq UNIQUE (bar_id, user_id)
);

CREATE INDEX bar_claims_bar_id_idx    ON bar_claims (bar_id);
CREATE INDEX bar_claims_user_id_idx   ON bar_claims (user_id);
CREATE INDEX bar_claims_status_idx    ON bar_claims (status);

CREATE TRIGGER bar_claims_updated_at BEFORE UPDATE ON bar_claims
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

-- ---------------------------------------------------------------------------
-- 3. RLS for bar_claims
-- ---------------------------------------------------------------------------

ALTER TABLE bar_claims ENABLE ROW LEVEL SECURITY;

-- Anyone can read claims (needed so bar detail pages can show "claimed" badge)
CREATE POLICY "Public read bar_claims" ON bar_claims
  FOR SELECT USING (true);

-- Authenticated users can insert their own claim
CREATE POLICY "Owner insert bar_claims" ON bar_claims
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND user_id = (
      SELECT id FROM user_profiles WHERE auth_user_id = auth.uid() LIMIT 1
    )
  );

-- Claim owner can delete (withdraw) their own pending claim
CREATE POLICY "Owner delete own bar_claims" ON bar_claims
  FOR DELETE USING (
    user_id = (
      SELECT id FROM user_profiles WHERE auth_user_id = auth.uid() LIMIT 1
    )
    AND status = 'pending'
  );

-- Admins can update claim status (approve / reject)
CREATE POLICY "Admin update bar_claims" ON bar_claims
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE auth_user_id = auth.uid() AND role = 'admin'
    )
  );

-- ---------------------------------------------------------------------------
-- 4. bar_whiskeys: bar_owner update policy
-- Approved bar owners may update price and availability for their bar's rows.
-- ---------------------------------------------------------------------------

-- Drop the restrictive service-role-only update policy so we can replace it
-- with a combined policy that also allows bar owners.
DROP POLICY IF EXISTS "Service role update bar_whiskeys" ON bar_whiskeys;

CREATE POLICY "Service role update bar_whiskeys" ON bar_whiskeys
  FOR UPDATE USING (
    current_setting('request.jwt.claim.role', true) = 'service_role'
  );

CREATE POLICY "Bar owner update bar_whiskeys" ON bar_whiskeys
  FOR UPDATE USING (
    -- The requesting auth user must be a bar_owner
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE auth_user_id = auth.uid() AND role IN ('bar_owner', 'admin')
    )
    -- And must have an approved claim for this specific bar
    AND EXISTS (
      SELECT 1 FROM bar_claims bc
      JOIN user_profiles up ON up.id = bc.user_id
      WHERE bc.bar_id = bar_whiskeys.bar_id
        AND bc.status = 'approved'
        AND up.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE auth_user_id = auth.uid() AND role IN ('bar_owner', 'admin')
    )
    AND EXISTS (
      SELECT 1 FROM bar_claims bc
      JOIN user_profiles up ON up.id = bc.user_id
      WHERE bc.bar_id = bar_whiskeys.bar_id
        AND bc.status = 'approved'
        AND up.auth_user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- 5. user_profiles: tighten update so auth users can only update their own row
-- ---------------------------------------------------------------------------

-- The existing "Public update user_profiles" policy is too broad once we have
-- real auth. Replace it with a version that allows:
--   a) anonymous session-based updates (existing behaviour, no auth.uid())
--   b) authenticated users updating their own profile
DROP POLICY IF EXISTS "Public update user_profiles" ON user_profiles;

CREATE POLICY "Update own user_profile" ON user_profiles
  FOR UPDATE USING (
    -- Authenticated: only own row
    (auth.uid() IS NOT NULL AND auth_user_id = auth.uid())
    -- Anonymous: session-based (legacy behaviour preserved)
    OR auth.uid() IS NULL
  );

-- Authenticated users can also insert a profile for themselves
-- (in addition to the existing anonymous "Public insert user_profiles")
CREATE POLICY "Auth user insert user_profile" ON user_profiles
  FOR INSERT WITH CHECK (
    auth.uid() IS NULL          -- anonymous insert (existing behaviour)
    OR auth_user_id = auth.uid() -- or linking own auth account
  );

-- Drop the old unconstrained insert policy and replace with the combined one
DROP POLICY IF EXISTS "Public insert user_profiles" ON user_profiles;

-- Re-create as the combined policy above already covers both cases.
-- (No-op comment; the CREATE above handles it.)
