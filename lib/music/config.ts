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
export const MUSIC_PROVIDER = process.env.MUSIC_PROVIDER || 'audius';

/**
 * Optional Audius API key (free tier). Audius streaming endpoints do not require
 * a key, but attaching one when present improves rate-limit headroom. It is kept
 * server-side only and never sent to the browser.
 */
export const AUDIUS_API_KEY = process.env.AUDIUS_API_KEY || '';
