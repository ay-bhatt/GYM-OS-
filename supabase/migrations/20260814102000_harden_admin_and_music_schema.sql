/*
# ForgeGym hardening migration

Adds case-insensitive uniqueness for editable identifiers, an audit log table,
and the licensing metadata required by the global music catalog.

This migration is intentionally additive. It does not seed demo data and does
not delete existing rows.
*/

-- ============================================================
-- Case-insensitive uniqueness for editable identifiers
-- ============================================================
CREATE UNIQUE INDEX IF NOT EXISTS idx_gyms_gym_id_ci
  ON gyms (lower(gym_id));

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_ci
  ON users (lower(username));

-- ============================================================
-- Audit logs for destructive / privileged actions
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES users(id) ON DELETE SET NULL,
  action text NOT NULL,
  target_type text NOT NULL,
  target_id text NOT NULL,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_audit_logs" ON audit_logs;
CREATE POLICY "select_audit_logs" ON audit_logs FOR SELECT
  TO authenticated USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "insert_audit_logs" ON audit_logs;
CREATE POLICY "insert_audit_logs" ON audit_logs FOR INSERT
  TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target ON audit_logs(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- ============================================================
-- Music catalog licensing metadata
-- ============================================================
ALTER TABLE music_tracks
  ADD COLUMN IF NOT EXISTS source text,
  ADD COLUMN IF NOT EXISTS source_url text,
  ADD COLUMN IF NOT EXISTS license_name text,
  ADD COLUMN IF NOT EXISTS license_url text,
  ADD COLUMN IF NOT EXISTS commercial_use_allowed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS public_performance_allowed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS attribution_required boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS attribution_text text,
  ADD COLUMN IF NOT EXISTS verification_date timestamptz,
  ADD COLUMN IF NOT EXISTS verification_notes text,
  ADD COLUMN IF NOT EXISTS is_explicit boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS country_or_region text,
  ADD COLUMN IF NOT EXISTS language text,
  ADD COLUMN IF NOT EXISTS energy_level smallint,
  ADD COLUMN IF NOT EXISTS sub_genre text,
  ADD COLUMN IF NOT EXISTS provider_track_url text;

ALTER TABLE music_tracks
  ALTER COLUMN status SET DEFAULT 'license_review';

DO $$
BEGIN
  ALTER TABLE music_tracks
    ADD CONSTRAINT music_tracks_energy_level_check
    CHECK (energy_level IS NULL OR energy_level BETWEEN 1 AND 5);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_music_tracks_country_or_region ON music_tracks(country_or_region);
CREATE INDEX IF NOT EXISTS idx_music_tracks_language ON music_tracks(language);
CREATE INDEX IF NOT EXISTS idx_music_tracks_energy_level ON music_tracks(energy_level);
CREATE INDEX IF NOT EXISTS idx_music_tracks_is_explicit ON music_tracks(is_explicit);

-- Keep service role fully privileged on the new table.
GRANT ALL PRIVILEGES ON audit_logs TO service_role;

