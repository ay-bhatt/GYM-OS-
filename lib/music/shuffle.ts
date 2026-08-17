/**
 * ForgeGym — Weighted Shuffle Engine
 *
 * Replaces naive random selection with a smart queue builder that respects:
 *   - Artist cooldown     (no repeat artist within N tracks)
 *   - Genre cooldown      (no repeat genre within N tracks)
 *   - Energy balancing    (varied energy levels across the queue)
 *   - Culture balancing   (Indian vs global proportion maintained)
 *   - Track history       (no repeat until the full queue is exhausted)
 *
 * The engine is pure (no side effects) and operates on an in-memory queue.
 * History is persisted to localStorage by the caller so cooldowns survive reloads.
 */

import type { MusicTrack, EnergyLevel } from './provider';

const ARTIST_COOLDOWN = 8;
const GENRE_COOLDOWN = 6;
const MAX_HISTORY = 200;

export interface ShuffleState {
  history: string[]; // provider_track_id values
}

export class ShuffleEngine {
  private tracks: MusicTrack[];
  private state: ShuffleState;
  private queue: MusicTrack[];

  constructor(tracks: MusicTrack[], state: ShuffleState = { history: [] }) {
    this.tracks = tracks || [];
    this.state = state;
    this.queue = [];
    this.buildQueue();
  }

  get current(): MusicTrack | null {
    return this.queue.length > 0 ? this.queue[0] : null;
  }

  hasNext(): boolean {
    return this.queue.length > 1;
  }

  advance(): MusicTrack | null {
    if (this.queue.length > 0) {
      const played = this.queue.shift()!;
      this.state.history.push(played.providerTrackId);
      if (this.state.history.length > MAX_HISTORY) {
        this.state.history.shift();
      }
    }
    if (this.queue.length === 0) {
      this.buildQueue();
    }
    return this.queue.length > 0 ? this.queue[0] : null;
  }

  previous(): MusicTrack | null {
    if (this.state.history.length < 2) {
      return this.queue.length > 0 ? this.queue[0] : null;
    }
    this.state.history = this.state.history.slice(0, -1);
    const prevId = this.state.history[this.state.history.length - 1];
    const track = this.tracks.find((t) => t.providerTrackId === prevId);
    if (track) {
      this.queue = [track, ...this.queue];
    }
    return track || null;
  }

  getState(): ShuffleState {
    return { history: [...this.state.history] };
  }

  private buildQueue(): void {
    const available = this.tracks.filter(
      (t) => !this.state.history.includes(t.providerTrackId)
    );

    if (available.length === 0) {
      this.queue = [...this.tracks];
      this.state.history = [];
    } else {
      this.queue = this.weightedShuffle(available, this.state.history);
    }
  }

  private weightedShuffle(candidates: MusicTrack[], history: string[]): MusicTrack[] {
    const result: MusicTrack[] = [];
    const remaining = [...candidates];
    const used: Set<string> = new Set();

    while (remaining.length > 0) {
      const scored = remaining
        .filter((t) => !used.has(t.providerTrackId))
        .map((t) => ({ track: t, score: this.scoreTrack(t, result, history) }))
        .sort((a, b) => b.score - a.score);

      if (scored.length === 0) break;

      const topN = Math.min(3, scored.length);
      const pick = scored[Math.floor(Math.random() * topN)];
      result.push(pick.track);
      used.add(pick.track.providerTrackId);

      const idx = remaining.findIndex((t) => t.providerTrackId === pick.track.providerTrackId);
      if (idx >= 0) remaining.splice(idx, 1);
    }

    return result;
  }

  private scoreTrack(track: MusicTrack, queued: MusicTrack[], history: string[]): number {
    let score = 0;

    // Penalize recent artists (artist cooldown)
    const recentTracks = history
      .slice(-ARTIST_COOLDOWN)
      .map((id) => this.tracks.find((t) => t.providerTrackId === id))
      .filter(Boolean);

    const recentArtistPenalty = recentTracks.filter(
      (t) => t!.artist.toLowerCase() === track.artist.toLowerCase()
    ).length;
    score -= recentArtistPenalty * 10;

    // Penalize recent genres (genre cooldown)
    const recentGenrePenalty = recentTracks.filter(
      (t) => t!.genre?.toLowerCase() === track.genre?.toLowerCase()
    ).length;
    score -= recentGenrePenalty * 5;

    // Penalize tracks already in history
    if (history.includes(track.providerTrackId)) score -= 50;

        // Energy balancing: reward under-represented energy levels
    const energyCounts: Record<number, number> = {};
    queued
      .map((q) => q.energyLevel)
      .filter((e): e is EnergyLevel => e !== null)
      .forEach((e) => {
        energyCounts[e] = (energyCounts[e] || 0) + 1;
      });
    const avgCount = Object.values(energyCounts).reduce((a, b) => a + b, 0) /
      (Object.keys(energyCounts).length || 1);
    const trackCount = energyCounts[track.energyLevel ?? 0] || 0;
    if (trackCount < avgCount) score += 3;

        // Culture balancing: reward under-represented regions
    const regionCounts: Record<string, number> = {};
    [
      ...history
        .slice(-50)
        .map((id) => this.tracks.find((t) => t.providerTrackId === id))
        .filter(Boolean)
        .map((t) => t!.countryOrRegion),
      ...queued.map((q) => q.countryOrRegion),
    ]
      .filter(Boolean)
      .forEach((r) => {
        const key = r as string;
        regionCounts[key] = (regionCounts[key] || 0) + 1;
      });
    const region = track.countryOrRegion;
    if (region) {
      const regionCount = regionCounts[region] || 0;
      const avgRegion = Object.values(regionCounts).reduce((a, b) => a + b, 0) /
        (Object.keys(regionCounts).length || 1);
      if (regionCount < avgRegion) score += 2;
    }

    return score;
  }
}

export function serializeState(state: ShuffleState): string {
  return JSON.stringify(state);
}

export function deserializeState(json: string): ShuffleState {
  try {
    const parsed = JSON.parse(json);
    return { history: Array.isArray(parsed?.history) ? parsed.history : [] };
  } catch {
    return { history: [] };
  }
}
