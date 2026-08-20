'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import * as SliderPrimitive from '@radix-ui/react-slider';
import {
  Music,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import type { MusicTrack } from '@/lib/music/provider';
import type { AudioPlayerControls, RepeatMode } from './use-audio-player';
import { cn } from '@/lib/utils';

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) seconds = 0;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function Equalizer({ playing }: { playing: boolean }) {
  const reduceMotion = useReducedMotion();
  const rest = [8, 14, 10];
  return (
    <span className="flex h-3.5 items-end gap-[2px]" aria-hidden>
      {rest.map((height, index) => (
        <motion.span
          key={index}
          className="w-[2.5px] rounded-full bg-sky-400"
          animate={playing && !reduceMotion ? { height: [height - 4, height, 6, height + 2, height - 4] } : { height }}
          transition={
            playing && !reduceMotion
              ? { duration: 0.72, repeat: Infinity, delay: index * 0.12, ease: 'easeInOut' }
              : { duration: 0.16 }
          }
        />
      ))}
    </span>
  );
}

function CompactSlider({
  value,
  max,
  step = 1,
  onValueChange,
  onValueCommit,
  ariaLabel,
  ariaValueText,
}: {
  value: number;
  max: number;
  step?: number;
  onValueChange: (value: number) => void;
  onValueCommit?: (value: number) => void;
  ariaLabel: string;
  ariaValueText?: string;
}) {
  return (
    <SliderPrimitive.Root
      value={[value]}
      min={0}
      max={Math.max(max, 0.01)}
      step={step}
      onValueChange={([next]) => onValueChange(next)}
      onValueCommit={onValueCommit ? ([next]) => onValueCommit(next) : undefined}
      aria-label={ariaLabel}
      aria-valuetext={ariaValueText}
      className="relative flex h-4 w-full touch-none select-none items-center"
    >
      <SliderPrimitive.Track className="relative h-[3px] w-full grow overflow-hidden rounded-full bg-zinc-600">
        <SliderPrimitive.Range className="absolute h-full rounded-full bg-sky-400" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb
        className={cn(
          'block h-2.5 w-2.5 rounded-full bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.55)]',
          'border-0 transition-transform duration-150',
          'hover:scale-125 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/80',
          'focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b1220]'
        )}
      />
    </SliderPrimitive.Root>
  );
}

function repeatLabel(repeat: RepeatMode) {
  if (repeat === 'one') return 'Repeat one';
  if (repeat === 'all') return 'Repeat all';
  return 'Repeat off';
}

export function MusicPlayerDock({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? '';
  const liftForGymNav = pathname.startsWith('/gym');

  return (
    <div
      className={cn(
        'pointer-events-auto fixed z-[100] right-4 sm:right-6',
        liftForGymNav ? 'bottom-[calc(5.5rem+20px)] lg:bottom-6' : 'bottom-5 sm:bottom-6'
      )}
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
  const {
    isPlaying,
    currentTime,
    duration,
    hasTracks,
    error,
    isMuted,
    volume,
    shuffle,
    repeat,
  } = controls;
  const canPlay = hasTracks && Boolean(track?.streamUrl);
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const hoverableRef = useRef(false);
  const suppressHoverRef = useRef(false);
  const closeTimerRef = useRef<number | null>(null);
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [artFailed, setArtFailed] = useState(false);
  const [seekPreview, setSeekPreview] = useState<number | null>(null);

  useEffect(() => {
    setArtFailed(false);
  }, [track?.id, track?.artworkUrl]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current != null) window.clearTimeout(closeTimerRef.current);
    };
  }, []);

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

  const clearCloseTimer = () => {
    if (closeTimerRef.current != null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const openFromHover = useCallback(() => {
    clearCloseTimer();
    if (hoverableRef.current && !suppressHoverRef.current) setOpen(true);
  }, []);

  const closeFromHover = useCallback(() => {
    suppressHoverRef.current = false;
    if (!hoverableRef.current) return;
    clearCloseTimer();
    closeTimerRef.current = window.setTimeout(() => setOpen(false), 140);
  }, []);

  const collapse = useCallback(() => {
    suppressHoverRef.current = true;
    clearCloseTimer();
    setOpen(false);
  }, []);

  const displayedTime = seekPreview ?? currentTime;
  const displayedVolume = isMuted ? 0 : volume;
  const RepeatIcon = repeat === 'one' ? Repeat1 : Repeat;

  return (
    <MusicPlayerDock>
      <div
        ref={rootRef}
        className="relative flex flex-col items-end"
        onMouseEnter={openFromHover}
        onMouseLeave={closeFromHover}
      >
        <AnimatePresence>
          {open && (
            <motion.div
              id={panelId}
              role="dialog"
              aria-label="Now playing"
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.96 }}
              animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.96 }}
              transition={{ duration: reduceMotion ? 0.01 : 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="absolute bottom-full right-0 z-10 origin-bottom-right pb-3"
            >
              <div
                className={cn(
                  'w-[min(312px,calc(100vw-2rem))] overflow-hidden rounded-2xl',
                  'border border-sky-400/15 bg-[#0b1220]/95 p-3 backdrop-blur-xl',
                  'shadow-[0_18px_40px_rgba(0,0,0,0.5),0_0_24px_rgba(14,165,233,0.16)]'
                )}
              >
                <div className="flex items-start gap-3">
                  {track?.artworkUrl && !artFailed ? (
                    <img
                      src={track.artworkUrl}
                      alt={`Cover for ${track.title}`}
                      className="h-[54px] w-[54px] flex-shrink-0 rounded-[10px] object-cover"
                      loading="lazy"
                      onError={() => setArtFailed(true)}
                    />
                  ) : (
                    <div className="flex h-[54px] w-[54px] flex-shrink-0 items-center justify-center rounded-[10px] bg-sky-500/10 text-sky-400">
                      <Music className="h-5 w-5" />
                    </div>
                  )}

                  <div className="min-w-0 flex-1 pt-0.5">
                    <p className="truncate text-[13px] font-semibold leading-tight text-white" title={track?.title}>
                      {track?.title || '—'}
                    </p>
                    <p
                      className="mt-1 truncate text-[11px] leading-tight text-zinc-400"
                      title={error || track?.artist}
                    >
                      {error || track?.artist || '—'}
                    </p>
                  </div>

                  <div className="flex flex-shrink-0 flex-col items-end gap-2">
                    <button
                      type="button"
                      aria-label="Collapse player"
                      onClick={collapse}
                      className={cn(
                        'rounded-md p-0.5 text-zinc-400 transition-colors duration-150',
                        'hover:bg-white/10 hover:text-white',
                        'focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/80'
                      )}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                    <Equalizer playing={isPlaying} />
                  </div>
                </div>

                <div className="mt-2.5 flex items-center gap-2">
                  <span className="w-8 text-right text-[10px] tabular-nums text-zinc-500">
                    {formatTime(displayedTime)}
                  </span>
                  <CompactSlider
                    value={displayedTime}
                    max={duration || 1}
                    step={0.1}
                    ariaLabel="Seek track"
                    ariaValueText={`${formatTime(displayedTime)} of ${formatTime(duration)}`}
                    onValueChange={(next) => {
                      setSeekPreview(next);
                      controls.seek(next);
                    }}
                    onValueCommit={() => setSeekPreview(null)}
                  />
                  <span className="w-8 text-[10px] tabular-nums text-zinc-500">{formatTime(duration)}</span>
                </div>

                <div className="mt-2.5 flex items-center justify-between px-3">
                  <button
                    type="button"
                    aria-label={shuffle ? 'Disable shuffle' : 'Enable shuffle'}
                    aria-pressed={shuffle}
                    onClick={controls.toggleShuffle}
                    className={cn(
                      'rounded-md p-1.5 transition-all duration-150 hover:scale-110',
                      shuffle ? 'text-sky-400' : 'text-zinc-400 hover:text-zinc-200',
                      'focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/80'
                    )}
                  >
                    <Shuffle className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Previous track"
                    onClick={controls.prev}
                    disabled={!canPlay}
                    className={cn(
                      'rounded-md p-1.5 text-zinc-100 transition-all duration-150',
                      'hover:scale-110 hover:text-white disabled:opacity-40',
                      'focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/80'
                    )}
                  >
                    <SkipBack className="h-4 w-4" fill="currentColor" />
                  </button>
                  <motion.button
                    type="button"
                    aria-label={isPlaying ? 'Pause music' : 'Play music'}
                    onClick={isPlaying ? controls.pause : controls.play}
                    disabled={!canPlay}
                    className={cn(
                      'flex h-9 w-9 items-center justify-center rounded-full',
                      'bg-sky-400 text-zinc-950 shadow-[0_8px_18px_rgba(56,189,248,0.38)]',
                      'transition-transform duration-150 hover:bg-sky-300 disabled:opacity-40',
                      'focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-200'
                    )}
                    whileHover={reduceMotion ? undefined : { scale: 1.06 }}
                    whileTap={reduceMotion ? undefined : { scale: 0.94 }}
                  >
                    {isPlaying ? (
                      <Pause className="h-4 w-4 fill-current" />
                    ) : (
                      <Play className="h-4 w-4 fill-current translate-x-[1px]" />
                    )}
                  </motion.button>
                  <button
                    type="button"
                    aria-label="Next track"
                    onClick={controls.next}
                    disabled={!canPlay}
                    className={cn(
                      'rounded-md p-1.5 text-zinc-100 transition-all duration-150',
                      'hover:scale-110 hover:text-white disabled:opacity-40',
                      'focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/80'
                    )}
                  >
                    <SkipForward className="h-4 w-4" fill="currentColor" />
                  </button>
                  <button
                    type="button"
                    aria-label={repeatLabel(repeat)}
                    aria-pressed={repeat !== 'off'}
                    onClick={controls.cycleRepeat}
                    className={cn(
                      'rounded-md p-1.5 transition-all duration-150 hover:scale-110',
                      repeat !== 'off' ? 'text-sky-400' : 'text-zinc-400 hover:text-zinc-200',
                      'focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/80'
                    )}
                  >
                    <RepeatIcon className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="mt-2.5 h-px bg-white/10" />

                <div className="mt-2.5 flex items-center gap-2">
                  <button
                    type="button"
                    aria-label={isMuted || volume === 0 ? 'Unmute' : 'Mute'}
                    onClick={controls.toggleMute}
                    className={cn(
                      'rounded-md p-1 text-zinc-300 transition-all duration-150',
                      'hover:scale-110 hover:text-white',
                      'focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/80'
                    )}
                  >
                    {isMuted || volume === 0 ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                  </button>
                  <CompactSlider
                    value={displayedVolume}
                    max={100}
                    ariaLabel="Volume"
                    ariaValueText={`${displayedVolume} percent`}
                    onValueChange={controls.setVolume}
                  />
                  <span className="text-zinc-400" aria-hidden>
                    <Volume2 className="h-3.5 w-3.5" />
                  </span>
                  <span className="min-w-[2.4rem] rounded-full bg-white/10 px-2 py-0.5 text-center text-[10px] tabular-nums text-zinc-300">
                    {displayedVolume}%
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          type="button"
          aria-label={isPlaying ? 'Music player, playing' : 'Open music player'}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={(event) => {
            const keyboardToggle = event.detail === 0;
            if (keyboardToggle || !hoverableRef.current) {
              setOpen((value) => !value);
              return;
            }
            if (!open) setOpen(true);
          }}
          className={cn(
            'relative flex h-[52px] w-[52px] items-center justify-center rounded-full',
            'bg-sky-400 text-zinc-950',
            'shadow-[0_10px_24px_rgba(56,189,248,0.42)]',
            'transition-transform duration-200 hover:scale-105 active:scale-95',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-200 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950'
          )}
        >
          <Music className="h-5 w-5" strokeWidth={2.4} />
        </button>
      </div>
    </MusicPlayerDock>
  );
}
