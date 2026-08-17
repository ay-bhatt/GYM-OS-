import { NextRequest, NextResponse } from 'next/server';
import { musicService } from '@/lib/music/music-service';

/**
 * GET /api/music/tracks/[id]
 *
 * Returns a single approved track's metadata (with an enriched stream URL).
 * `id` may be either the DB UUID or the provider track id.
 */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const track = await musicService.getTrackById(params.id);
    if (!track) {
      return NextResponse.json({ error: 'Track not found' }, { status: 404 });
    }
    if (track.status !== 'active') {
      return NextResponse.json({ error: 'Track is not available' }, { status: 404 });
    }
    return NextResponse.json({ data: track });
  } catch (error) {
    console.error('[api/music/tracks/:id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
