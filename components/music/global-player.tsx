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

const CACHE_KEY = 'forggym-music-catalog-top1000-v1';
const CACHE_TTL_MS = 30 * 60 * 1000;
const PLAYER_TRACK_LIMIT = 1000;
const AUDIUS_STREAM = 'https://api.audius.co/v1/tracks';

function directStreamUrl(track: MusicTrack): MusicTrack {
  const url = track.streamUrl || '';
  if (track.provider === 'pixabay') {
    if (url.startsWith('/api/music/stream/')) return track;
    return { ...track, streamUrl: `/api/music/stream/${encodeURIComponent(track.id)}` };
  }
  if (/^https?:\/\//i.test(url) && !url.includes('/api/music/stream/')) return track;
  if (track.provider === 'audius' && track.providerTrackId) {
    return {
      ...track,
      streamUrl: `${AUDIUS_STREAM}/${encodeURIComponent(track.providerTrackId)}/stream?app_name=forggym`,
    };
  }
  return track;
}

function limitTracks(tracks: MusicTrack[]): MusicTrack[] {
  const normalized = tracks.map(directStreamUrl);
  if (normalized.length <= PLAYER_TRACK_LIMIT) return normalized;
  return normalized.slice(0, PLAYER_TRACK_LIMIT);
}

function sameTrackIds(left: MusicTrack[], right: MusicTrack[]) {
  if (left.length !== right.length) return false;
  return left.every((track, index) => track.id === right[index].id && track.streamUrl === right[index].streamUrl);
}

function mergePlayerTracks(prev: MusicTrack[], fresh: MusicTrack[]): MusicTrack[] {
  const next = limitTracks(fresh);
  if (!prev.length) return next;
  const ids = new Set(next.map((track) => track.id));
  const keepPlaying = prev.filter((track) => !ids.has(track.id));
  if (!keepPlaying.length) return next;
  return [...keepPlaying, ...next].slice(0, PLAYER_TRACK_LIMIT + keepPlaying.length);
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
          setTracks((prev) => {
            const merged = mergePlayerTracks(prev, fresh);
            try {
              localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), tracks: merged }));
            } catch {
              /* ignore storage errors */
            }
            return sameTrackIds(prev, merged) ? prev : merged;
          });
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
