'use client';

import { useCallback, useEffect, useId, useRef, useState, type MouseEvent } from 'react';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Music, Pause, Play, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react';
import type { MusicTrack } from '@/lib/music/provider';
import type { AudioPlayerControls } from './use-audio-player';
import { cn } from '@/lib/utils';

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds <= 0) return '—:—';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function Equalizer({ playing }: { playing: boolean }) {
  return (
    <span className="flex h-4 items-end gap-[3px]" aria-hidden>
      {[0, 1, 2].map((index) => (
        <motion.span
          key={index}
          className="w-[3px] rounded-full bg-white"
          animate={playing ? { height: [5, 14, 7, 16, 5] } : { height: 5 }}
          transition={
            playing
              ? { duration: 0.72, repeat: Infinity, delay: index * 0.12, ease: 'easeInOut' }
              : { duration: 0.18 }
          }
        />
      ))}
    </span>
  );
}

export function MusicPlayerDock({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? '';
  const liftForGymNav = pathname.startsWith('/gym');

  return (
    <div
      className={cn(
        'pointer-events-auto fixed z-[100]',
        liftForGymNav ? 'bottom-[calc(5.5rem+24px)] lg:bottom-6' : 'bottom-6'
      )}
      style={{ right: 24 }}
    >
      {children}
    </div>
  );
}

interface MusicPlayerProps {
  track: MusicTrack | null;
  controls: AudioPlayerControls;
}

export function MusicPlayer({ track, controls }: MusicPlayerProps) {
  const { isPlaying, currentTime, duration, progress, hasTracks, error, isMuted } = controls;
  const canPlay = hasTracks && Boolean(track?.streamUrl);
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const hoverableRef = useRef(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(hover: hover) and (pointer: fine)');
    const sync = () => {
      hoverableRef.current = media.matches;
    };
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const seekFromEvent = (e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    controls.seek((duration || 0) * Math.max(0, Math.min(1, x)));
  };

  const openFromHover = useCallback(() => {
    if (hoverableRef.current) setOpen(true);
  }, []);

  const closeFromHover = useCallback(() => {
    if (hoverableRef.current) setOpen(false);
  }, []);

  return (
    <MusicPlayerDock>
      <div
        ref={rootRef}
        className="relative flex flex-col items-end gap-3"
        onMouseEnter={openFromHover}
        onMouseLeave={closeFromHover}
      >
        <AnimatePresence>
          {open && (
            <motion.div
              id={panelId}
              role="dialog"
              aria-label="Now playing"
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.96 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              className={cn(
                'w-[min(20rem,calc(100vw-48px))] overflow-hidden rounded-2xl border border-zinc-200/80',
                'bg-white/95 p-3 shadow-[0_18px_50px_rgba(15,23,42,0.16)] backdrop-blur-md',
                'dark:border-zinc-700/80 dark:bg-zinc-900/95'
              )}
            >
              <div className="flex items-center gap-3">
                {track?.artworkUrl ? (
                  <img
                    src={track.artworkUrl}
                    alt={`Cover for ${track.title}`}
                    className="h-12 w-12 flex-shrink-0 rounded-xl object-cover"
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-500 dark:bg-sky-500/10 dark:text-sky-300">
                    <Music className="h-5 w-5" />
                  </div>
                )}
                <div className="min-w-0 flex-1 leading-tight">
                  <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100" title={track?.title}>
                    {track?.title || '—'}
                  </p>
                  <p
                    className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400"
                    title={error || track?.artist}
                  >
                    {error || track?.artist || '—'}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label={isMuted ? 'Unmute' : 'Mute'}
                  onClick={() => controls.setMuted(!isMuted)}
                  className="rounded-full p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                >
                  {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </button>
              </div>

              <div className="mt-3 flex items-center gap-2">
                <span className="w-8 text-right text-[10px] tabular-nums text-zinc-400">{formatTime(currentTime)}</span>
                <div
                  role="slider"
                  aria-label="Seek track"
                  aria-valuenow={currentTime}
                  aria-valuemin={0}
                  aria-valuemax={duration || 1}
                  tabIndex={0}
                  onClick={seekFromEvent}
                  className="relative h-1.5 flex-1 cursor-pointer rounded-full bg-zinc-200 dark:bg-zinc-700"
                >
                  <div className="h-full rounded-full bg-sky-500" style={{ width: `${progress * 100}%` }} />
                </div>
                <span className="w-8 text-[10px] tabular-nums text-zinc-400">{formatTime(duration)}</span>
              </div>

              <div className="mt-2 flex items-center justify-center gap-1">
                <button
                  type="button"
                  aria-label="Previous track"
                  onClick={controls.prev}
                  disabled={!canPlay}
                  className="rounded-full p-2 text-zinc-600 hover:bg-zinc-100 disabled:opacity-40 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  <SkipBack className="h-4 w-4" />
                </button>
                <motion.button
                  type="button"
                  aria-label={isPlaying ? 'Pause music' : 'Play music'}
                  onClick={isPlaying ? controls.pause : controls.play}
                  disabled={!canPlay}
                  className="mx-1 flex h-10 w-10 items-center justify-center rounded-full bg-sky-500 text-white shadow-[0_8px_18px_rgba(14,165,233,0.35)] hover:bg-sky-400 disabled:opacity-40"
                  whileTap={{ scale: 0.94 }}
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
                  className="rounded-full p-2 text-zinc-600 hover:bg-zinc-100 disabled:opacity-40 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  <SkipForward className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          type="button"
          aria-label={isPlaying ? 'Music player, playing' : 'Music player'}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((value) => !value)}
          className={cn(
            'relative flex h-14 w-14 items-center justify-center rounded-full',
            'bg-gradient-to-br from-sky-400 to-sky-600 text-white',
            'shadow-[0_12px_28px_rgba(14,165,233,0.38)]',
            'ring-4 ring-white dark:ring-zinc-900',
            'transition-transform hover:scale-[1.04] active:scale-95'
          )}
        >
          {isPlaying ? (
            <span className="absolute inset-0 rounded-full bg-sky-400/25 animate-pulse" />
          ) : null}
          <Equalizer playing={isPlaying} />
        </button>
      </div>
    </MusicPlayerDock>
  );
}
