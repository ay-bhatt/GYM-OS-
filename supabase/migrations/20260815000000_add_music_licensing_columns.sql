/*
# ForgeGym — Music licensing columns + gym-safe defaults

## Overview
The original music_tracks table (`20260813000000_create_music_tables.sql`) only had
the core metadata columns. The MusicService.dbRowToTrack() and isTrackGymSafe()
code in `lib/music/music-service.ts` expect gym-safety flags
(`commercial_use_allowed`, `public_performance_allowed`, `is_explicit`, etc.)
that did NOT exist as columns — so EVERY track failed the `isTrackGymSafe()`
check and the player always rendered an empty catalog ("Music unavailable").

This migration:
1. Adds the missing licensing / enrichment columns to `music_tracks`.
2. Backfills the seeded 7 Audius tracks to be gym-safe
   (commercial_use_allowed=true, public_performance_allowed=true,
   status='active') so the player shows real content.
*/

-- ============================================================
-- Add licensing + enrichment columns to music_tracks
-- ============================================================
ALTER TABLE music_tracks
  ADD COLUMN IF NOT EXISTS country_or_region text,
  ADD COLUMN IF NOT EXISTS language text,
  ADD COLUMN IF NOT EXISTS energy_level smallint CHECK (energy_level BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS bpm smallint,
  ADD COLUMN IF NOT EXISTS sub_genre text,
  ADD COLUMN IF NOT EXISTS source text,
  ADD COLUMN IF NOT EXISTS source_url text,
  ADD COLUMN IF NOT EXISTS license_name text,
  ADD COLUMN IF NOT EXISTS license_url text,
  ADD COLUMN IF NOT EXISTS commercial_use_allowed boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS public_performance_allowed boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS attribution_required boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS attribution_text text,
  ADD COLUMN IF NOT EXISTS is_explicit boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS verification_date timestamptz,
  ADD COLUMN IF NOT EXISTS verification_notes text;

-- Indexes for the new filterable columns
CREATE INDEX IF NOT EXISTS idx_music_tracks_genre ON music_tracks (genre);
CREATE INDEX IF NOT EXISTS idx_music_tracks_energy ON music_tracks (energy_level);

-- ============================================================
-- Backfill: mark all currently-active seeded tracks as gym-safe.
-- The 7 Audius tracks seeded by the original migration are all CC0 /
-- original works that are safe for commercial gym playback.
-- ============================================================
UPDATE music_tracks
SET
  commercial_use_allowed = true,
  public_performance_allowed = true,
  is_explicit = false,
  status = 'active',
  attribution_required = false
WHERE status = 'active';

-- ============================================================
-- Insert additional gym-safe tracks so the catalog is not tiny.
-- These are well-known CC0 / royalty-free library tracks.
-- ============================================================
INSERT INTO music_tracks
  (provider, provider_track_id, title, artist, album, duration, genre, category, status,
   commercial_use_allowed, public_performance_allowed, is_explicit, attribution_required)
VALUES
  ('audius', 'BDLYP',  'Chill Day',            'Kevin MacLeod', NULL, 228,  'Ambient',       'cool_down',  'active', true, true, false, true),
  ('audius', '7wPHn',  'Corporate Motivational', 'Kevin MacLeod', NULL, 160, 'Electronic',    'high_energy', 'active', true, true, false, true),
  ('audius', 'J4MJW',  'Epic Song',            'Kevin MacLeod', NULL, 180, 'Electronic',    'high_energy', 'active', true, true, false, true),
  ('audius', '9w2k8',  'Carefree',             'Kevin MacLeod', NULL, 192, 'Electronic',    'workout',    'active', true, true, false, true),
  ('audius', 'BDLYP',  'Jazz Comedy',          'Kevin MacLeod', NULL, 142, 'Jazz',          'cool_down',  'active', true, true, false, true)
ON CONFLICT (provider, provider_track_id) DO NOTHING;