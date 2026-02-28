-- User engagement tables: sightings, confirmations, user profiles

-- Simple user profiles (no auth required - session-based)
CREATE TABLE user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text UNIQUE NOT NULL,
  display_name text,
  avatar_url text,
  favorite_type text,
  sighting_count integer DEFAULT 0,
  confirmation_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Sightings: user reports having a specific whiskey at a specific bar
CREATE TABLE sightings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  bar_id uuid NOT NULL REFERENCES bars(id) ON DELETE CASCADE,
  whiskey_id uuid NOT NULL REFERENCES whiskeys(id) ON DELETE CASCADE,
  price numeric(8,2),
  pour_size text CHECK (pour_size IN ('1oz', '1.5oz', '2oz', '25ml', '35ml', '50ml', 'dram', 'flight', 'bottle', 'other')),
  rating integer CHECK (rating >= 1 AND rating <= 5),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Confirmations: user confirms or denies a whiskey is available at a bar
CREATE TYPE confirmation_status AS ENUM ('confirmed', 'not_found');

CREATE TABLE confirmations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  bar_whiskey_id uuid NOT NULL REFERENCES bar_whiskeys(id) ON DELETE CASCADE,
  status confirmation_status NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX sightings_bar_id_idx ON sightings (bar_id);
CREATE INDEX sightings_whiskey_id_idx ON sightings (whiskey_id);
CREATE INDEX sightings_session_id_idx ON sightings (session_id);
CREATE INDEX sightings_created_at_idx ON sightings (created_at DESC);

CREATE INDEX confirmations_bar_whiskey_id_idx ON confirmations (bar_whiskey_id);
CREATE INDEX confirmations_session_id_idx ON confirmations (session_id);
CREATE INDEX confirmations_created_at_idx ON confirmations (created_at DESC);

CREATE INDEX user_profiles_session_id_idx ON user_profiles (session_id);

-- RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sightings ENABLE ROW LEVEL SECURITY;
ALTER TABLE confirmations ENABLE ROW LEVEL SECURITY;

-- Public read on all
CREATE POLICY "Public read user_profiles" ON user_profiles FOR SELECT USING (true);
CREATE POLICY "Public read sightings" ON sightings FOR SELECT USING (true);
CREATE POLICY "Public read confirmations" ON confirmations FOR SELECT USING (true);

-- Public write (session-based, no auth)
CREATE POLICY "Public insert user_profiles" ON user_profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update user_profiles" ON user_profiles FOR UPDATE USING (true);
CREATE POLICY "Public insert sightings" ON sightings FOR INSERT WITH CHECK (true);
CREATE POLICY "Public insert confirmations" ON confirmations FOR INSERT WITH CHECK (true);

-- Updated_at trigger for user_profiles
CREATE TRIGGER user_profiles_updated_at BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

-- Function to update bar_whiskey last_verified when confirmed
CREATE OR REPLACE FUNCTION update_bar_whiskey_on_confirmation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'confirmed' THEN
    UPDATE bar_whiskeys
    SET last_verified = now(), available = true
    WHERE id = NEW.bar_whiskey_id;
  ELSIF NEW.status = 'not_found' THEN
    -- Only mark unavailable if multiple not_found reports in last 7 days
    IF (SELECT count(*) FROM confirmations
        WHERE bar_whiskey_id = NEW.bar_whiskey_id
          AND status = 'not_found'
          AND created_at > now() - interval '7 days') >= 2 THEN
      UPDATE bar_whiskeys
      SET available = false, last_verified = now()
      WHERE id = NEW.bar_whiskey_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER confirmation_updates_bar_whiskey
  AFTER INSERT ON confirmations
  FOR EACH ROW EXECUTE FUNCTION update_bar_whiskey_on_confirmation();

-- Function to auto-create bar_whiskey from sighting
CREATE OR REPLACE FUNCTION process_sighting()
RETURNS TRIGGER AS $$
BEGIN
  -- Upsert bar_whiskey link
  INSERT INTO bar_whiskeys (bar_id, whiskey_id, price, pour_size, available, source_type, confidence)
  VALUES (NEW.bar_id, NEW.whiskey_id, NEW.price, NEW.pour_size, true, 'user_sighting', 0.9)
  ON CONFLICT (bar_id, whiskey_id)
  DO UPDATE SET
    last_verified = now(),
    available = true,
    price = COALESCE(EXCLUDED.price, bar_whiskeys.price),
    pour_size = COALESCE(EXCLUDED.pour_size, bar_whiskeys.pour_size);

  -- Update user profile sighting count
  INSERT INTO user_profiles (session_id, sighting_count)
  VALUES (NEW.session_id, 1)
  ON CONFLICT (session_id)
  DO UPDATE SET sighting_count = user_profiles.sighting_count + 1;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sighting_processes
  AFTER INSERT ON sightings
  FOR EACH ROW EXECUTE FUNCTION process_sighting();

-- Update confirmation count trigger
CREATE OR REPLACE FUNCTION update_confirmation_count()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (session_id, confirmation_count)
  VALUES (NEW.session_id, 1)
  ON CONFLICT (session_id)
  DO UPDATE SET confirmation_count = user_profiles.confirmation_count + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER confirmation_count_update
  AFTER INSERT ON confirmations
  FOR EACH ROW EXECUTE FUNCTION update_confirmation_count();

-- RPC: Get recent activity for a bar
CREATE OR REPLACE FUNCTION bar_activity(
  target_bar_id uuid,
  activity_limit integer DEFAULT 20
)
RETURNS TABLE (
  activity_type text,
  whiskey_name text,
  whiskey_id uuid,
  display_name text,
  price numeric,
  pour_size text,
  rating integer,
  notes text,
  status text,
  created_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  (
    SELECT
      'sighting'::text as activity_type,
      w.name as whiskey_name,
      s.whiskey_id,
      COALESCE(up.display_name, 'Anonymous') as display_name,
      s.price,
      s.pour_size,
      s.rating,
      s.notes,
      NULL::text as status,
      s.created_at
    FROM sightings s
    JOIN whiskeys w ON w.id = s.whiskey_id
    LEFT JOIN user_profiles up ON up.session_id = s.session_id
    WHERE s.bar_id = target_bar_id
  )
  UNION ALL
  (
    SELECT
      'confirmation'::text as activity_type,
      w.name as whiskey_name,
      bw.whiskey_id,
      COALESCE(up.display_name, 'Anonymous') as display_name,
      NULL as price,
      NULL as pour_size,
      NULL as rating,
      c.notes,
      c.status::text,
      c.created_at
    FROM confirmations c
    JOIN bar_whiskeys bw ON bw.id = c.bar_whiskey_id
    JOIN whiskeys w ON w.id = bw.whiskey_id
    LEFT JOIN user_profiles up ON up.session_id = c.session_id
    WHERE bw.bar_id = target_bar_id
  )
  ORDER BY created_at DESC
  LIMIT activity_limit;
END;
$$ LANGUAGE plpgsql STABLE;
