/**
 * ForgeGym — Global Gym Music Player: catalog constants + fallback catalog.
 *
 * The fallback catalog (`FALLBACK_CATALOG`) is a small, hand-verified set of
 * CC0 / CC-BY tracks used only when Supabase is unavailable (e.g. local dev
 * without a migrated DB). In production the source of truth is the
 * `music_tracks` table, populated from `scripts/music/catalog/music_catalog.json`
 * via `npm run import:music`.
 *
 * The player NEVER loads audio here — only lightweight metadata. Audio streams
 * directly from each provider's CDN.
 */

import type { MusicCategory, PlaylistMode, EnergyLevel, MusicTrack } from './provider';

export interface MusicCategoryDef {
  value: MusicCategory;
  label: string;
  icon: string;
}

export const MUSIC_CATEGORIES: MusicCategoryDef[] = [
  { value: 'warm_up', label: 'Warm Up', icon: '☕' },
  { value: 'workout', label: 'Workout', icon: '🔥' },
  { value: 'high_energy', label: 'High Energy', icon: '⚡' },
  { value: 'cardio', label: 'Cardio', icon: '🏃' },
  { value: 'strength', label: 'Strength', icon: '💪' },
  { value: 'cool_down', label: 'Cool Down', icon: '🧘' },
];

export interface PlaylistModeDef {
  value: PlaylistMode;
  label: string;
  icon: string;
  /** Energy band this mode biases toward (1-5). */
  energyBias: number;
  /** "indian" | "global" | "mixed" cultural balance intent. */
  culture: 'indian' | 'global' | 'mixed';
  description: string;
}

export const PLAYLIST_MODES: PlaylistModeDef[] = [
  { value: 'warm_up', label: 'Warm Up', icon: '☕', energyBias: 2, culture: 'mixed', description: 'Low-to-moderate energy to ease in.' },
  { value: 'workout', label: 'Workout', icon: '🔥', energyBias: 3, culture: 'mixed', description: 'Balanced, varied workout energy.' },
  { value: 'high_energy', label: 'High Energy', icon: '⚡', energyBias: 5, culture: 'mixed', description: 'Peak energy throughout.' },
  { value: 'cardio', label: 'Cardio', icon: '🏃', energyBias: 4, culture: 'mixed', description: 'Driving rhythm for running & cycling.' },
  { value: 'strength', label: 'Strength', icon: '💪', energyBias: 3, culture: 'mixed', description: 'Steady, punchy grooves for lifting.' },
  { value: 'indian_energy', label: 'Indian Energy', icon: '🎶', energyBias: 4, culture: 'indian', description: 'Desi electronic, fusion & Bollywood-inspired instrumentals.' },
  { value: 'global_energy', label: 'Global Energy', icon: '🌍', energyBias: 3, culture: 'global', description: 'Non-Indian international hits and instrumentals.' },
  { value: 'cool_down', label: 'Cool Down', icon: '🧘', energyBias: 1, culture: 'mixed', description: 'Calm, recovery-friendly finishes.' },
];

export const ENERGY_LEVELS: { level: EnergyLevel; label: string; description: string }[] = [
  { level: 1, label: 'Calm', description: 'Warm-up / Cool-down (<90 BPM)' },
  { level: 2, label: 'Warm-up', description: 'Gentle build (~90-100 BPM)' },
  { level: 3, label: 'Moderate', description: 'Steady workout (90-110 BPM)' },
  { level: 4, label: 'Energetic', description: 'High-drive workout (110-145 BPM)' },
  { level: 5, label: 'High Energy', description: 'Intense (145+ BPM)' },
];

/** Languages tracked in the catalog (requirement 16). */
export const SUPPORTED_LANGUAGES = [
  'English', 'Hindi', 'Punjabi', 'Tamil', 'Telugu', 'Malayalam', 'Kannada',
  'Bengali', 'Marathi', 'Instrumental', 'Other',
] as const;

/** Primary gym-fitness regions for cultural balancing. */
export const GYM_REGIONS = ['IN', 'US', 'GB', 'CA', 'AU', 'DE', 'SE', 'BR', 'MX', 'GLOBAL'] as const;

export const DEFAULT_CATEGORY: MusicCategory = 'workout';
export const DEFAULT_PLAYLIST_MODE: PlaylistMode = 'workout';

/** Default target queue size (requirement 13: prefer 200-300 per session). */
export const DEFAULT_QUEUE_TARGET = 250;
/** Maximum tracks kept in the per-session history (requirement 29). */
export const MAX_HISTORY = 200;
/** Minimum queue length before a new block must be generated. */
export const MIN_QUEUE_HEADROOM = 50;

/** Small verified fallback used when the DB is unreachable. */
export const FALLBACK_CATALOG: MusicTrack[] = [
  {
    id: 'fallback-001',
    provider: 'audius',
    providerTrackId: 'KxKMl',
    title: "Gunky's Uprising",
    artist: 'Justin Blau (3LAU)',
    album: null, genre: 'Electronic', subGenre: null, countryOrRegion: 'US',
    language: 'English', energyLevel: 5, bpm: null, duration: 178,
    artworkUrl: null,
    streamUrl: 'https://api.audius.co/v1/tracks/KxKMl/stream',
    sourceUrl: null, providerTrackUrl: 'https://api.audius.co/v1/tracks/KxKMl',
    source: 'Audius', licenseName: 'Original Work', licenseUrl: null,
    commercialUseAllowed: true, publicPerformanceAllowed: true,
    attributionRequired: false, attributionText: null,
    verificationDate: null, verificationNotes: null,
    isExplicit: false, category: 'high_energy', status: 'active',
        createdAt: null, updatedAt: null,
  },
  {
    id: 'fallback-002',
    provider: 'audius',
    providerTrackId: 'G0wyE',
    title: 'Kliptown Empyrean',
    artist: 'Skrillex',
    album: null, genre: 'Electronic', subGenre: null, countryOrRegion: 'US',
    language: 'English', energyLevel: 5, bpm: null, duration: 226,
    artworkUrl: null,
    streamUrl: 'https://api.audius.co/v1/tracks/G0wyE/stream',
    sourceUrl: null, providerTrackUrl: 'https://api.audius.co/v1/tracks/G0wyE',
    source: 'Audius', licenseName: 'Original Work', licenseUrl: null,
    commercialUseAllowed: true, publicPerformanceAllowed: true,
    attributionRequired: false, attributionText: null,
    verificationDate: null, verificationNotes: null,
    isExplicit: false, category: 'high_energy', status: 'active',
    createdAt: null, updatedAt: null,
  },
  {
    id: 'fallback-003',
    provider: 'audius',
    providerTrackId: '8YJKW',
    title: 'Real ft. Harrison $FIRST',
    artist: 'LA EQUIS',
    album: null, genre: 'Latin', subGenre: null, countryOrRegion: 'US',
    language: 'Spanish', energyLevel: 4, bpm: null, duration: 210,
    artworkUrl: null,
    streamUrl: 'https://api.audius.co/v1/tracks/8YJKW/stream',
    sourceUrl: null, providerTrackUrl: 'https://api.audius.co/v1/tracks/8YJKW',
    source: 'Audius', licenseName: 'Original Work', licenseUrl: null,
    commercialUseAllowed: true, publicPerformanceAllowed: true,
    attributionRequired: false, attributionText: null,
    verificationDate: null, verificationNotes: null,
    isExplicit: false, category: 'workout', status: 'active',
    createdAt: null, updatedAt: null,
  },
  {
    id: 'fallback-004',
    provider: 'audius',
    providerTrackId: 'rEdqpyZ',
    title: 'Arachnids [Extended Mix]',
    artist: 'Disclosure',
    album: null, genre: 'Electronic', subGenre: null, countryOrRegion: 'GB',
    language: 'English', energyLevel: 4, bpm: null, duration: 320,
    artworkUrl: null,
    streamUrl: 'https://api.audius.co/v1/tracks/rEdqpyZ/stream',
    sourceUrl: null, providerTrackUrl: 'https://api.audius.co/v1/tracks/rEdqpyZ',
    source: 'Audius', licenseName: 'Original Work', licenseUrl: null,
    commercialUseAllowed: true, publicPerformanceAllowed: true,
    attributionRequired: false, attributionText: null,
    verificationDate: null, verificationNotes: null,
    isExplicit: false, category: 'strength', status: 'active',
    createdAt: null, updatedAt: null,
  },
  {
    id: 'fallback-005',
    provider: 'audius',
    providerTrackId: 'AVOzK',
    title: 'Plus 1 Ft. Nasty C [prod by Twin Plams]',
    artist: '24HRS',
    album: null, genre: 'Tropical House', subGenre: null, countryOrRegion: 'US',
    language: 'English', energyLevel: 2, bpm: null, duration: 190,
    artworkUrl: null,
    streamUrl: 'https://api.audius.co/v1/tracks/AVOzK/stream',
    sourceUrl: null, providerTrackUrl: 'https://api.audius.co/v1/tracks/AVOzK',
    source: 'Audius', licenseName: 'Original Work', licenseUrl: null,
    commercialUseAllowed: true, publicPerformanceAllowed: true,
    attributionRequired: false, attributionText: null,
    verificationDate: null, verificationNotes: null,
    isExplicit: false, category: 'cool_down', status: 'active',
        createdAt: null, updatedAt: null,
  },
];

export function categoryToMode(category: MusicCategory): PlaylistMode {
  if (category === 'warm_up') return 'warm_up';
  if (category === 'cool_down') return 'cool_down';
  if (category === 'high_energy') return 'high_energy';
  if (category === 'cardio') return 'cardio';
  if (category === 'strength') return 'strength';
  return 'workout';
}

/** Whether a track is gym-safe: active + non-explicit + commercial-use allowed. */
export function isTrackGymSafe(t: MusicTrack): boolean {
  if (t.status !== 'active') return false;
  if (t.isExplicit) return false;
  if (t.commercialUseAllowed !== true) return false;
  if (t.publicPerformanceAllowed !== true) return false;
  return true;
}
