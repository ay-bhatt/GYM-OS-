'use client';

/**
 * GlobalPlayer — the persistent, global gym music player.
 *
 * Mounted once in the root layout (`<html>/<body>`), so it survives every
 * client-side navigation (login -> dashboard -> super-admin). That is what keeps
 * playback continuous across route changes and makes the same `<audio>` instance
 * serve every page.
 *
 * Data flow:
 *   1. On mount (client-only), read the last-known catalog from localStorage for
 *      an instant first render, then fetch fresh from /api/music/tracks.
 *   2. Feed the catalog into `useAudioPlayer`, which owns the HTML5 Audio object
 *      and all playback state (local to this browser).
 *   3. Render <MusicPlayer> with the current track + controls.
 *
 * SSR-safety: the server renders nothing for this component; the player appears
 * after hydration. This avoids any window/localStorage access during SSR and
 * guarantees zero hydration mismatch.
 */

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Music } from 'lucide-react';
import { useAudioPlayer } from './use-audio-player';
import { MusicPlayer } from './music-player';
import type { MusicTrack } from '@/lib/music/provider';

const CACHE_KEY = 'forggym-music-catalog';
const CACHE_TTL_MS = 2 * 60 * 1000;

export function GlobalPlayer() {
  const [mounted, setMounted] = useState(false);
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setMounted(true);

    // 1) Instant paint from cache (if fresh).
    let cached: MusicTrack[] | null = null;
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.ts && Date.now() - parsed.ts < CACHE_TTL_MS) {
          cached = (parsed.tracks || []) as MusicTrack[];
        }
      }
    } catch {
      /* ignore corrupt cache */
    }
    if (cached && cached.length) setTracks(cached);

    let cancelled = false;
    const load = () => {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 15000);
      return fetch('/api/music/tracks', { signal: controller.signal })
        .then(async (res) => {
          if (!res.ok) return [];
          const json: { data?: MusicTrack[] } = await res.json().catch(() => ({ data: [] }));
          return json.data || [];
        })
        .then((fresh) => {
          if (cancelled || !fresh.length) return;
          setTracks(fresh);
          try {
            localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), tracks: fresh }));
          } catch {
            /* ignore storage errors */
          }
        })
        .catch(() => {
          // Keep whatever we had (cache or empty).
        })
        .finally(() => {
          window.clearTimeout(timeout);
          if (!cancelled) setLoading(false);
        });
    };

    load();
    const refresh = window.setInterval(load, 15 * 60 * 1000);
    return () => {
      cancelled = true;
      window.clearInterval(refresh);
    };
  }, []);

  // The hook owns the audio element + playback state. It is stable across
  // navigation because GlobalPlayer itself does not unmount.
  const controls = useAudioPlayer(tracks);
  const current = controls.current;

  if (!mounted) return null;

  if (!tracks.length) {
    if (loading) return <MusicLoadingBar />;
    return <MusicUnavailableBar />;
  }

  return <MusicPlayer track={current} controls={controls} />;
}

/** Compact skeleton shown while the catalog is loading for the first time. */
function MusicLoadingBar() {
  return (
    <motion.div
      initial={{ y: -40 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 320, damping: 28 }}
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-16 border-b border-zinc-200 bg-white/95 dark:border-zinc-800 dark:bg-zinc-900/95"
    >
      <div className="flex h-full items-center gap-3 px-3">
        <div className="h-10 w-10 rounded-md bg-zinc-200 dark:bg-zinc-700 animate-pulse" />
        <div className="flex flex-col gap-1.5">
          <div className="h-3.5 w-28 rounded bg-zinc-200 dark:bg-zinc-700 animate-pulse" />
          <div className="h-3 w-20 rounded bg-zinc-200 dark:bg-zinc-700 animate-pulse" />
        </div>
      </div>
    </motion.div>
  );
}

/** Fallback bar shown when there is no catalog (e.g. API unreachable). */
function MusicUnavailableBar() {
  return (
    <motion.div
      initial={{ y: -40 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 320, damping: 28 }}
      className="pointer-events-auto fixed inset-x-0 top-0 z-[100] h-16 border-b border-zinc-200 bg-white/95 dark:border-zinc-800 dark:bg-zinc-900/95"
    >
      <div className="flex h-full items-center gap-3 px-3">
        <Music className="h-5 w-5 text-zinc-400" />
        <span className="text-sm text-zinc-500 dark:text-zinc-400">Music unavailable</span>
      </div>
    </motion.div>
  );
}
