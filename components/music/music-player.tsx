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
        'pointer-events-auto fixed inset-x-0 top-0 z-[100] flex items-center gap-3',
        'h-16 border-b border-zinc-200 bg-white/95 px-3 dark:border-zinc-800 dark:bg-zinc-900/95',
        'supports-backdrop-blur:bg-white/80 dark:supports-backdrop-blur:bg-zinc-900/80'
      )}
    >
      {/* Artwork + track info */}
      <div className="flex items-center gap-3 overflow-hidden">
        {track?.artworkUrl ? (
          <img
            src={track.artworkUrl}
            alt={`Cover for ${track.title}`}
            className="h-10 w-10 rounded-md object-cover"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-zinc-100 text-zinc-400 dark:bg-zinc-800">
            <Music className="h-5 w-5" />
          </div>
        )}
        <div className="leading-tight">
          <p
            className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate max-w-[140px] sm:max-w-[220px]"
            title={track?.title}
          >
            {track?.title || '—'}
          </p>
          <p
            className="text-xs text-zinc-500 dark:text-zinc-400 truncate max-w-[140px] sm:max-w-[220px]"
            title={track?.artist}
          >
            {track?.artist || '—'}
          </p>
        </div>
      </div>

      {/* Progress + time (desktop) */}
      <div className="hidden md:flex flex-1 items-center gap-2 min-w-0">
        <span className="text-xs tabular-nums text-zinc-500 dark:text-zinc-400 w-10 text-right">
          {formatTime(currentTime)}
        </span>
        <div
          role="slider"
          aria-label="Seek track"
          aria-valuenow={currentTime}
          aria-valuemin={0}
          aria-valuemax={duration || 1}
          aria-valuetext={`${formatTime(currentTime)} of ${formatTime(duration)}`}
          tabIndex={0}
          onClick={(e) => {
            const bar = e.currentTarget;
            const { width } = bar.getBoundingClientRect();
            const rect = bar.getBoundingClientRect();
            const x = (e.clientX - rect.left) / width;
            controls.seek((duration || 0) * Math.max(0, Math.min(1, x)));
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight') controls.seek(currentTime + 5);
            if (e.key === 'ArrowLeft') controls.seek(currentTime - 5);
          }}
          className="relative h-1.5 flex-1 cursor-pointer rounded-full bg-zinc-200 dark:bg-zinc-700"
        >
          <motion.div
            className="h-full rounded-full bg-sky-500"
            style={{ width: `${progress * 100}%` }}
            animate={{ width: `${progress * 100}%` }}
            transition={{ duration: 0.1 }}
          />
        </div>
        <span className="text-xs tabular-nums text-zinc-500 dark:text-zinc-400 w-10">
          {formatTime(duration)}
        </span>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label="Previous track"
          onClick={controls.prev}
          disabled={!canPlay}
          className="rounded-full p-2 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-40 dark:text-zinc-400 dark:hover:bg-zinc-800"
        >
          <SkipBack className="h-4 w-4" />
        </button>
        <motion.button
          type="button"
          aria-label={isPlaying ? 'Pause music' : 'Play music'}
          onClick={isPlaying ? controls.pause : controls.play}
          disabled={!canPlay}
          className="relative flex h-9 w-9 items-center justify-center rounded-full bg-sky-500 text-white hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-40"
          whileTap={{ scale: 0.9 }}
          whileHover={{ scale: 1.05 }}
          transition={{ duration: 0.12 }}
        >
          <AnimatePresence mode="wait" initial={false}>
            {isPlaying ? (
              <motion.span
                key="pause"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.12 }}
              >
                <Pause className="h-4 w-4" />
              </motion.span>
            ) : (
              <motion.span
                key="play"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.12 }}
              >
                {track ? <Play className="h-4 w-4" /> : <Music className="h-4 w-4" />}
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
        <button
          type="button"
          aria-label="Next track"
          onClick={controls.next}
          disabled={!canPlay}
          className="rounded-full p-2 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-40 dark:text-zinc-400 dark:hover:bg-zinc-800"
        >
          <SkipForward className="h-4 w-4" />
        </button>
      </div>

      {/* Mobile: compact time display */}
      <div className="md:hidden text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
        <span>{formatTime(currentTime)}</span>
        <span className="text-zinc-400">{' / '}</span>
        <span>{formatTime(duration)}</span>
      </div>

      {/* Status / error indicator */}
      <AnimatePresence>
        {error ? (
          <motion.span
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 8 }}
            transition={{ duration: 0.15 }}
            className="text-xs text-zinc-500 dark:text-zinc-400"
            title={error}
          >
            {error}
          </motion.span>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
}