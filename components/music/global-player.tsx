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
import { Music } from 'lucide-react';
import { useAudioPlayer } from './use-audio-player';
import { MusicPlayer, MusicPlayerDock } from './music-player';
import type { MusicTrack } from '@/lib/music/provider';

const CACHE_KEY = 'forggym-music-catalog';
const CACHE_TTL_MS = 2 * 60 * 1000;
const PLAYER_TRACK_LIMIT = 400;

function limitTracks(tracks: MusicTrack[]): MusicTrack[] {
  if (tracks.length <= PLAYER_TRACK_LIMIT) return tracks;
  return tracks.slice(0, PLAYER_TRACK_LIMIT);
}

export function GlobalPlayer() {
  const [mounted, setMounted] = useState(false);
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setMounted(true);

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
    if (cached && cached.length) setTracks(limitTracks(cached));

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
          setTracks(limitTracks(fresh));
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

  const controls = useAudioPlayer(tracks);
  const current = controls.current;

  if (!mounted) return null;

  if (!tracks.length) {
    if (loading) return <MusicStatusButton pulse />;
    return <MusicStatusButton />;
  }

  return <MusicPlayer track={current} controls={controls} />;
}

function MusicStatusButton({ pulse = false }: { pulse?: boolean }) {
  return (
    <MusicPlayerDock>
      <div
        className={`relative flex h-[52px] w-[52px] items-center justify-center rounded-full bg-sky-400 text-zinc-950 shadow-[0_10px_24px_rgba(56,189,248,0.42)] ${
          pulse ? 'animate-pulse' : 'opacity-80'
        }`}
        title={pulse ? 'Loading music' : 'Music unavailable'}
      >
        <Music className="h-5 w-5" strokeWidth={2.4} />
      </div>
    </MusicPlayerDock>
  );
}
