import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { musicService } from '@/lib/music/music-service';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (session.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden — Super Admin only' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const tracks = await musicService.getAdminTracks({
      search: searchParams.get('search') || undefined,
      status: searchParams.get('status') || undefined,
      provider: searchParams.get('provider') || undefined,
      genre: searchParams.get('genre') || undefined,
      country: searchParams.get('country') || undefined,
      playlist: searchParams.get('playlist') === 'all' ? 'all' : 'floor',
    });

    return NextResponse.json({ data: tracks });
  } catch (error) {
    console.error('[api/music/admin/tracks] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
