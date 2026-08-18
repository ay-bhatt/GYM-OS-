/**
 * Server-side music configuration.
 *
 * These values are read from environment variables and used ONLY by server-side
 * code (API route handlers + the provider). They are intentionally NOT prefixed
 * with `NEXT_PUBLIC_` so provider credentials never reach the browser bundle.
 */

export const AUDIUS_API_BASE = 'https://api.audius.co';

/**
 * Which provider the MusicService should instantiate.
 * - 'audius' -> AudiusMusicProvider (default)
 * - Add more providers and switch here without touching the UI.
 */
export const MUSIC_PROVIDER = process.env.MUSIC_PROVIDER || 'pixabay';

/** Free key from https://pixabay.com/api/docs/ — also unlocks /api/audio/. */
export const PIXABAY_API_KEY = process.env.PIXABAY_API_KEY || '';
export const PIXABAY_AUDIO_API = 'https://pixabay.com/api/audio/';

/**
 * Optional Audius API key (free tier). Audius streaming endpoints do not require
 * a key, but attaching one when present improves rate-limit headroom. It is kept
 * server-side only and never sent to the browser.
 */
export const AUDIUS_API_KEY = process.env.AUDIUS_API_KEY || '';
