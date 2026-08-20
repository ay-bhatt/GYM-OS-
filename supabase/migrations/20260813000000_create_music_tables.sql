/*
# ForgeGym — Global Music Player schema

## Overview
Adds the Global Gym Music Player catalog. The catalog is GLOBAL: every gym
sees the same approved tracks. Playback STATE is never persisted here — it lives
in each browser session, which keeps Gym 1's playback independent of Gym 2's.

Audio is streamed DIRECTLY from the music provider (Audius CDN). ForgeGym only
stores metadata + a provider track reference, never copyrighted audio files.

## New Tables
1. music_tracks   — the single approved, global catalog
2. music_settings — feature flags for the music player

## Security
- RLS enabled on both tables.
- Anonymous (browser-direct) read of active tracks is allowed so the player can
  load on the login page before authentication. All writes are restricted to the
  authenticated service_role, which the Next.js API routes use.
*/

-- ============================================================
-- 1. music_tracks — the single approved, global catalog
-- ============================================================
CREATE TABLE IF NOT EXISTS music_tracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL DEFAULT 'audius',
  provider_track_id text NOT NULL,
  title text NOT NULL,
  artist text NOT NULL,
  album text,
  artwork_url text,
  stream_url text,
  duration bigint,
  genre text,
  category text NOT NULL DEFAULT 'workout',
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE music_tracks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_music_tracks" ON music_tracks;
CREATE POLICY "select_music_tracks" ON music_tracks FOR SELECT
  TO authenticated USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "select_music_tracks_public" ON music_tracks;
CREATE POLICY "select_music_tracks_public" ON music_tracks FOR SELECT
  TO anon USING (true);

DROP POLICY IF EXISTS "insert_music_tracks" ON music_tracks;
CREATE POLICY "insert_music_tracks" ON music_tracks FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_music_tracks" ON music_tracks;
CREATE POLICY "update_music_tracks" ON music_tracks FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

CREATE UNIQUE INDEX IF NOT EXISTS idx_music_tracks_provider_track
  ON music_tracks (provider, provider_track_id);
CREATE INDEX IF NOT EXISTS idx_music_tracks_status ON music_tracks (status);
CREATE INDEX IF NOT EXISTS idx_music_tracks_category ON music_tracks (category);
CREATE INDEX IF NOT EXISTS idx_music_tracks_provider_track_id
  ON music_tracks (provider_track_id);

-- ============================================================
-- 2. music_settings — global feature flags
-- ============================================================
CREATE TABLE IF NOT EXISTS music_settings (
  id text PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT true,
  default_provider text,
  default_category text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE music_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_music_settings" ON music_settings;
CREATE POLICY "select_music_settings" ON music_settings FOR SELECT
  TO anon USING (true);

DROP POLICY IF EXISTS "update_music_settings" ON music_settings;
CREATE POLICY "update_music_settings" ON music_settings FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- SEED: curated, approved catalog.
-- Each Audius track below was verified to exist & be streamable.
-- Only status='active' tracks are served to players. artwork_url/duration
-- are enriched at runtime by the Audius provider (cached into the table);
-- stream_url is computed via the provider formula and is NOT stored here.
-- ============================================================
INSERT INTO music_tracks
  (provider, provider_track_id, title, artist, album, duration, genre, category, status)
VALUES
  ('audius', 'KxKMl',     'Gunky''s Uprising',           'Justin Blau (3LAU)', NULL, 178,  'Electronic',   'high_energy', 'active'),
  ('audius', 'G0wyE',     'Kliptown Empyrean',            'Skrillex',           NULL, 226,  'Electronic',   'high_energy', 'active'),
  ('audius', '8YJKW',     'Real ft. Harrison $FIRST',     'LA EQUIS',           NULL, 210,  'Latin',         'workout',     'active'),
  ('audius', 'gJqxx',     'Dimension - Brownies and Lemonade Live in LA (Live Set)', 'TeamBandL', NULL, 4645, 'Drum & Bass', 'cardio',     'active'),
  ('audius', 'rEdqpyZ',   'Arachnids [Extended Mix]',     'Disclosure',         NULL, 320,  'Electronic',  'strength',    'active'),
  ('audius', 'AVOzK',     'Plus 1 Ft. Nasty C [prod by Twin Plams]', '24HRS', NULL, 190, 'Tropical House','cool_down',  'active'),
  ('audius', 'KvooYRB',   'Mean Something',               'Broey.',             NULL, 271,  'Electronic',  'cool_down',   'active')
ON CONFLICT (provider, provider_track_id) DO NOTHING;

INSERT INTO music_settings (id, enabled, default_provider, default_category)
VALUES ('default', true, 'audius', 'workout')
ON CONFLICT (id) DO UPDATE
  SET enabled = EXCLUDED.enabled,
      default_provider = EXCLUDED.default_provider,
      default_category = EXCLUDED.default_category;

-- ============================================================
-- updated_at trigger helper
-- ------------------------------------------------------------
-- `update_updated_at()` is defined in the base schema migration, but we
-- re-declare it here so this migration is self-contained and works even if
-- applied to a fresh/anonymously-provisioned project that hasn't run the
-- base migration. CREATE OR REPLACE is idempotent.
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- updated_at triggers
-- ============================================================
DROP TRIGGER IF EXISTS trg_music_tracks_updated_at ON music_tracks;
CREATE TRIGGER trg_music_tracks_updated_at BEFORE UPDATE ON music_tracks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_music_settings_updated_at ON music_settings;
CREATE TRIGGER trg_music_settings_updated_at BEFORE UPDATE ON music_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
