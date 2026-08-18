'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, SkipBack, SkipForward, Music } from 'lucide-react';
import type { MusicTrack } from '@/lib/music/provider';
import type { AudioPlayerControls } from './use-audio-player';
import { cn } from '@/lib/utils';

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds <= 0) return '—:—';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

interface MusicPlayerProps {
  track: MusicTrack | null;
  controls: AudioPlayerControls;
}

export function MusicPlayer({ track, controls }: MusicPlayerProps) {
  const { isPlaying, currentTime, duration, progress, hasTracks, error } = controls;
  const canPlay = hasTracks && !error;

  return (
    <motion.div
      initial={{ y: -40 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 320, damping: 28 }}
      className={cn(
        'pointer-events-auto fixed inset-x-0 top-0 z-[100] flex items-center gap-2',
        'h-14 border-b border-zinc-200 bg-white/95 px-2 sm:h-16 sm:gap-3 sm:px-3',
        'dark:border-zinc-800 dark:bg-zinc-900/95'
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
        {track?.artworkUrl ? (
          <img
            src={track.artworkUrl}
            alt={`Cover for ${track.title}`}
            className="h-8 w-8 flex-shrink-0 rounded-md object-cover sm:h-10 sm:w-10"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-zinc-100 text-zinc-400 sm:h-10 sm:w-10 dark:bg-zinc-800">
            <Music className="h-4 w-4" />
          </div>
        )}
        <div className="min-w-0 leading-tight">
          <p className="truncate text-xs font-medium text-zinc-900 sm:text-sm dark:text-zinc-100" title={track?.title}>
            {track?.title || '—'}
          </p>
          <p className="truncate text-[11px] text-zinc-500 sm:text-xs dark:text-zinc-400" title={track?.artist}>
            {track?.artist || '—'}
          </p>
        </div>
      </div>

      <div className="hidden min-w-0 flex-1 items-center gap-2 md:flex">
        <span className="w-10 text-right text-xs tabular-nums text-zinc-500">{formatTime(currentTime)}</span>
        <div
          role="slider"
          aria-label="Seek track"
          aria-valuenow={currentTime}
          aria-valuemin={0}
          aria-valuemax={duration || 1}
          tabIndex={0}
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width;
            controls.seek((duration || 0) * Math.max(0, Math.min(1, x)));
          }}
          className="relative h-1.5 flex-1 cursor-pointer rounded-full bg-zinc-200 dark:bg-zinc-700"
        >
          <div className="h-full rounded-full bg-sky-500" style={{ width: `${progress * 100}%` }} />
        </div>
        <span className="w-10 text-xs tabular-nums text-zinc-500">{formatTime(duration)}</span>
      </div>

      <div className="flex flex-shrink-0 items-center">
        <button
          type="button"
          aria-label="Previous track"
          onClick={controls.prev}
          disabled={!canPlay}
          className="rounded-full p-1.5 text-zinc-600 hover:bg-zinc-100 disabled:opacity-40 sm:p-2"
        >
          <SkipBack className="h-4 w-4" />
        </button>
        <motion.button
          type="button"
          aria-label={isPlaying ? 'Pause music' : 'Play music'}
          onClick={isPlaying ? controls.pause : controls.play}
          disabled={!canPlay}
          className="mx-0.5 flex h-9 w-9 items-center justify-center rounded-full bg-sky-500 text-white hover:bg-sky-400 disabled:opacity-40"
          whileTap={{ scale: 0.9 }}
        >
          <AnimatePresence mode="wait" initial={false}>
            {isPlaying ? (
              <motion.span key="pause" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Pause className="h-4 w-4" />
              </motion.span>
            ) : (
              <motion.span key="play" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Play className="h-4 w-4" />
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
        <button
          type="button"
          aria-label="Next track"
          onClick={controls.next}
          disabled={!canPlay}
          className="rounded-full p-1.5 text-zinc-600 hover:bg-zinc-100 disabled:opacity-40 sm:p-2"
        >
          <SkipForward className="h-4 w-4" />
        </button>
      </div>
    </motion.div>
  );
}
