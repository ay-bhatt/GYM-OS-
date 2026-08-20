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

import type { MusicTrack } from './provider';

const ARTIST_COOLDOWN = 12;
const GENRE_COOLDOWN = 6;
const MAX_HISTORY = 900;
/** Keep the live queue small so first paint never walks the whole catalog. */
const QUEUE_TARGET = 96;

export interface ShuffleState {
  history: string[]; // provider_track_id values
}

type ScoreContext = {
  recentArtistCounts: Map<string, number>;
  recentGenreCounts: Map<string, number>;
  historySet: Set<string>;
  energyCounts: Record<number, number>;
  energyAvg: number;
  regionCounts: Record<string, number>;
  regionAvg: number;
};

export class ShuffleEngine {
  private tracks: MusicTrack[];
  private state: ShuffleState;
  private queue: MusicTrack[];
  private tracksById: Map<string, MusicTrack>;

  constructor(tracks: MusicTrack[], state: ShuffleState = { history: [] }) {
    this.tracks = tracks || [];
    this.state = state;
    this.queue = [];
    this.tracksById = new Map();
    this.indexTracks();
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

  /** Keep this track current and continue the remaining shuffle queue after it. */
  playNow(track: MusicTrack) {
    this.queue = [
      track,
      ...this.queue.filter(
        (queued) => queued.id !== track.id && queued.providerTrackId !== track.providerTrackId
      ),
    ];
  }

  /** Refresh the catalog without dropping the current song. */
  setTracks(tracks: MusicTrack[]) {
    this.tracks = tracks || [];
    this.indexTracks();
    const currentId = this.queue[0]?.id;
    if (currentId && this.tracks.some((track) => track.id === currentId)) {
      const byId = new Map(this.tracks.map((track) => [track.id, track]));
      this.queue = this.queue
        .map((queued) => byId.get(queued.id))
        .filter((track): track is MusicTrack => Boolean(track))
        .slice(0, QUEUE_TARGET);
      if (this.queue.length === 0) this.buildQueue();
      return;
    }
    this.queue = [];
    this.buildQueue();
  }

  private indexTracks() {
    this.tracksById = new Map(
      this.tracks
        .filter((track) => track.providerTrackId)
        .map((track) => [track.providerTrackId, track])
    );
  }

  private buildQueue(): void {
    const historySet = new Set(this.state.history);
    const available = this.tracks.filter((t) => !historySet.has(t.providerTrackId));

    if (available.length === 0) {
      this.state.history = [];
      this.queue = this.weightedShuffle(this.tracks, []);
    } else {
      this.queue = this.weightedShuffle(available, this.state.history);
    }
  }

  private weightedShuffle(candidates: MusicTrack[], history: string[]): MusicTrack[] {
    const result: MusicTrack[] = [];
    const remaining = candidates.filter((track) => track.providerTrackId);
    const used = new Set<string>();
    const target = Math.min(QUEUE_TARGET, remaining.length);
    let guard = remaining.length + 1;

    while (remaining.length > 0 && result.length < target && guard-- > 0) {
      const context = this.makeScoreContext(result, history);
      const top: { track: MusicTrack; score: number }[] = [];

      for (const track of remaining) {
        if (used.has(track.providerTrackId)) continue;
        const scored = { track, score: this.scoreTrack(track, context) };
        if (top.length < 3) {
          top.push(scored);
          top.sort((a, b) => b.score - a.score);
        } else if (scored.score > top[top.length - 1].score) {
          top[top.length - 1] = scored;
          top.sort((a, b) => b.score - a.score);
        }
      }

      if (top.length === 0) break;

      const pick = top[Math.floor(Math.random() * top.length)];
      result.push(pick.track);
      used.add(pick.track.providerTrackId);

      const idx = remaining.findIndex((t) => t.providerTrackId === pick.track.providerTrackId);
      if (idx < 0) break;
      remaining.splice(idx, 1);
    }

    return result;
  }

  private makeScoreContext(queued: MusicTrack[], history: string[]): ScoreContext {
    const recentArtistCounts = new Map<string, number>();
    const recentGenreCounts = new Map<string, number>();
    const recent = history.slice(-Math.max(ARTIST_COOLDOWN, GENRE_COOLDOWN));
    for (const id of recent) {
      const track = this.tracksById.get(id);
      if (!track) continue;
      const artist = track.artist.toLowerCase();
      recentArtistCounts.set(artist, (recentArtistCounts.get(artist) || 0) + 1);
      if (track.genre) {
        const genre = track.genre.toLowerCase();
        recentGenreCounts.set(genre, (recentGenreCounts.get(genre) || 0) + 1);
      }
    }

    const energyCounts: Record<number, number> = {};
    for (const queuedTrack of queued) {
      if (queuedTrack.energyLevel == null) continue;
      energyCounts[queuedTrack.energyLevel] = (energyCounts[queuedTrack.energyLevel] || 0) + 1;
    }
    const energyValues = Object.values(energyCounts);
    const energyAvg = energyValues.reduce((a, b) => a + b, 0) / (energyValues.length || 1);

    const regionCounts: Record<string, number> = {};
    for (const id of history.slice(-50)) {
      const region = this.tracksById.get(id)?.countryOrRegion;
      if (region) regionCounts[region] = (regionCounts[region] || 0) + 1;
    }
    for (const queuedTrack of queued) {
      const region = queuedTrack.countryOrRegion;
      if (region) regionCounts[region] = (regionCounts[region] || 0) + 1;
    }
    const regionValues = Object.values(regionCounts);
    const regionAvg = regionValues.reduce((a, b) => a + b, 0) / (regionValues.length || 1);

    return {
      recentArtistCounts,
      recentGenreCounts,
      historySet: new Set(history),
      energyCounts,
      energyAvg,
      regionCounts,
      regionAvg,
    };
  }

  private scoreTrack(track: MusicTrack, context: ScoreContext): number {
    let score = Math.random();

    score -= (context.recentArtistCounts.get(track.artist.toLowerCase()) || 0) * 10;

    if (track.genre) {
      score -= (context.recentGenreCounts.get(track.genre.toLowerCase()) || 0) * 5;
    }

    if (context.historySet.has(track.providerTrackId)) score -= 50;

    const trackCount = context.energyCounts[track.energyLevel ?? 0] || 0;
    if (trackCount < context.energyAvg) score += 3;

    const region = track.countryOrRegion;
    if (region && (context.regionCounts[region] || 0) < context.regionAvg) score += 2;

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
