import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { musicService } from '@/lib/music/music-service';
import { isTrackGymSafe } from '@/lib/music/catalog';
import type { MusicTrack } from '@/lib/music/provider';

/**
 * POST /api/music/admin/import
 *
 * Super-admin only. Searches the configured music provider (Audius) for tracks
 * matching a query and inserts them into `music_tracks` with
 * status = 'license_review'. The admin must then review licensing on the Music
 * Library page before activating any track for playback.
 *
 * Body: { search: string, limit?: number }
 * Response: { data: { imported: MusicTrack[], skipped: MusicTrack[] } }
 *   - `imported` = tracks that were newly inserted (or already existed) and
 *     have been placed in `license_review`.
 *   - `skipped` = tracks that already exist in the catalog with a status other
 *     than `license_review` (they are left untouched).
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (session.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden — Super Admin only' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const search = String(body.search || '').trim();
    const limit = Math.min(Math.max(parseInt(body.limit) || 10, 1), 50);

    if (!search) {
      return NextResponse.json({ error: 'Search query is required' }, { status: 400 });
    }

    const { imported, skipped } = await musicService.importTracks(search, limit);

    return NextResponse.json({ data: { imported, skipped } });
  } catch (error) {
    console.error('[api/music/admin/import] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}