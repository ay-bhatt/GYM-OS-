/**
 * ForgeGym — Music Catalog Importer
 *
 * Imports the curated catalog from scripts/catalog/music_catalog.json into the
 * music_tracks table. Idempotent: uses upsert on (provider, provider_track_id)
 * so it can be re-run safely after new tracks are added to the JSON file.
 *
 * Only tracks with verified gym-safe licensing fields are activated. Tracks
 * flagged for review remain in `license_review` status until a Super Admin
 * promotes them in the Music Library.
 *
 * Usage:
 *   node scripts/music/import-catalog.js
 *
 * Requires:
 *   SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL)
 *   SUPABASE_SERVICE_ROLE_KEY
 */

const fs = require('node:fs');
const path = require('node:fs');
const { createClient } = require('@supabase/supabase-js');

const CATALOG_PATH = require('node:path').resolve(__dirname, '../catalog/music_catalog.json');

async function main() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.error('Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
    process.exit(1);
  }

  if (!fs.existsSync(CATALOG_PATH)) {
    console.error(`Catalog file not found at ${CATALOG_PATH}.`);
    console.error('Run: node scripts/music/generate-catalog.js');
    process.exit(1);
  }

  const raw = fs.readFileSync(CATALOG_PATH, 'utf8');
  const catalog = JSON.parse(raw);
  const tracks = catalog.tracks || [];

  if (!tracks.length) {
    console.error('No tracks found in catalog.');
    process.exit(1);
  }

  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Clear only non-active tracks that were previously imported (e.g. broken demo tracks).
  // Active tracks are upserted below; we don't delete existing active tracks.
  const { error: clearError } = await supabase
    .from('music_tracks')
    .delete()
    .eq('status', 'license_review')
    .like('provider', 'audius');
  if (clearError) {
    console.error('Error clearing license_review tracks:', clearError.message);
  }

  // Upsert in batches of 100
  const BATCH_SIZE = 100;
  let upserted = 0;

  for (let i = 0; i < tracks.length; i += BATCH_SIZE) {
    const batch = tracks.slice(i, i + BATCH_SIZE);
    const rows = batch.map((t) => ({
      provider: t.provider,
      provider_track_id: t.provider_track_id,
      title: t.title,
      artist: t.artist,
      album: t.album,
      genre: t.genre,
      sub_genre: t.sub_genre,
      country_or_region: t.country_or_region,
      language: t.language,
      energy_level: t.energy_level,
      bpm: t.bpm,
      duration: t.duration,
      artwork_url: t.artwork_url,
      stream_url: t.stream_url,
      source_url: t.source_url,
      provider_track_url: t.provider_track_url,
      source: t.source,
      license_name: t.license_name,
      license_url: t.license_url,
      commercial_use_allowed: t.commercial_use_allowed,
      public_performance_allowed: t.public_performance_allowed,
      attribution_required: t.attribution_required,
      attribution_text: t.attribution_text,
      verification_date: t.verification_date,
      verification_notes: t.verification_notes,
      is_explicit: t.is_explicit,
      category: t.category,
      status: t.status,
    }));

    const { error } = await supabase
      .from('music_tracks')
      .upsert(rows, { onConflict: 'provider,provider_track_id' });

    if (error) {
      console.error(`Error upserting batch ${i / BATCH_SIZE + 1}:`, error.message);
    } else {
      upserted += rows.length;
    }
  }

  console.log(`Imported ${upserted} tracks into music_tracks.`);
  console.log(`Active (playable): ${tracks.filter((t) => t.status === 'active').length}`);
  console.log(`License review: ${tracks.filter((t) => t.status === 'license_review').length}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
