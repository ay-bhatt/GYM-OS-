/**
 * Audius provider implementation.
 *
 * Uses the public Audius REST API (https://api.audius.co). Verified endpoints:
 *   - GET /v1/tracks/search?q=...&limit=&offset=   -> { data: [...] }
 *   - GET /v1/tracks/{id}                          -> { data: { ... } }
 *   - Stream: GET /v1/tracks/{id}/stream           -> 302 to signed CDN mp3
 *
 * Streams are served DIRECTLY by Audius. ForgeGym's browser follows the
 * redirect to the Audius CDN — no audio bytes pass through ForgeGym's server.
 */

import { MusicProvider, MusicTrack, MusicCategory, SearchOptions } from './provider';
import { AUDIUS_API_BASE, AUDIUS_API_KEY } from './config';

type AudiusArtwork = Record<string, string> & { mirrors?: string[] };

interface AudiusRawTrack {
  id: string;
  track_id: number;
  title?: string;
  genre?: string;
  duration?: number;
  is_streamable?: boolean;
  is_delete?: boolean;
  is_original_available?: boolean;
  user?: { name?: string; handle?: string };
  user_id?: string;
  album_name?: string;
  artwork?: AudiusArtwork;
  stream?: { url?: string; mirrors?: string[] };
  access?: { stream?: boolean };
  stream_conditions?: unknown | null;
  download_conditions?: unknown | null;
  cover_art_sizes?: string;
  [key: string]: unknown;
}

const CATEGORY_GENRE_MAP: Record<string, MusicCategory> = {
  ambient: 'cool_down',
  'chill out': 'cool_down',
  downtempo: 'cool_down',
  'tropical house': 'cool_down',
  'drum & bass': 'workout',
  'drum and bass': 'workout',
  electronic: 'high_energy',
  latin: 'workout',
  hiphop: 'high_energy',
  'hip hop': 'high_energy',
};

/**
 * In-memory cache of enriched track metadata (TTL). The MusicService also
 * persists artwork/duration back to the DB, but this cache avoids redundant
 * Audius calls within a single request / burst of requests.
 */
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const trackCache = new Map<string, { track: MusicTrack; expires: number }>();

function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (AUDIUS_API_KEY) {
    headers['Audius-Api-Key'] = AUDIUS_API_KEY;
  }
  return headers;
}

function inferCategory(raw: AudiusRawTrack): MusicCategory {
  const genre = (raw.genre || '').toLowerCase();
  for (const [key, cat] of Object.entries(CATEGORY_GENRE_MAP)) {
    if (genre.includes(key)) return cat;
  }
  return 'high_energy';
}

function pickArtworkUrl(artwork?: AudiusArtwork | null): string | null {
  if (!artwork) return null;
  return (
    artwork['480x480'] ||
    artwork['1000x1000'] ||
    artwork['150x150'] ||
    artwork['2000x2000'] ||
    (artwork.mirrors && artwork.mirrors[0] ? null : null)
  );
}

export class AudiusMusicProvider extends MusicProvider {
  readonly name = 'audius';
  readonly displayName = 'Audius';
  readonly licenseNote = 'Audius tracks are only surfaced when the catalog entry documents gym-safe commercial and public-performance rights.';

  async searchTracks(query: string, options: SearchOptions = {}): Promise<MusicTrack[]> {
    const { limit = 10, offset = 0 } = options;
    const params = new URLSearchParams({
      q: query,
      limit: String(limit),
      offset: String(offset),
    });
    const res = await fetch(`${AUDIUS_API_BASE}/v1/tracks/search?${params.toString()}`, {
      headers: getHeaders(),
    });
    if (!res.ok) {
      console.warn(`[audius] search failed: ${res.status}`);
      return [];
    }
    const json: { data?: AudiusRawTrack[] } = await res.json().catch(() => ({ data: [] }));
    return (json.data || []).map((raw) => this.mapTrack(raw)).filter((t) => t.status === 'active');
  }

  async getTrack(providerTrackId: string): Promise<MusicTrack | null> {
    const cached = trackCache.get(providerTrackId);
    if (cached && cached.expires > Date.now()) {
      return cached.track;
    }

    const res = await fetch(`${AUDIUS_API_BASE}/v1/tracks/${encodeURIComponent(providerTrackId)}`, {
      headers: getHeaders(),
    });
    if (!res.ok) {
      console.warn(`[audius] getTrack(${providerTrackId}) failed: ${res.status}`);
      return null;
    }
    const json: { data?: AudiusRawTrack } = await res.json().catch(() => ({ data: undefined }));
    const raw = json.data;
    if (!raw) return null;

    const track = this.mapTrack(raw);
    trackCache.set(providerTrackId, { track, expires: Date.now() + CACHE_TTL_MS });
    return track;
  }

  /**
   * Returns a stream URL the browser can hand directly to an <audio> element.
   * Audius resolves this to a signed CDN mp3 via a 302 redirect — the audio is
   * fetched from Audius, never proxied through ForgeGym.
   */
  async getStreamUrl(providerTrackId: string): Promise<string> {
    return `${AUDIUS_API_BASE}/v1/tracks/${encodeURIComponent(providerTrackId)}/stream`;
  }

  /**
   * Audius does not expose a reliable public "featured" endpoint without a
   * client id, so featured content is not pulled here. The approved catalog is
   * curated in the `music_tracks` table instead.
   */
  async getFeaturedTracks(): Promise<MusicTrack[]> {
    return [];
  }

  parseTrack(raw: unknown): MusicTrack | null {
    if (!raw || typeof raw !== 'object') return null;
    return this.mapTrack(raw as AudiusRawTrack);
  }

  private mapTrack(raw: AudiusRawTrack): MusicTrack {
    const user = raw.user || {};
    const artist = (user.name && user.name.trim()) || user.handle || 'Unknown Artist';
    const artworkUrl = pickArtworkUrl(raw.artwork);
    const duration = typeof raw.duration === 'number' ? raw.duration : null;
    const streamable = raw.is_streamable !== false && raw.is_delete !== true;
    const accessStream = raw.access ? raw.access.stream !== false : true;
    const canStream = streamable && accessStream;

    return {
      id: raw.id,
      provider: 'audius',
      providerTrackId: raw.id,
      title: raw.title || 'Untitled',
      artist,
      album: raw.album_name || null,
      subGenre: null,
      countryOrRegion: null,
      language: null,
      energyLevel: null,
      bpm: null,
      artworkUrl,
      streamUrl: null,
      duration,
      genre: raw.genre || null,
      sourceUrl: null,
      providerTrackUrl: `${AUDIUS_API_BASE}/v1/tracks/${encodeURIComponent(raw.id)}`,
      source: 'Audius',
      licenseName: null,
      licenseUrl: null,
      commercialUseAllowed: 'REQUIRES_REVIEW',
      publicPerformanceAllowed: 'REQUIRES_REVIEW',
      attributionRequired: false,
      attributionText: null,
      verificationDate: null,
      verificationNotes: null,
      isExplicit: false,
      category: inferCategory(raw),
      status: canStream ? 'active' : 'disabled',
      createdAt: null,
      updatedAt: null,
    };
  }
}
