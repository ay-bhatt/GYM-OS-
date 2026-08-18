/**
 * Pixabay Music provider.
 *
 * Searches royalty-free gym / fitness / athletic tracks from Pixabay Music
 * (https://pixabay.com/music/). The official REST key used for images/videos
 * also unlocks GET https://pixabay.com/api/audio/.
 *
 * Pixabay CDN blocks hotlinking without a pixabay.com Referer, so the browser
 * never plays CDN URLs directly. The player uses /api/music/stream/:id and
 * this server fetches the file with the required Referer.
 */

import { MusicProvider, MusicTrack, MusicCategory, SearchOptions } from './provider';
import { PIXABAY_API_KEY, PIXABAY_AUDIO_API } from './config';

const GYM_QUERIES = [
  'gym workout',
  'fitness training',
  'athletic sport',
  'cardio running',
  'workout motivation',
  'high energy gym',
  'trap workout beat',
  'sport trailer',
  'training beats',
  'power workout',
  'gym fitness',
  'running electronic',
];

const BROWSER_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Referer: 'https://pixabay.com/',
  Accept: '*/*',
};

const CACHE_TTL_MS = 60 * 60 * 1000;
const trackUrlCache = new Map<string, string>();
let featuredCache: { tracks: MusicTrack[]; expires: number; stamp: string } | null = null;

interface PixabayAudioHit {
  id?: number | string;
  pageURL?: string;
  tags?: string;
  duration?: number;
  user?: string;
  user_id?: number;
  type?: string;
  previewURL?: string;
  audioURL?: string;
  downloadURL?: string;
  url?: string;
  audio?: Record<string, { url?: string } | string | undefined>;
  [key: string]: unknown;
}

const SEED_TRACKS: Array<{
  id: string;
  title: string;
  artist: string;
  genre: string;
  category: MusicCategory;
  energyLevel: 1 | 2 | 3 | 4 | 5;
  url: string;
  page: string;
}> = [
  {
    id: '141691',
    title: 'Action Urban Trap',
    artist: 'Pixabay Music',
    genre: 'Trap',
    category: 'high_energy',
    energyLevel: 5,
    url: 'https://cdn.pixabay.com/download/audio/2023/03/06/audio_68ff2ea86b.mp3?filename=action-urban-trap-141691.mp3',
    page: 'https://pixabay.com/music/search/action%20urban%20trap/',
  },
  {
    id: '113776',
    title: 'Beautiful Boom Bap',
    artist: 'Pixabay Music',
    genre: 'Hip Hop',
    category: 'workout',
    energyLevel: 4,
    url: 'https://cdn.pixabay.com/download/audio/2022/06/22/audio_cde8d21390.mp3?filename=beautiful-boom-bap-113776.mp3',
    page: 'https://pixabay.com/music/search/boom%20bap/',
  },
  {
    id: '146661',
    title: 'Futuristic Beat',
    artist: 'Pixabay Music',
    genre: 'Electronic',
    category: 'high_energy',
    energyLevel: 5,
    url: 'https://cdn.pixabay.com/download/audio/2023/04/17/audio_ae4d57086a.mp3?filename=futuristic-beat-146661.mp3',
    page: 'https://pixabay.com/music/search/futuristic%20beat/',
  },
  {
    id: '170190',
    title: 'Titanium',
    artist: 'Pixabay Music',
    genre: 'Trailer',
    category: 'strength',
    energyLevel: 5,
    url: 'https://cdn.pixabay.com/download/audio/2023/10/06/audio_14f9198f0b.mp3?filename=titanium-170190.mp3',
    page: 'https://pixabay.com/music/search/titanium/',
  },
  {
    id: '111444',
    title: 'Stomping Rock Four Shots',
    artist: 'Pixabay Music',
    genre: 'Rock',
    category: 'strength',
    energyLevel: 4,
    url: 'https://cdn.pixabay.com/download/audio/2022/05/17/audio_407815a564.mp3?filename=stomping-rock-four-shots-111444.mp3',
    page: 'https://pixabay.com/music/search/stomping%20rock/',
  },
  {
    id: '115571',
    title: 'Guitar Electro Sport Trailer',
    artist: 'Pixabay Music',
    genre: 'Sport',
    category: 'cardio',
    energyLevel: 4,
    url: 'https://cdn.pixabay.com/download/audio/2022/07/25/audio_3266b47d61.mp3?filename=guitar-electro-sport-trailer-115571.mp3',
    page: 'https://pixabay.com/music/search/sport%20trailer/',
  },
  {
    id: '124014',
    title: 'Drop It',
    artist: 'Coma-Media',
    genre: 'Electronic',
    category: 'high_energy',
    energyLevel: 5,
    url: 'https://cdn.pixabay.com/download/audio/2022/10/25/audio_3ea72d75c6.mp3?filename=drop-it-124014.mp3',
    page: 'https://pixabay.com/music/search/drop%20it/',
  },
  {
    id: '118327',
    title: 'Tuesday Glitch Soft Hip Hop',
    artist: 'Pixabay Music',
    genre: 'Hip Hop',
    category: 'workout',
    energyLevel: 3,
    url: 'https://cdn.pixabay.com/download/audio/2022/08/25/audio_4f3b0a816e.mp3?filename=tuesday-glitch-soft-hip-hop-118327.mp3',
    page: 'https://pixabay.com/music/search/hip%20hop/',
  },
  {
    id: '142819',
    title: 'Floating Abstract',
    artist: 'Pixabay Music',
    genre: 'Electronic',
    category: 'cool_down',
    energyLevel: 2,
    url: 'https://cdn.pixabay.com/download/audio/2023/03/16/audio_df7d9198c3.mp3?filename=floating-abstract-142819.mp3',
    page: 'https://pixabay.com/music/search/abstract/',
  },
];

function inferCategory(tags: string): MusicCategory {
  const t = tags.toLowerCase();
  if (/(cool.?down|chill|lofi|ambient|relax)/.test(t)) return 'cool_down';
  if (/(warm.?up|stretch)/.test(t)) return 'warm_up';
  if (/(cardio|run|sprint|hiit)/.test(t)) return 'cardio';
  if (/(strength|lift|power|rock)/.test(t)) return 'strength';
  if (/(high.?energy|trap|edm|intense)/.test(t)) return 'high_energy';
  return 'workout';
}

function pickAudioUrl(hit: PixabayAudioHit): string | null {
  const audio = hit.audio;
  if (audio && typeof audio === 'object') {
    for (const key of ['medium', 'large', 'preview', 'small', 'url']) {
      const value = audio[key];
      if (typeof value === 'string' && value.startsWith('http')) return value;
      if (value && typeof value === 'object' && typeof value.url === 'string') return value.url;
    }
  }
  for (const key of ['audioURL', 'downloadURL', 'previewURL', 'url'] as const) {
    const value = hit[key];
    if (typeof value === 'string' && value.startsWith('http')) return value;
  }
  return null;
}

function toTrack(hit: PixabayAudioHit): MusicTrack | null {
  const streamUrl = pickAudioUrl(hit);
  const id = String(hit.id ?? '');
  if (!streamUrl || !id) return null;
  const tags = String(hit.tags || 'gym, workout, fitness');
  const title = tags.split(',')[0]?.trim() || `Pixabay ${id}`;
  const artist = String(hit.user || 'Pixabay Music');
  trackUrlCache.set(id, streamUrl);

  return {
    id: `pixabay-${id}`,
    provider: 'pixabay',
    providerTrackId: id,
    title,
    artist,
    album: null,
    genre: tags.split(',')[0]?.trim() || 'Workout',
    subGenre: tags,
    countryOrRegion: 'GLOBAL',
    language: 'Instrumental',
    energyLevel: inferCategory(tags) === 'cool_down' ? 2 : 4,
    bpm: null,
    duration: typeof hit.duration === 'number' ? hit.duration : null,
    artworkUrl: null,
    streamUrl,
    sourceUrl: hit.pageURL ? String(hit.pageURL) : 'https://pixabay.com/music/',
    providerTrackUrl: hit.pageURL ? String(hit.pageURL) : 'https://pixabay.com/music/',
    source: 'Pixabay Music',
    licenseName: 'Pixabay Content License',
    licenseUrl: 'https://pixabay.com/service/license-summary/',
    commercialUseAllowed: true,
    publicPerformanceAllowed: true,
    attributionRequired: false,
    attributionText: `${title} — ${artist} (Pixabay)`,
    verificationDate: null,
    verificationNotes: 'Royalty-free gym / fitness music from Pixabay Music.',
    isExplicit: false,
    category: inferCategory(tags),
    status: 'active',
    createdAt: null,
    updatedAt: null,
  };
}

function seedCatalog(): MusicTrack[] {
  return SEED_TRACKS.map((item) => {
    trackUrlCache.set(item.id, item.url);
    return {
      id: `pixabay-${item.id}`,
      provider: 'pixabay',
      providerTrackId: item.id,
      title: item.title,
      artist: item.artist,
      album: null,
      genre: item.genre,
      subGenre: 'gym, fitness, athletic',
      countryOrRegion: 'GLOBAL',
      language: 'Instrumental',
      energyLevel: item.energyLevel,
      bpm: null,
      duration: null,
      artworkUrl: null,
      streamUrl: item.url,
      sourceUrl: item.page,
      providerTrackUrl: item.page,
      source: 'Pixabay Music',
      licenseName: 'Pixabay Content License',
      licenseUrl: 'https://pixabay.com/service/license-summary/',
      commercialUseAllowed: true,
      publicPerformanceAllowed: true,
      attributionRequired: false,
      attributionText: `${item.title} — ${item.artist} (Pixabay)`,
      verificationDate: null,
      verificationNotes: 'Royalty-free gym / fitness music from Pixabay Music.',
      isExplicit: false,
      category: item.category,
      status: 'active' as const,
      createdAt: null,
      updatedAt: null,
    };
  });
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function rewritePixabayStreamUrl(track: MusicTrack): MusicTrack {
  if (track.provider !== 'pixabay') return track;
  if (track.streamUrl && track.streamUrl.startsWith('http')) {
    trackUrlCache.set(track.providerTrackId, track.streamUrl);
  }
  return {
    ...track,
    streamUrl: `/api/music/stream/${encodeURIComponent(track.id)}`,
  };
}

export class PixabayMusicProvider extends MusicProvider {
  readonly name = 'pixabay';
  readonly displayName = 'Pixabay Music';
  readonly licenseNote =
    'Pixabay Content License — royalty-free gym / fitness music. No attribution required.';

  async getTrack(providerTrackId: string): Promise<MusicTrack | null> {
    const fromSeed = seedCatalog().find((t) => t.providerTrackId === providerTrackId);
    if (fromSeed) return fromSeed;
    if (!PIXABAY_API_KEY) return null;
    const hits = await this.request({ id: providerTrackId });
    return hits[0] ?? null;
  }

  async getStreamUrl(providerTrackId: string): Promise<string> {
    const cached = trackUrlCache.get(providerTrackId);
    if (cached) return cached;
    const track = await this.getTrack(providerTrackId);
    if (track?.streamUrl && track.streamUrl.startsWith('http')) return track.streamUrl;
    throw new Error(`Pixabay stream unavailable for ${providerTrackId}`);
  }

  async searchTracks(query: string, options?: SearchOptions): Promise<MusicTrack[]> {
    const limit = options?.limit ?? 40;
    if (!PIXABAY_API_KEY) {
      const term = query.toLowerCase();
      return seedCatalog().filter((t) =>
        `${t.title} ${t.genre} ${t.subGenre}`.toLowerCase().includes(term)
      );
    }
    return this.request({ q: query, per_page: String(Math.min(200, Math.max(3, limit))) });
  }

  async getFeaturedTracks(): Promise<MusicTrack[]> {
    const hourStamp = new Date().toISOString().slice(0, 13);
    if (featuredCache && featuredCache.expires > Date.now() && featuredCache.stamp === hourStamp) {
      return shuffle(featuredCache.tracks);
    }

    const live = await this.fetchGymCatalog();
    const merged = this.unique([...live, ...seedCatalog()]);
    featuredCache = { tracks: merged, expires: Date.now() + CACHE_TTL_MS, stamp: hourStamp };
    return shuffle(merged);
  }

  async fetchCdn(url: string, range?: string | null): Promise<Response> {
    const headers: Record<string, string> = { ...BROWSER_HEADERS };
    if (range) headers.Range = range;
    return fetch(url, { headers, redirect: 'follow' });
  }

  private async fetchGymCatalog(): Promise<MusicTrack[]> {
    if (!PIXABAY_API_KEY) return [];
    const picked = shuffle(GYM_QUERIES).slice(0, 4);
    const pages = [1, 1 + Math.floor(Math.random() * 6)];
    const batches = await Promise.all(
      picked.flatMap((q) =>
        pages.map((page) =>
          this.request({
            q,
            page: String(page),
            per_page: '40',
            safesearch: 'true',
            order: Math.random() > 0.5 ? 'latest' : 'popular',
          })
        )
      )
    );
    return this.unique(batches.flat());
  }

  private unique(tracks: MusicTrack[]): MusicTrack[] {
    const seen = new Set<string>();
    return tracks.filter((track) => {
      if (seen.has(track.providerTrackId)) return false;
      seen.add(track.providerTrackId);
      return true;
    });
  }

  private async request(params: Record<string, string>): Promise<MusicTrack[]> {
    if (!PIXABAY_API_KEY) return [];
    const url = new URL(PIXABAY_AUDIO_API);
    url.searchParams.set('key', PIXABAY_API_KEY);
    Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));

    const res = await fetch(url.toString(), {
      headers: { ...BROWSER_HEADERS, Accept: 'application/json' },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.warn('[pixabay] audio search failed', res.status, body.slice(0, 180));
      return [];
    }
    const json = (await res.json()) as { hits?: PixabayAudioHit[] };
    return (json.hits || []).map(toTrack).filter((track): track is MusicTrack => Boolean(track));
  }
}
