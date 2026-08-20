'use client';

/**
 * useAudioPlayer - weighted-shuffle HTML5 Audio controller.
 * Playback STATE is local to this browser. History in localStorage.
 * After the user taps Play, tracks continue automatically.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import type { MusicTrack } from '@/lib/music/provider';
import { ShuffleEngine, deserializeState, serializeState } from '@/lib/music/shuffle';

const STORAGE_KEY = 'forggym-music-position';
const HISTORY_KEY = 'forggym_music_history_v2';
const SETTINGS_KEY = 'forggym-music-settings';
const MAX_FAILURES = 6;
const DEFAULT_VOLUME = 70;

export type RepeatMode = 'off' | 'all' | 'one';

export interface AudioPlayerControls {
  current: MusicTrack | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  progress: number;
  hasTracks: boolean;
  isMuted: boolean;
  volume: number;
  shuffle: boolean;
  repeat: RepeatMode;
  error: string | null;
  play: () => Promise<void>;
  pause: () => void;
  next: () => void;
  prev: () => void;
  seek: (seconds: number) => void;
  setMuted: (muted: boolean) => void;
  toggleMute: () => void;
  setVolume: (volume: number) => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
}

type PlayerSettings = {
  volume: number;
  muted: boolean;
  shuffle: boolean;
  repeat: RepeatMode;
};

function clampVolume(value: number) {
  if (!Number.isFinite(value)) return DEFAULT_VOLUME;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function readSettings(): PlayerSettings {
  if (typeof window === 'undefined') {
    return { volume: DEFAULT_VOLUME, muted: false, shuffle: true, repeat: 'all' };
  }
  try {
    const parsed = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') as Partial<PlayerSettings>;
    const repeat = parsed.repeat === 'off' || parsed.repeat === 'one' || parsed.repeat === 'all' ? parsed.repeat : 'all';
    return {
      volume: clampVolume(typeof parsed.volume === 'number' ? parsed.volume : DEFAULT_VOLUME),
      muted: Boolean(parsed.muted),
      shuffle: parsed.shuffle !== false,
      repeat,
    };
  } catch {
    return { volume: DEFAULT_VOLUME, muted: false, shuffle: true, repeat: 'all' };
  }
}

function writeSettings(settings: PlayerSettings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    /* ignore */
  }
}

function sameSrc(audio: HTMLAudioElement, url: string) {
  if (!url) return false;
  try {
    return audio.src === new URL(url, window.location.origin).href;
  } catch {
    return audio.src === url;
  }
}

export function useAudioPlayer(tracks: MusicTrack[]): AudioPlayerControls {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolumeState] = useState(DEFAULT_VOLUME);
  const [shuffle, setShuffle] = useState(true);
  const [repeat, setRepeat] = useState<RepeatMode>('all');
  const [tick, setTick] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const failureCountRef = useRef(0);
  const wantPlayingRef = useRef(false);
  const tracksRef = useRef(tracks);
  tracksRef.current = tracks;
  const engineRef = useRef<ShuffleEngine | null>(null);
  const sequentialIndexRef = useRef(0);
  const lastUnmutedVolumeRef = useRef(DEFAULT_VOLUME);
  const shuffleRef = useRef(shuffle);
  const repeatRef = useRef(repeat);
  const mutedRef = useRef(isMuted);
  const volumeRef = useRef(volume);
  shuffleRef.current = shuffle;
  repeatRef.current = repeat;
  mutedRef.current = isMuted;
  volumeRef.current = volume;

  const persistSettings = useCallback((patch: Partial<PlayerSettings> = {}) => {
    writeSettings({
      volume: volumeRef.current,
      muted: mutedRef.current,
      shuffle: shuffleRef.current,
      repeat: repeatRef.current,
      ...patch,
    });
  }, []);

  const applyAudioGain = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = volumeRef.current / 100;
    audio.muted = mutedRef.current || volumeRef.current === 0;
    audio.loop = repeatRef.current === 'one';
  }, []);

  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'auto';
    audio.setAttribute('playsinline', 'true');
    audioRef.current = audio;
    applyAudioGain();

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onDurationChange = () => setDuration(isFinite(audio.duration) ? audio.duration : 0);
    const handleEnded = () => {
      failureCountRef.current = 0;
      if (repeatRef.current === 'one') {
        audio.currentTime = 0;
        if (wantPlayingRef.current) void audio.play().catch(() => setIsPlaying(false));
        return;
      }

      const list = tracksRef.current;
      if (!shuffleRef.current) {
        const nextIndex = sequentialIndexRef.current + 1;
        if (nextIndex < list.length) {
          sequentialIndexRef.current = nextIndex;
        } else if (repeatRef.current === 'all' && list.length) {
          sequentialIndexRef.current = 0;
        } else {
          wantPlayingRef.current = false;
          setIsPlaying(false);
          return;
        }
        setTick((value) => value + 1);
        return;
      }

      const engine = engineRef.current;
      if (!engine) return;
      if (!engine.hasNext() && repeatRef.current === 'off') {
        wantPlayingRef.current = false;
        setIsPlaying(false);
        return;
      }
      engine.advance();
      setTick((value) => value + 1);
    };
    const handleError = () => {
      failureCountRef.current += 1;
      if (tracksRef.current.length <= 1) {
        setError('Track failed to play');
        setIsPlaying(false);
        return;
      }
      if (failureCountRef.current > MAX_FAILURES) {
        setError('Skipping unplayable tracks');
        failureCountRef.current = 0;
      }
      if (shuffleRef.current) {
        engineRef.current?.advance();
      } else if (tracksRef.current.length) {
        sequentialIndexRef.current = (sequentialIndexRef.current + 1) % tracksRef.current.length;
      }
      setTick((value) => value + 1);
    };
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => {
      if (!wantPlayingRef.current) setIsPlaying(false);
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('durationchange', onDurationChange);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    return () => {
      audio.pause();
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('durationchange', onDurationChange);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audioRef.current = null;
    };
  }, [applyAudioGain]);

  useEffect(() => {
    const settings = readSettings();
    volumeRef.current = settings.volume;
    mutedRef.current = settings.muted;
    shuffleRef.current = settings.shuffle;
    repeatRef.current = settings.repeat;
    lastUnmutedVolumeRef.current = settings.volume > 0 ? settings.volume : DEFAULT_VOLUME;
    setVolumeState(settings.volume);
    setIsMuted(settings.muted);
    setShuffle(settings.shuffle);
    setRepeat(settings.repeat);
    applyAudioGain();
  }, [applyAudioGain]);

  useEffect(() => {
    applyAudioGain();
  }, [applyAudioGain, volume, isMuted, repeat]);

  useEffect(() => {
    if (!tracks.length) {
      engineRef.current = null;
      sequentialIndexRef.current = 0;
      return;
    }
    let history: string[] = [];
    if (typeof window !== 'undefined') {
      try {
        history = deserializeState(localStorage.getItem(HISTORY_KEY) || '{}').history;
      } catch {
        history = [];
      }
    }
    const currentId =
      engineRef.current?.current?.id ?? tracks[sequentialIndexRef.current]?.id ?? null;
    const currentIndex = currentId ? tracks.findIndex((track) => track.id === currentId) : 0;
    sequentialIndexRef.current = currentIndex >= 0 ? currentIndex : 0;

    if (!engineRef.current) {
      engineRef.current = new ShuffleEngine(tracks, { history });
      setTick((value) => value + 1);
      return;
    }
    engineRef.current.setTracks(tracks);
    setTick((value) => value + 1);
  }, [tracks]);

  useEffect(() => {
    if (!engineRef.current || typeof window === 'undefined') return;
    try {
      localStorage.setItem(HISTORY_KEY, serializeState(engineRef.current.getState()));
    } catch {
      /* ignore */
    }
  }, [tick]);

  const current = shuffle
    ? engineRef.current?.current ?? tracks[0] ?? null
    : tracks[sequentialIndexRef.current] ?? tracks[0] ?? null;
  const hasTracks = tracks.length > 0;
  const progress = duration > 0 ? currentTime / duration : 0;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !current?.streamUrl) return;
    if (sameSrc(audio, current.streamUrl)) {
      applyAudioGain();
      if (wantPlayingRef.current && audio.paused) {
        void audio.play().catch(() => setIsPlaying(false));
      }
      return;
    }

    audio.src = current.streamUrl;
    audio.load();
    applyAudioGain();
    setCurrentTime(0);
    setDuration(0);
    setError(null);

    if (wantPlayingRef.current) {
      void audio
        .play()
        .then(() => {
          setIsPlaying(true);
          failureCountRef.current = 0;
        })
        .catch(() => {
          setIsPlaying(false);
        });
    }
  }, [applyAudioGain, tick, current]);

  const play = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio || !current?.streamUrl) {
      setError('Music unavailable');
      return;
    }
    if (!sameSrc(audio, current.streamUrl)) {
      audio.src = current.streamUrl;
      audio.load();
    }
    wantPlayingRef.current = true;
    setError(null);
    applyAudioGain();
    try {
      await audio.play();
      setIsPlaying(true);
      failureCountRef.current = 0;
    } catch (err) {
      const name = err instanceof Error ? err.name : '';
      if (name === 'NotAllowedError') {
        wantPlayingRef.current = false;
        setIsPlaying(false);
        return;
      }
      setIsPlaying(false);
      if (tracksRef.current.length > 1) {
        if (shuffleRef.current) engineRef.current?.advance();
        else sequentialIndexRef.current = (sequentialIndexRef.current + 1) % tracksRef.current.length;
        setTick((value) => value + 1);
      } else {
        setError('Track failed to play');
      }
    }
  }, [applyAudioGain, current]);

  const pause = useCallback(() => {
    wantPlayingRef.current = false;
    audioRef.current?.pause();
    setIsPlaying(false);
  }, []);

  const seek = useCallback((seconds: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = seconds;
      setCurrentTime(seconds);
    }
  }, []);

  const persistCurrent = () => {
    const track = shuffleRef.current
      ? engineRef.current?.current
      : tracksRef.current[sequentialIndexRef.current];
    if (typeof window === 'undefined' || !track) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ currentTrackId: track.providerTrackId }));
    } catch {
      /* ignore */
    }
  };

  const next = useCallback(() => {
    if (!hasTracks) return;
    if (!shuffleRef.current) {
      const list = tracksRef.current;
      if (!list.length) return;
      sequentialIndexRef.current = (sequentialIndexRef.current + 1) % list.length;
    } else {
      engineRef.current?.advance();
    }
    persistCurrent();
    setTick((value) => value + 1);
  }, [hasTracks]);

  const prev = useCallback(() => {
    if (!hasTracks) return;
    const audio = audioRef.current;
    if (audio && audio.currentTime > 2) {
      audio.currentTime = 0;
      setCurrentTime(0);
      return;
    }
    if (!shuffleRef.current) {
      const list = tracksRef.current;
      if (!list.length) return;
      sequentialIndexRef.current = (sequentialIndexRef.current - 1 + list.length) % list.length;
    } else {
      engineRef.current?.previous();
    }
    persistCurrent();
    setTick((value) => value + 1);
  }, [hasTracks]);

  const setMuted = useCallback((muted: boolean) => {
    if (!muted && volumeRef.current === 0) {
      const restored = lastUnmutedVolumeRef.current || DEFAULT_VOLUME;
      volumeRef.current = restored;
      setVolumeState(restored);
    }
    mutedRef.current = muted;
    setIsMuted(muted);
    applyAudioGain();
    persistSettings({ muted, volume: volumeRef.current });
  }, [applyAudioGain, persistSettings]);

  const toggleMute = useCallback(() => {
    setMuted(!mutedRef.current);
  }, [setMuted]);

  const setVolume = useCallback((value: number) => {
    const next = clampVolume(value);
    volumeRef.current = next;
    setVolumeState(next);
    if (next > 0) {
      lastUnmutedVolumeRef.current = next;
      mutedRef.current = false;
      setIsMuted(false);
    } else {
      mutedRef.current = true;
      setIsMuted(true);
    }
    applyAudioGain();
    persistSettings({ volume: next, muted: mutedRef.current });
  }, [applyAudioGain, persistSettings]);

  const toggleShuffle = useCallback(() => {
    const next = !shuffleRef.current;
    shuffleRef.current = next;
    setShuffle(next);
    const currentTrack = current;
    if (!next && currentTrack) {
      const index = tracksRef.current.findIndex((track) => track.id === currentTrack.id);
      sequentialIndexRef.current = index >= 0 ? index : 0;
    } else if (next && currentTrack) {
      engineRef.current?.playNow(currentTrack);
    }
    persistSettings({ shuffle: next });
    setTick((value) => value + 1);
  }, [current, persistSettings]);

  const cycleRepeat = useCallback(() => {
    const order: RepeatMode[] = ['off', 'all', 'one'];
    const next = order[(order.indexOf(repeatRef.current) + 1) % order.length];
    repeatRef.current = next;
    setRepeat(next);
    applyAudioGain();
    persistSettings({ repeat: next });
  }, [applyAudioGain, persistSettings]);

  return {
    current,
    isPlaying,
    currentTime,
    duration,
    progress,
    hasTracks,
    isMuted,
    volume,
    shuffle,
    repeat,
    error,
    play,
    pause,
    next,
    prev,
    seek,
    setMuted,
    toggleMute,
    setVolume,
    toggleShuffle,
    cycleRepeat,
  };
}
