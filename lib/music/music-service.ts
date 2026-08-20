/**
 * MusicService — the application-level music facade.
 *
 * The player UI talks to this service (via server-side API routes), never to a
 * provider directly. Responsibilities:
 *
 *  1. Serve only the APPROVED catalog (music_tracks.status = 'active').
 *  2. Resolve a stream URL through the provider so credentials never leave the
 *     server, then hand the provider's URL to the browser to stream directly.
 *  3. Enrich tracks (artwork / duration) from the provider and cache the result
 *     back into music_tracks so the provider is only hit until data is cached.
 *  4. Fall back to the curated in-memory catalog if Supabase is unavailable, so
 *     the player never renders empty due to a missing backend.
 *
 * Playback STATE is intentionally NOT stored here — it lives in each browser
 * session, which is what keeps Gym 1's playback independent of Gym 2's.
 */

import { createServerClient, tryCreateServerClient } from '@/lib/supabase-server';
import { MusicProvider, MusicTrack, MusicCategory, TrackStatus } from './provider';
import { AudiusMusicProvider } from './audius-provider';
import { PixabayMusicProvider, rewritePixabayStreamUrl } from './pixabay-provider';
import { FALLBACK_CATALOG, MUSIC_CATEGORIES, DEFAULT_CATEGORY, isTrackGymSafe } from './catalog';
import { MUSIC_PROVIDER } from './config';
import { findWorkoutTrack, getWorkoutCatalog } from './workout-catalog';

export type MusicServiceOptions = {
  /** Limit results to a single category (e.g. 'workout'). */
  category?: MusicCategory | string;
};

function toClientPlaybackTrack(track: MusicTrack): MusicTrack {
  const withProviderCache = rewritePixabayStreamUrl(track);
  return {
    ...withProviderCache,
    streamUrl: `/api/music/stream/${encodeURIComponent(track.id)}`,
  };
}

function createProvider(): MusicProvider {
  const id = (MUSIC_PROVIDER || 'pixabay').toLowerCase();
  if (id === 'pixabay') return new PixabayMusicProvider();
  if (id === 'audius') return new AudiusMusicProvider();
  console.warn(`[music] unknown MUSIC_PROVIDER="${id}", falling back to pixabay`);
  return new PixabayMusicProvider();
}

export class MusicService {
  private readonly provider: MusicProvider;

  constructor(provider?: MusicProvider) {
    this.provider = provider ?? createProvider();
  }

  getProviderName(): string {
    return this.provider.name;
  }

  getCategories() {
    return MUSIC_CATEGORIES;
  }

  getDefaultCategory(): MusicCategory {
    return DEFAULT_CATEGORY;
  }

  /** Approved, enriched tracks for the global catalog. */
  async getApprovedTracks(opts: MusicServiceOptions = {}): Promise<MusicTrack[]> {
    let source: MusicTrack[] = [];

    try {
      source = await getWorkoutCatalog();
    } catch (error) {
      console.warn('[music] workout catalog failed', error);
    }

    if (source.length === 0) {
      const fromDb = await this.fetchApprovedFromDb(opts.category);
      if (fromDb && fromDb.length > 0) {
        source = fromDb.filter(isTrackGymSafe);
      } else if (this.provider.name === 'pixabay') {
        source = (await this.provider.getFeaturedTracks()).filter(isTrackGymSafe);
      } else {
        source = FALLBACK_CATALOG.filter(isTrackGymSafe);
      }
    }

    if (opts.category) {
      const filtered = source.filter((t) => t.category === opts.category);
      if (filtered.length >= 20) source = filtered;
    }

    return source.map(toClientPlaybackTrack);
  }

  async getTrackById(id: string): Promise<MusicTrack | null> {
    const cached = findWorkoutTrack(id);
    if (cached) return cached;

    const fromDb = await this.fetchTrackFromDb(id);
    if (fromDb) return this.enrichTrack(fromDb);

    const pixabayId = id.startsWith('pixabay-') ? id.slice('pixabay-'.length) : id;
    const fromPixabay = await new PixabayMusicProvider().getTrack(pixabayId);
    if (fromPixabay) return this.enrichTrack(fromPixabay);

    const fromFallback = FALLBACK_CATALOG.find((t) => t.id === id || t.providerTrackId === id) ?? null;
    if (fromFallback) return this.enrichTrack(fromFallback);

    if (!id.startsWith('pixabay-')) {
      const fromAudius = await new AudiusMusicProvider().getTrack(id);
      if (fromAudius) return this.enrichTrack(fromAudius);
    }

    return null;
  }

  async getAdminTracks(filters: { search?: string; status?: string; provider?: string; genre?: string; country?: string } = {}): Promise<MusicTrack[]> {
    try {
      const supabase = tryCreateServerClient();
      if (!supabase) return [];
      let query = supabase.from('music_tracks').select('*').order('created_at', { ascending: false });

      if (filters.status) query = query.eq('status', filters.status);
      if (filters.provider) query = query.eq('provider', filters.provider);
      if (filters.genre) query = query.ilike('genre', filters.genre);
      if (filters.country) query = query.ilike('country_or_region', filters.country);
      if (filters.search) {
        const term = filters.search.trim().replace(/,/g, ' ');
        if (term) {
          query = query.or(
            `title.ilike.%${term}%,artist.ilike.%${term}%,provider_track_id.ilike.%${term}%,album.ilike.%${term}%`
          );
        }
      }

      const { data, error } = await query;
      if (error) throw error;
            return (data || []).map(this.dbRowToTrack);
    } catch {
      return [];
    }
  }

  /**
   * Search the provider for tracks and insert them into the catalog with
   * status = 'license_review'. The admin must review licensing on the Music
   * Library page before activating any track for playback.
   *
   * Returns:
   *   - imported: tracks that were newly inserted (or already existed in
   *     license_review and were refreshed with current metadata)
   *   - skipped: tracks that already exist with a non-review status
   */
  async importTracks(search: string, limit: number = 10): Promise<{ imported: MusicTrack[]; skipped: MusicTrack[] }> {
    const results = await this.provider.searchTracks(search, { limit });
    const imported: MusicTrack[] = [];
    const skipped: MusicTrack[] = [];
    const supabase = createServerClient();

    for (const track of results) {
      // Check if the track already exists in the catalog
      const { data: existing } = await supabase
        .from('music_tracks')
        .select('status')
        .eq('provider', track.provider)
        .eq('provider_track_id', track.providerTrackId)
        .maybeSingle();

      if (existing && existing.status !== 'license_review') {
        skipped.push(track);
        continue;
      }

      // Normalize rights flags — Audius returns 'REQUIRES_REVIEW' which
      // we store as false; the admin will set true after review.
      const commercialUse = track.commercialUseAllowed === true ? true : false;
      const publicPerf = track.publicPerformanceAllowed === true ? true : false;

      const { error } = await supabase
        .from('music_tracks')
        .upsert({
          provider: track.provider,
          provider_track_id: track.providerTrackId,
          title: track.title,
          artist: track.artist,
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
          category: track.category,
          status: 'license_review',
          source: track.source,
          source_url: track.sourceUrl,
          license_name: track.licenseName,
          license_url: track.licenseUrl,
          commercial_use_allowed: commercialUse,
          public_performance_allowed: publicPerf,
          attribution_required: track.attributionRequired,
          attribution_text: track.attributionText,
          verification_date: track.verificationDate,
          verification_notes: track.verificationNotes,
          is_explicit: track.isExplicit,
        })
        .select()
        .single();

      if (!error) {
        imported.push(track);
      } else {
        console.warn(`[music] failed to import track ${track.providerTrackId}:`, error);
      }
    }

    return { imported, skipped };
  }

  /**
   * Resolves a stream URL for a track id. The returned URL points at the
   * provider's CDN; the browser fetches audio directly from there.
   */
  async resolveStreamUrl(trackId: string): Promise<string | null> {
    const track = await this.getTrackById(trackId);
    if (!track || track.status !== 'active') return null;
    if (track.streamUrl && /^https?:\/\//i.test(track.streamUrl)) {
      return track.streamUrl;
    }
    try {
      if (track.provider === 'audius') {
        return new AudiusMusicProvider().getStreamUrl(track.providerTrackId);
      }
      if (track.provider === 'pixabay') {
        return await new PixabayMusicProvider().getStreamUrl(track.providerTrackId);
      }
      return await this.provider.getStreamUrl(track.providerTrackId);
    } catch (e) {
      console.warn('[music] getStreamUrl failed, using cached value', e);
      return track.streamUrl ?? null;
    }
  }
    // ---------------------------------------------------------------------------
  // Data access
  // ---------------------------------------------------------------------------

  private async fetchApprovedFromDb(category?: MusicCategory | string): Promise<MusicTrack[] | null> {
    try {
      const supabase = tryCreateServerClient();
      if (!supabase) return null;
      let query = supabase
        .from('music_tracks')
        .select('*')
        .eq('status', 'active')
        .order('category', { ascending: true })
        .order('artist', { ascending: true });

      if (category) {
        query = query.eq('category', category);
      }

      const { data, error } = await query;
      if (error) {
        console.warn('[music] music_tracks query error:', error.message);
        return null;
      }
      return (data || []).map(this.dbRowToTrack);
    } catch (e) {
      console.warn('[music] music_tracks unavailable, using fallback catalog:', (e as Error).message);
      return null;
    }
  }

  private async fetchTrackFromDb(id: string): Promise<MusicTrack | null> {
    try {
      const supabase = tryCreateServerClient();
      if (!supabase) return null;
      const { data } = await supabase
        .from('music_tracks')
        .select('*')
        .or(`id.eq.${id},provider_track_id.eq.${id}`)
        .eq('status', 'active')
        .maybeSingle();
      return data ? this.dbRowToTrack(data) : null;
    } catch {
      return null;
    }
  }

  private dbRowToTrack(row: Record<string, unknown>): MusicTrack {
    return {
      id: String(row.id),
      provider: String(row.provider || 'audius'),
      providerTrackId: String(row.provider_track_id),
      title: String(row.title || 'Untitled'),
      artist: String(row.artist || 'Unknown Artist'),
      album: row.album ? String(row.album) : null,
      genre: row.genre ? String(row.genre) : null,
      subGenre: row.sub_genre ? String(row.sub_genre) : null,
      countryOrRegion: row.country_or_region ? String(row.country_or_region) : null,
      language: row.language ? String(row.language) : null,
      energyLevel: typeof row.energy_level === 'number' ? row.energy_level as 1 | 2 | 3 | 4 | 5 : null,
      bpm: typeof row.bpm === 'number' ? row.bpm : null,
      sourceUrl: row.source_url ? String(row.source_url) : null,
      providerTrackUrl: row.provider_track_url ? String(row.provider_track_url) : null,
      source: row.source ? String(row.source) : null,
      licenseName: row.license_name ? String(row.license_name) : null,
      licenseUrl: row.license_url ? String(row.license_url) : null,
      commercialUseAllowed: row.commercial_use_allowed === true,
      publicPerformanceAllowed: row.public_performance_allowed === true,
      attributionRequired: row.attribution_required === true,
      attributionText: row.attribution_text ? String(row.attribution_text) : null,
      verificationDate: row.verification_date ? String(row.verification_date) : null,
      verificationNotes: row.verification_notes ? String(row.verification_notes) : null,
      isExplicit: row.is_explicit === true,
      artworkUrl: row.artwork_url ? String(row.artwork_url) : null,
      streamUrl: row.stream_url ? String(row.stream_url) : null,
      duration: typeof row.duration === 'number' ? row.duration : null,
      category: (row.category as MusicCategory) || DEFAULT_CATEGORY,
      status: (row.status as TrackStatus) || 'license_review',
      createdAt: row.created_at ? String(row.created_at) : null,
      updatedAt: row.updated_at ? String(row.updated_at) : null,
    };
  }

  private async enrichTrack(track: MusicTrack): Promise<MusicTrack> {
    const out: MusicTrack = { ...track, streamUrl: track.streamUrl ?? null };

    if (!out.streamUrl) {
      try {
        out.streamUrl = await this.provider.getStreamUrl(track.providerTrackId);
      } catch {
        out.streamUrl = null;
      }
    }

    if (!out.artworkUrl || !out.duration) {
      try {
        const enriched = await this.provider.getTrack(track.providerTrackId);
        if (enriched) {
          if (!out.artworkUrl && enriched.artworkUrl) out.artworkUrl = enriched.artworkUrl;
          if (!out.duration && enriched.duration) out.duration = enriched.duration;
          if ((out.artworkUrl || out.duration) && this.isDbId(track.id)) {
            void this.cacheEnrichment(track.id, out.artworkUrl, out.duration).catch(() => {});
          }
        }
      } catch {
        /* non-fatal: player still works with placeholder artwork */
      }
    }

    return out;
  }

  /** UUID primary keys (DB rows) are cacheable; the in-memory catalog uses
   *  short provider ids which have no corresponding DB row to update. */
  private isDbId(id: string): boolean {
    return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id);
  }

  private async cacheEnrichment(id: string, artworkUrl: string | null, duration: number | null) {
    try {
      const supabase = tryCreateServerClient();
      if (!supabase) return;
      await supabase
        .from('music_tracks')
        .update({ artwork_url: artworkUrl, duration, updated_at: new Date().toISOString() })
                .eq('id', id);
    } catch {
      /* ignore cache write failures */
    }
  }
}

// Singleton used by all API route handlers.
export const musicService = new MusicService();
