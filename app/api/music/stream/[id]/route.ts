import { NextRequest, NextResponse } from 'next/server';
import { musicService } from '@/lib/music/music-service';
import { PixabayMusicProvider } from '@/lib/music/pixabay-provider';
<<<<<<< HEAD
import { AudiusMusicProvider } from '@/lib/music/audius-provider';
=======
>>>>>>> c56d30689396b218514a6278f83a8e01920b619b

/**
 * GET /api/music/stream/[id]
 *
<<<<<<< HEAD
 * Same-origin proxy so the browser <audio> element does not depend on CDN
 * CORS/hotlink rules. Pixabay needs a pixabay.com Referer; Audius is a 302
 * to a signed content-node URL.
 */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = decodeURIComponent(params.id);
    const track = await musicService.getTrackById(id);

    let sourceUrl = track ? await musicService.resolveStreamUrl(track.id) : null;
    if (!sourceUrl && track?.provider === 'audius') {
      sourceUrl = await new AudiusMusicProvider().getStreamUrl(track.providerTrackId);
    }
    if (!sourceUrl && !id.startsWith('pixabay-')) {
      sourceUrl = await new AudiusMusicProvider().getStreamUrl(id);
    }
    if (!sourceUrl || sourceUrl.startsWith('/')) {
      return NextResponse.json({ error: 'Stream unavailable' }, { status: 404 });
    }

    const range = request.headers.get('range');
    const upstream =
      track?.provider === 'pixabay' || sourceUrl.includes('pixabay.com')
        ? await new PixabayMusicProvider().fetchCdn(sourceUrl, range)
        : await fetch(sourceUrl, {
            headers: {
              Accept: 'audio/*,*/*;q=0.9',
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
              ...(range ? { Range: range } : {}),
            },
            redirect: 'follow',
          });

    if (!upstream.ok && upstream.status !== 206) {
      return NextResponse.json({ error: 'Stream unavailable' }, { status: 502 });
    }

    const headers = new Headers();
    headers.set('Content-Type', upstream.headers.get('content-type') || 'audio/mpeg');
    headers.set('Cache-Control', 'public, max-age=3600');
    headers.set('Accept-Ranges', upstream.headers.get('accept-ranges') || 'bytes');
    const length = upstream.headers.get('content-length');
    const contentRange = upstream.headers.get('content-range');
    if (length) headers.set('Content-Length', length);
    if (contentRange) headers.set('Content-Range', contentRange);

    return new NextResponse(upstream.body, { status: upstream.status, headers });
=======
 * Pixabay CDN requires a pixabay.com Referer, so we fetch the file on the
 * server and stream it to the browser. Other providers 302 to their CDN.
 */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const track = await musicService.getTrackById(decodeURIComponent(params.id));
    if (!track || track.status !== 'active') {
      return NextResponse.json({ error: 'Stream unavailable' }, { status: 404 });
    }

    const sourceUrl = await musicService.resolveStreamUrl(track.id);
    if (!sourceUrl) {
      return NextResponse.json({ error: 'Stream unavailable' }, { status: 404 });
    }

    if (track.provider === 'pixabay' || sourceUrl.includes('pixabay.com')) {
      const provider = new PixabayMusicProvider();
      const range = request.headers.get('range');
      const upstream = await provider.fetchCdn(sourceUrl, range);
      if (!upstream.ok && upstream.status !== 206) {
        return NextResponse.json({ error: 'Pixabay stream unavailable' }, { status: 502 });
      }

      const headers = new Headers();
      headers.set('Content-Type', upstream.headers.get('content-type') || 'audio/mpeg');
      headers.set('Cache-Control', 'public, max-age=86400');
      headers.set('Accept-Ranges', 'bytes');
      const length = upstream.headers.get('content-length');
      const contentRange = upstream.headers.get('content-range');
      if (length) headers.set('Content-Length', length);
      if (contentRange) headers.set('Content-Range', contentRange);

      return new NextResponse(upstream.body, { status: upstream.status, headers });
    }

    return NextResponse.redirect(sourceUrl);
>>>>>>> c56d30689396b218514a6278f83a8e01920b619b
  } catch (error) {
    console.error('[api/music/stream/:id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
