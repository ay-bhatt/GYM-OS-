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
const MAX_FAILURES = 6;

export interface AudioPlayerControls {
  current: MusicTrack | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  progress: number;
  hasTracks: boolean;
  isMuted: boolean;
  error: string | null;
  play: () => Promise<void>;
  pause: () => void;
  next: () => void;
  prev: () => void;
  seek: (seconds: number) => void;
  setMuted: (muted: boolean) => void;
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
  const [tick, setTick] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const failureCountRef = useRef(0);
  const wantPlayingRef = useRef(false);
  const tracksRef = useRef(tracks);
  tracksRef.current = tracks;
  const engineRef = useRef<ShuffleEngine | null>(null);

  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'auto';
    audio.setAttribute('playsinline', 'true');
    audioRef.current = audio;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onDurationChange = () => setDuration(isFinite(audio.duration) ? audio.duration : 0);
    const handleEnded = () => {
      failureCountRef.current = 0;
      engineRef.current?.advance();
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
      engineRef.current?.advance();
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
  }, []);

  useEffect(() => {
    if (!tracks.length) {
      engineRef.current = null;
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

  const current = engineRef.current?.current ?? tracks[0] ?? null;
  const hasTracks = tracks.length > 0;
  const progress = duration > 0 ? currentTime / duration : 0;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !current?.streamUrl) return;
    if (sameSrc(audio, current.streamUrl)) {
      if (wantPlayingRef.current && audio.paused) {
        void audio.play().catch(() => setIsPlaying(false));
      }
      return;
    }

    audio.src = current.streamUrl;
    audio.load();
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
  }, [tick, current]);

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
    try {
      await audio.play();
      setIsPlaying(true);
      failureCountRef.current = 0;
      audio.muted = isMuted;
    } catch (err) {
      const name = err instanceof Error ? err.name : '';
      if (name === 'NotAllowedError') {
        wantPlayingRef.current = false;
        setIsPlaying(false);
        return;
      }
      setIsPlaying(false);
      if (tracksRef.current.length > 1) {
        engineRef.current?.advance();
        setTick((value) => value + 1);
      } else {
        setError('Track failed to play');
      }
    }
  }, [current, isMuted]);

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
    if (typeof window === 'undefined' || !engineRef.current?.current) return;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ currentTrackId: engineRef.current.current.providerTrackId })
      );
    } catch {
      /* ignore */
    }
  };

  const next = useCallback(() => {
    if (!hasTracks || !engineRef.current) return;
    engineRef.current.advance();
    persistCurrent();
    setTick((value) => value + 1);
  }, [hasTracks]);

  const prev = useCallback(() => {
    if (!hasTracks || !engineRef.current) return;
    const audio = audioRef.current;
    if (audio && audio.currentTime > 2) {
      audio.currentTime = 0;
      setCurrentTime(0);
      return;
    }
    engineRef.current.previous();
    persistCurrent();
    setTick((value) => value + 1);
  }, [hasTracks]);

  const setMuted = useCallback((muted: boolean) => {
    setIsMuted(muted);
    if (audioRef.current) audioRef.current.muted = muted;
  }, []);

  return {
    current,
    isPlaying,
    currentTime,
    duration,
    progress,
    hasTracks,
    isMuted,
    error,
    play,
    pause,
    next,
    prev,
    seek,
    setMuted,
  };
}
