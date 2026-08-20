import rankedCatalog from '../../scripts/catalog/forggym-top-1000.json';
import type { MusicTrack } from './provider';

type RankedEntry = {
  rank: number;
  id: string;
  providerTrackId: string;
};

const TRACKS = (rankedCatalog as { tracks: RankedEntry[] }).tracks;

export const PLAYER_PLAYLIST_SIZE = TRACKS.length;

const rankById = new Map<string, number>();
const rankByProviderId = new Map<string, number>();

for (const entry of TRACKS) {
  rankById.set(entry.id, entry.rank);
  rankByProviderId.set(entry.providerTrackId, entry.rank);
}

export function playerRankOf(track: Pick<MusicTrack, 'id' | 'providerTrackId'>): number | null {
  return rankById.get(track.id) ?? rankByProviderId.get(track.providerTrackId) ?? null;
}

export function isPlayerAllowlisted(track: Pick<MusicTrack, 'id' | 'providerTrackId'>): boolean {
  return playerRankOf(track) != null;
}

/** Keep only the curated ForgeGym 1000, in ranked order. */
export function selectPlayerPlaylist(tracks: MusicTrack[]): MusicTrack[] {
  const picked = new Map<number, MusicTrack>();
  for (const track of tracks) {
    const rank = playerRankOf(track);
    if (rank == null || picked.has(rank)) continue;
    picked.set(rank, track);
  }
  return [...picked.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, track]) => track);
}
