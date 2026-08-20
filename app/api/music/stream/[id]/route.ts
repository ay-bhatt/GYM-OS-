import { NextRequest, NextResponse } from 'next/server';
import { musicService } from '@/lib/music/music-service';
import { PixabayMusicProvider } from '@/lib/music/pixabay-provider';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type CachedSource = { url: string; proxy: boolean; expires: number };

const SOURCE_CACHE = new Map<string, CachedSource>();
const CACHE_MS = 45 * 60 * 1000;

function needsProxy(url: string, provider: string) {
  return provider === 'pixabay' || url.includes('pixabay.com');
}

async function resolveSource(id: string): Promise<CachedSource | null> {
  const cached = SOURCE_CACHE.get(id);
  if (cached && cached.expires > Date.now()) return cached;

  const source = await musicService.getStreamSource(id);
  if (!source?.url || source.url.startsWith('/')) return null;

  const resolved: CachedSource = {
    url: source.url,
    proxy: needsProxy(source.url, source.provider),
    expires: Date.now() + CACHE_MS,
  };
  SOURCE_CACHE.set(id, resolved);
  return resolved;
}

/**
 * GET /api/music/stream/[id]
 *
 * Pixabay CDN blocks hotlinking, so those bytes are proxied with a pixabay.com
 * Referer. Audius (and anything else) is a 302 to the provider URL so the
 * browser talks to the CDN directly instead of streaming every range request
 * through Next.js.
 */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = decodeURIComponent(params.id);
    const source = await resolveSource(id);
    if (!source) {
      return NextResponse.json({ error: 'Stream unavailable' }, { status: 404 });
    }

    if (!source.proxy) {
      const response = NextResponse.redirect(source.url, 302);
      response.headers.set('Cache-Control', 'private, max-age=300');
      return response;
    }

    const range = request.headers.get('range');
    const upstream = await new PixabayMusicProvider().fetchCdn(source.url, range);
    if (!upstream.ok && upstream.status !== 206) {
      SOURCE_CACHE.delete(id);
      return NextResponse.json({ error: 'Stream unavailable' }, { status: 502 });
    }

    const headers = new Headers();
    headers.set('Content-Type', upstream.headers.get('content-type') || 'audio/mpeg');
    headers.set('Cache-Control', 'public, max-age=86400');
    headers.set('Accept-Ranges', upstream.headers.get('accept-ranges') || 'bytes');
    const length = upstream.headers.get('content-length');
    const contentRange = upstream.headers.get('content-range');
    if (length) headers.set('Content-Length', length);
    if (contentRange) headers.set('Content-Range', contentRange);

    return new NextResponse(upstream.body, { status: upstream.status, headers });
  } catch (error) {
    console.error('[api/music/stream/:id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
