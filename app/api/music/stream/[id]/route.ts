import { NextRequest, NextResponse } from 'next/server';
import { musicService } from '@/lib/music/music-service';

/**
 * GET /api/music/stream/[id]
 *
 * Resolves a direct provider stream URL for an approved track. The resolution
 * happens server-side so any provider credentials remain on the server. The
 * returned URL points at the provider's CDN; the browser fetches audio from
 * there directly — ForgeGym never proxies the audio bytes.
 */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const streamUrl = await musicService.resolveStreamUrl(params.id);
    if (!streamUrl) {
      return NextResponse.json({ error: 'Stream unavailable' }, { status: 404 });
    }
    return NextResponse.json({ streamUrl });
  } catch (error) {
    console.error('[api/music/stream/:id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
