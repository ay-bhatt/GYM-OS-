/**
 * ForgeGym — Global Gym Music Player: provider abstraction layer.
 *
 * Defines the contract every music provider implements, plus the canonical
 * track shape used across the app. The player UI and MusicService talk to a
 * `MusicProvider` through the `MusicService`, never to a specific provider
 * (e.g. Audius / FreeMusicArchive / Jamendo), so providers can be swapped
 * without touching the UI.
 *
 * Type-only at runtime (types + abstract class, no server deps) so it is safe
 * to import from client components as type imports.
 */

/** Workout session modes. The UI may expose a subset now; the engine supports all. */
export type PlaylistMode =
  | 'workout'
  | 'high_energy'
  | 'cardio'
  | 'strength'
  | 'indian_energy'
  | 'global_energy'
  | 'warm_up'
  | 'cool_down';

/** Broad listening categories. */
export type MusicCategory =
  | 'workout'
  | 'high_energy'
  | 'cardio'
  | 'strength'
  | 'cool_down'
  | 'warm_up';

/** 1=Calm … 5=High Energy (requirement 5). */
export type EnergyLevel = 1 | 2 | 3 | 4 | 5;

/** Track lifecycle status (requirement 24). Only `active` is playable. */
export type TrackStatus =
  | 'active'
  | 'disabled'
  | 'pending_review'
  | 'license_review'
  | 'broken'
  | 'removed'
  | 'blocked';

/** Some rights flags are not binary until a human has verified the source. */
export type RightsFlag = boolean | 'REQUIRES_REVIEW';

export interface LicenseMeta {
  licenseName: string;
  licenseUrl: string | null;
  commercialUseAllowed: RightsFlag;
  publicPerformanceAllowed: RightsFlag;
  attributionRequired: boolean;
  attributionText: string | null;
  source: string | null;
  sourceUrl: string | null;
  verificationDate: string | null;
  verificationNotes: string | null;
}

export interface MusicTrack {
  id: string;
  provider: string;
  providerTrackId: string;
  title: string;
  artist: string;
  album: string | null;
  genre: string | null;
  subGenre: string | null;
  /** ISO 3166-1 alpha-2 region ("IN","US",...) */
  countryOrRegion: string | null;
  /** Language code from the supported set */
  language: string | null;
  /** 1-5 energy classification */
  energyLevel: EnergyLevel | null;
  bpm: number | null;
  duration: number | null; // seconds
  artworkUrl: string | null;
  streamUrl: string | null;
  sourceUrl: string | null;
  providerTrackUrl: string | null;
  // licensing
  licenseName: string | null;
  licenseUrl: string | null;
  commercialUseAllowed: RightsFlag;
  publicPerformanceAllowed: RightsFlag;
  attributionRequired: boolean;
  attributionText: string | null;
  verificationDate: string | null;
  verificationNotes: string | null;
  source: string | null;
  // content safety
  isExplicit: boolean;
  /** Broad category used for filtering / mode mapping */
  category: MusicCategory;
  status: TrackStatus;
  createdAt: string | null;
  updatedAt: string | null;
  /** Rank in the gym floor playlist (1–1000). Missing if the track is not on the player. */
  playerRank?: number | null;
}

export interface SearchOptions {
  limit?: number;
  offset?: number;
}

/** Internal shape returned by a provider when resolving a single track. */
export interface ProviderTrack extends MusicTrack {}

/**
 * Abstract base class every music provider implements.
 *
 * Methods are intentionally minimal and stable. The player only ever needs
 * `getStreamUrl`; `searchTracks` / `getTrack` / `getFeaturedTracks` exist so
 * the approved catalog can be enriched and validated at build/import time.
 */
export abstract class MusicProvider {
  abstract readonly name: string;
  abstract readonly displayName: string;
  /** Human-readable note about THIS provider's gym/public-performance stance. */
  abstract readonly licenseNote: string;
  abstract getTrack(providerTrackId: string): Promise<MusicTrack | null>;
  abstract getStreamUrl(providerTrackId: string): Promise<string>;
  abstract searchTracks(query: string, options?: SearchOptions): Promise<MusicTrack[]>;
  abstract getFeaturedTracks(): Promise<MusicTrack[]>;
}
