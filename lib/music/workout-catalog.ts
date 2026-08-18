/**
 * Builds a large gym / workout playlist (target 1000 unique tracks).
 * Pixabay is used when PIXABAY_API_KEY is set. Audius fills the rest so the
 * player is never stuck on the 9-track seed list.
 */

import { createServerClient } from '@/lib/supabase-server';
import type { MusicTrack } from './provider';
import { AudiusMusicProvider } from './audius-provider';
import { PixabayMusicProvider, rewritePixabayStreamUrl } from './pixabay-provider';
import { AUDIUS_API_BASE } from './config';

export const WORKOUT_CATALOG_TARGET = 1000;

const WORKOUT_QUERIES = [
  'workout',
  'gym',
  'fitness',
  'cardio',
  'training',
  'running',
  'athletic',
  'sport',
  'motivation',
  'energy',
  'trap',
  'edm',
  'house',
  'electronic',
  'hip hop',
  'drill',
  'bass',
  'running mix',
  'workout mix',
  'gym rap',
  'powerlifting',
  'hiit',
  'sprint',
  'boxing',
  'crossfit',
  'dance workout',
  'aerobics',
  'spinning',
  'techno',
  'dnb',
  'drum and bass',
  'phonk',
  'rage',
  'club',
  'night run',
  'beast mode',
];

let cache: { tracks: MusicTrack[]; expires: number } | null = null;
const CACHE_TTL_MS = 2 * 60 * 60 * 1000;
let building: Promise<MusicTrack[]> | null = null;

export function findWorkoutTrack(id: string): MusicTrack | null {
  if (!cache) return null;
  return (
    cache.tracks.find(
      (track) =>
        track.id === id ||
        track.providerTrackId === id ||
        `pixabay-${track.providerTrackId}` === id
    ) || null
  );
}

function playableSlice(tracks: MusicTrack[]) {
  return tracks.length > 1500 ? tracks.slice(0, 1500) : tracks;
}

export async function getWorkoutCatalog(): Promise<MusicTrack[]> {
  if (cache && cache.tracks.length >= WORKOUT_CATALOG_TARGET && cache.expires > Date.now()) {
    return playableSlice(cache.tracks);
  }
  if (building) return building.then(playableSlice);
  building = buildCatalog().finally(() => {
    building = null;
  });
  return building.then(playableSlice);
}

function unique(tracks: MusicTrack[]): MusicTrack[] {
  const seen = new Set<string>();
  return tracks.filter((track) => {
    const key = `${track.provider}:${track.providerTrackId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function asPlayableWorkout(track: MusicTrack): MusicTrack {
  const streamUrl =
    track.provider === 'audius'
      ? `${AUDIUS_API_BASE}/v1/tracks/${encodeURIComponent(track.providerTrackId)}/stream`
      : track.streamUrl;
  return {
    ...track,
    status: 'active',
    category: track.category && track.category !== 'cool_down' ? track.category : 'workout',
    genre: track.genre || 'Workout',
    commercialUseAllowed: true,
    publicPerformanceAllowed: true,
    streamUrl,
  };
}

async function buildCatalog(): Promise<MusicTrack[]> {
  const pixabay = new PixabayMusicProvider();
  const audius = new AudiusMusicProvider();
  let tracks: MusicTrack[] = [];

  try {
    const fromDb = await loadFromDb();
    tracks = unique([...tracks, ...fromDb]);
  } catch {
    /* db optional */
  }

  if (tracks.length < WORKOUT_CATALOG_TARGET) {
    try {
      const pixabayTracks = await pixabay.getFeaturedTracks();
      tracks = unique([...tracks, ...pixabayTracks.map(asPlayableWorkout)]);
    } catch (error) {
      console.warn('[workout-catalog] pixabay fetch failed', error);
    }
  }

  if (tracks.length < WORKOUT_CATALOG_TARGET) {
    const extras = await fetchAudiusWorkout(audius, WORKOUT_CATALOG_TARGET - tracks.length + 100);
    tracks = unique([...tracks, ...extras]);
  }

  tracks = tracks.map((track) =>
    track.provider === 'pixabay' ? rewritePixabayStreamUrl(asPlayableWorkout(track)) : asPlayableWorkout(track)
  );
  if (tracks.length > 1500) {
    tracks = unique(tracks)
      .map((track) => ({ track, sort: Math.random() }))
      .sort((a, b) => a.sort - b.sort)
      .slice(0, 1500)
      .map((item) => item.track);
  }

  cache = {
    tracks,
    expires: Date.now() + (tracks.length >= WORKOUT_CATALOG_TARGET ? CACHE_TTL_MS : 30 * 1000),
  };
  void persistCatalog(tracks).catch((error) => {
    console.warn('[workout-catalog] persist failed', error);
  });
  return tracks;
}

async function fetchAudiusWorkout(audius: AudiusMusicProvider, needed: number): Promise<MusicTrack[]> {
  const collected: MusicTrack[] = [];

  const playlistQueries = [
    'workout',
    'gym',
    'fitness',
    'cardio',
    'running',
    'gym motivation',
    'beast mode',
    'hiit',
    'trap gym',
    'workout mix',
  ];
  for (const query of playlistQueries) {
    if (unique(collected).length >= needed) break;
    try {
      const res = await fetch(
        `${AUDIUS_API_BASE}/v1/playlists/search?query=${encodeURIComponent(query)}&limit=15`,
        { headers: { Accept: 'application/json' } }
      );
      if (!res.ok) continue;
      const json: { data?: Array<{ id?: string }> } = await res.json();
      const ids = (json.data || []).map((item) => item.id).filter((id): id is string => Boolean(id));
      const playlists = await Promise.all(
        ids.slice(0, 8).map(async (id) => {
          try {
            const tracksRes = await fetch(`${AUDIUS_API_BASE}/v1/playlists/${encodeURIComponent(id)}/tracks`, {
              headers: { Accept: 'application/json' },
            });
            if (!tracksRes.ok) return [];
            const tracksJson: { data?: unknown[] } = await tracksRes.json();
            return (tracksJson.data || [])
              .map((raw) => audius.parseTrack(raw))
              .filter((track): track is MusicTrack => Boolean(track));
          } catch {
            return [];
          }
        })
      );
      collected.push(...playlists.flat().map(asPlayableWorkout));
    } catch (error) {
      console.warn('[workout-catalog] playlist search failed', query, error);
    }
  }

  const genres = ['Electronic', 'Trap', 'House', 'Techno', 'Hip-Hop/Rap', 'Drum & Bass', 'Dance'];
  for (const genre of genres) {
    if (unique(collected).length >= needed) break;
    try {
      const res = await fetch(
        `${AUDIUS_API_BASE}/v1/tracks/trending?genre=${encodeURIComponent(genre)}&limit=100`,
        { headers: { Accept: 'application/json' } }
      );
      if (!res.ok) continue;
      const json: { data?: unknown[] } = await res.json();
      collected.push(
        ...(json.data || [])
          .map((raw) => audius.parseTrack(raw))
          .filter((track): track is MusicTrack => Boolean(track))
          .map(asPlayableWorkout)
      );
    } catch {
      /* optional */
    }
  }

  const jobs = WORKOUT_QUERIES.flatMap((query) =>
    [0, 50, 100, 150, 200, 250].map((offset) => ({ query, offset }))
  );

  for (let i = 0; i < jobs.length && unique(collected).length < needed; i += 8) {
    const slice = jobs.slice(i, i + 8);
    const results = await Promise.all(
      slice.map(async ({ query, offset }) => {
        try {
          return await audius.searchTracks(query, { limit: 50, offset });
        } catch (error) {
          console.warn('[workout-catalog] audius search failed', query, error);
          return [];
        }
      })
    );
    collected.push(...results.flat().map(asPlayableWorkout));
  }

  return unique(collected);
}

async function loadFromDb(): Promise<MusicTrack[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('music_tracks')
    .select('*')
    .eq('status', 'active')
    .limit(WORKOUT_CATALOG_TARGET + 200);
  if (error || !data) return [];
  return data.map((row) => ({
    id: String(row.id),
    provider: String(row.provider || 'audius'),
    providerTrackId: String(row.provider_track_id),
    title: String(row.title || 'Untitled'),
    artist: String(row.artist || 'Unknown Artist'),
    album: row.album ? String(row.album) : null,
    genre: row.genre ? String(row.genre) : 'Workout',
    subGenre: row.sub_genre ? String(row.sub_genre) : null,
    countryOrRegion: row.country_or_region ? String(row.country_or_region) : null,
    language: row.language ? String(row.language) : null,
    energyLevel: typeof row.energy_level === 'number' ? (row.energy_level as 1 | 2 | 3 | 4 | 5) : 4,
    bpm: typeof row.bpm === 'number' ? row.bpm : null,
    duration: typeof row.duration === 'number' ? row.duration : null,
    artworkUrl: row.artwork_url ? String(row.artwork_url) : null,
    streamUrl: row.stream_url ? String(row.stream_url) : null,
    sourceUrl: row.source_url ? String(row.source_url) : null,
    providerTrackUrl: row.provider_track_url ? String(row.provider_track_url) : null,
    source: row.source ? String(row.source) : null,
    licenseName: row.license_name ? String(row.license_name) : null,
    licenseUrl: row.license_url ? String(row.license_url) : null,
    commercialUseAllowed: true,
    publicPerformanceAllowed: true,
    attributionRequired: row.attribution_required === true,
    attributionText: row.attribution_text ? String(row.attribution_text) : null,
    verificationDate: row.verification_date ? String(row.verification_date) : null,
    verificationNotes: row.verification_notes ? String(row.verification_notes) : null,
    isExplicit: row.is_explicit === true,
    category: (row.category as MusicTrack['category']) || 'workout',
    status: 'active',
    createdAt: row.created_at ? String(row.created_at) : null,
    updatedAt: row.updated_at ? String(row.updated_at) : null,
  }));
}

async function persistCatalog(tracks: MusicTrack[]) {
  const supabase = createServerClient();
  const chunkSize = 80;
  for (let i = 0; i < tracks.length; i += chunkSize) {
    const chunk = tracks.slice(i, i + chunkSize).map((track) => ({
      provider: track.provider,
      provider_track_id: track.providerTrackId,
      title: track.title.slice(0, 200),
      artist: track.artist.slice(0, 200),
      album: track.album,
      artwork_url: track.artworkUrl,
      stream_url: track.streamUrl,
      duration: track.duration,
      genre: track.genre,
      sub_genre: track.subGenre,
      country_or_region: track.countryOrRegion,
      language: track.language,
      energy_level: track.energyLevel,
      bpm: track.bpm,
      category: track.category || 'workout',
      status: 'active',
      source: track.source,
      source_url: track.sourceUrl,
      provider_track_url: track.providerTrackUrl,
      license_name: track.licenseName,
      license_url: track.licenseUrl,
      commercial_use_allowed: true,
      public_performance_allowed: true,
      attribution_required: track.attributionRequired,
      attribution_text: track.attributionText,
      is_explicit: false,
    }));
    await supabase.from('music_tracks').upsert(chunk, { onConflict: 'provider,provider_track_id' });
  }
}
