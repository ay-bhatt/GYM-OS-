'use client';

/**
 * useAudioPlayer - weighted-shuffle HTML5 Audio controller.
 * Playback STATE is local to this browser. History in localStorage.
 * Audio streams from provider CDN. ForgeGym never proxies bytes.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import type { MusicTrack } from '@/lib/music/provider';
import { ShuffleEngine, deserializeState, serializeState } from '@/lib/music/shuffle';

const STORAGE_KEY = 'forggym-music-position';
const HISTORY_KEY = 'forggym_music_history_v2';
const MAX_FAILURES = 3;

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
  // Build the shuffle engine when the track list changes.
  useEffect(() => {
    if (!tracks.length) { engineRef.current = null; return; }
    let history: string[] = [];
    if (typeof window !== "undefined") {
      try {
        history = deserializeState(localStorage.getItem(HISTORY_KEY) || "{}").history;
      } catch { history = []; }
    }
    engineRef.current = new ShuffleEngine(tracks, { history });
  }, [tracks]);

  // Persist shuffle history on track change.
  useEffect(() => {
    if (!engineRef.current) return;
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(HISTORY_KEY, serializeState(engineRef.current.getState()));
      } catch {}
    }
  }, [tick]);

  const current = engineRef.current?.current ?? tracks[0] ?? null;
  const hasTracks = tracks.length > 0;
  const progress = duration > 0 ? currentTime / duration : 0;

  // Restore last-played track from localStorage (does not auto-play).
  useEffect(() => {
    if (!hasTracks || typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved: { currentTrackId?: string } = JSON.parse(raw);
      if (!saved.currentTrackId || !engineRef.current) return;
      const t = tracksRef.current;
      const idx = t.findIndex(
        (tr) => tr.id === saved.currentTrackId || tr.providerTrackId === saved.currentTrackId
      );
      if (idx >= 0 && engineRef.current) {
        engineRef.current = new ShuffleEngine(t, engineRef.current.getState());
        setTick((v) => v + 1);
      }
    } catch {}
  }, [hasTracks]);

  // src effect: update audio.src when the current track changes.
  useEffect(() => {
    let audio = audioRef.current;
    if (!audio) { audioRef.current = new Audio(); return; }
    if (current?.streamUrl && audio.src !== current.streamUrl) {
      audio.src = current.streamUrl || "";
      audio.load();
      setCurrentTime(0);
      setDuration(0);
      failureCountRef.current = 0;
      setError(null);
    }
    return undefined;
  }, [tick, current]);

  // Wire up events (attached once).
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onDurationChange = () => setDuration(isFinite(audio.duration) ? audio.duration : 0);
    const onProgress = () => setCurrentTime(audio.currentTime);

    const handleEnded = () => {
      failureCountRef.current = 0;
      engineRef.current?.advance();
      setTick((v) => v + 1);
    };

    const handleError = () => {
      failureCountRef.current += 1;
      if (failureCountRef.current > MAX_FAILURES || (tracksRef.current.length <= 1)) {
        setError("Music unavailable");
        wantPlayingRef.current = false;
        setIsPlaying(false);
        return;
      }
      engineRef.current?.advance();
      setTick((v) => v + 1);
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("durationchange", onDurationChange);
    audio.addEventListener("progress", onProgress);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("durationchange", onDurationChange);
      audio.removeEventListener("progress", onProgress);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
    };
  }, []);

  const play = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio || !current) { setError("Music unavailable"); return; }
    if (!audio.src || audio.src !== current.streamUrl) {
      audio.src = current.streamUrl || "";
    }
    try {
      await audio.play();
      setIsPlaying(true);
      setError(null);
      failureCountRef.current = 0;
      wantPlayingRef.current = true;
      audio.muted = isMuted;
    } catch {
      wantPlayingRef.current = false;
      setIsPlaying(false);
      setError("Please tap Play to start music");
    }
  }, [current, isMuted]);

  const pause = useCallback(() => {
    if (audioRef.current) audioRef.current.pause();
    wantPlayingRef.current = false;
    setIsPlaying(false);
  }, []);

  const seek = useCallback((seconds: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = seconds;
      setCurrentTime(seconds);
    }
  }, []);

  const next = useCallback(() => {
    if (!hasTracks || !engineRef.current) return;
    engineRef.current.advance();
    setTick((v) => v + 1);
    if (typeof window !== "undefined" && engineRef.current.current) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          currentTrackId: engineRef.current.current.providerTrackId,
        }));
      } catch {}
    }
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
    setTick((v) => v + 1);
  }, [hasTracks]);

  const setMuted = useCallback((muted: boolean) => {
    setIsMuted(muted);
    if (audioRef.current) audioRef.current.muted = muted;
  }, []);

  return {
    current, isPlaying, currentTime, duration, progress,
    hasTracks, isMuted, error, play, pause, next, prev, seek, setMuted,
  };
}
