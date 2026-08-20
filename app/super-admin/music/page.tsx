'use client';

import { type ComponentType, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  Filter,
  ShieldCheck,
  ShieldOff,
  Trash2,
  Eye,
  RefreshCcw,
  Music2,
  Link2,
  FileText,
  Flag,
  Upload,
  Loader2,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogAction, AlertDialogCancel } from '@/components/ui/alert-dialog';
import type { MusicTrack } from '@/lib/music/provider';

type TrackStatus = MusicTrack['status'];

const statusOptions: Array<{ label: string; value: TrackStatus | 'all' }> = [
  { label: 'All', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'License review', value: 'license_review' },
  { label: 'Disabled', value: 'disabled' },
  { label: 'Broken', value: 'broken' },
  { label: 'Removed', value: 'removed' },
];

export default function SuperAdminMusicPage() {
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<TrackStatus | 'all'>('all');
  const [provider, setProvider] = useState('');
  const [genre, setGenre] = useState('');
  const [country, setCountry] = useState('');
  const [playlist, setPlaylist] = useState<'floor' | 'all'>('floor');
  const [selected, setSelected] = useState<MusicTrack | null>(null);
  const [deleteTrack, setDeleteTrack] = useState<MusicTrack | null>(null);
  const [confirmValue, setConfirmValue] = useState('');
    const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [importOpen, setImportOpen] = useState(false);
  const [importSearch, setImportSearch] = useState('');
  const [importResults, setImportResults] = useState<MusicTrack[]>([]);
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState('');

  const fetchTracks = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (status !== 'all') params.set('status', status);
      if (provider.trim()) params.set('provider', provider.trim());
      if (genre.trim()) params.set('genre', genre.trim());
      if (country.trim()) params.set('country', country.trim());
      params.set('playlist', playlist);

      const res = await fetch(`/api/music/admin/tracks?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load tracks');
      const data = await res.json();
      setTracks(data.data || []);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load tracks');
      setTracks([]);
    } finally {
      setLoading(false);
    }
  }, [country, genre, playlist, provider, search, status]);

  useEffect(() => {
    fetchTracks();
  }, [fetchTracks]);

  const counts = useMemo(() => {
    return tracks.reduce(
      (acc, track) => {
        acc[track.status] = (acc[track.status] || 0) + 1;
        return acc;
      },
      {
        active: 0,
        disabled: 0,
        license_review: 0,
        broken: 0,
        removed: 0,
        blocked: 0,
        pending_review: 0,
      } as Record<TrackStatus, number>
    );
  }, [tracks]);

  const updateTrack = async (track: MusicTrack, patch: Record<string, unknown>) => {
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/music/admin/tracks/${track.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to update track');
      await fetchTracks();
      if (selected?.id === track.id) {
        setSelected(json.data || null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update track');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTrack) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/music/admin/tracks/${deleteTrack.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmTrackId: confirmValue }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to delete track');
      setDeleteTrack(null);
      setConfirmValue('');
      await fetchTracks();
      if (selected?.id === deleteTrack.id) setSelected(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete track');
    } finally {
      setSaving(false);
    }
    };

  const handleImportSearch = async () => {
    if (!importSearch.trim()) return;
    setImporting(true);
    setImportMessage('');
    setImportResults([]);
    try {
      const res = await fetch('/api/music/admin/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ search: importSearch.trim(), limit: 20 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Import search failed');
      setImportResults(data.data.imported || []);
      setImportMessage(
        `${data.data.imported.length} track(s) imported, ${data.data.skipped.length} skipped`
      );
      await fetchTracks();
    } catch (e) {
      setImportMessage(e instanceof Error ? e.message : 'Import search failed');
      setImportResults([]);
    } finally {
      setImporting(false);
    }
  };

  const handleImportSingle = async (track: MusicTrack) => {
    const res = await fetch('/api/music/admin/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ search: track.title, limit: 1 }),
    });
    if (!res.ok) {
      const data = await res.json();
      setImportMessage(data.error || 'Import failed');
    } else {
      setImportMessage('Track imported successfully');
      await fetchTracks();
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-200 border-t-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-5 sm:p-6 lg:p-8">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <p className="admin-kicker">Catalog</p>
          <h1 className="admin-page-title">Music Library</h1>
          <p className="admin-page-sub">
            {playlist === 'floor'
              ? 'High-intensity floor playlist — the same 1000 tracks the gym player shuffles.'
              : 'Full catalog. Floor playlist tracks stay ranked at the top.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <div className="inline-flex rounded-xl border border-zinc-200/90 bg-white p-1 shadow-sm">
            <button
              type="button"
              onClick={() => setPlaylist('floor')}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                playlist === 'floor' ? 'bg-black text-white shadow-sm' : 'text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              Floor playlist
            </button>
            <button
              type="button"
              onClick={() => setPlaylist('all')}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                playlist === 'all' ? 'bg-black text-white shadow-sm' : 'text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              Full library
            </button>
          </div>
                <button
          onClick={fetchTracks}
          className="admin-secondary-btn"
        >
          <RefreshCcw className="h-4 w-4" />
          Refresh
        </button>
        <button
          onClick={() => setImportOpen(!importOpen)}
          className="admin-primary-btn"
        >
          <Upload className="h-4 w-4" />
          Import
        </button>
        </div>
      </div>

      <div className="mb-4 grid gap-3 md:grid-cols-4">
        <StatCard
          label={playlist === 'floor' ? 'On the floor' : 'Total'}
          value={tracks.length}
          icon={Music2}
        />
        <StatCard label="Active" value={counts.active} icon={ShieldCheck} />
        <StatCard label="License review" value={counts.license_review} icon={FileText} />
                <StatCard label="Disabled" value={counts.disabled + counts.broken + counts.removed} icon={ShieldOff} />
      </div>

      {/* Import Section */}
      {importOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="admin-surface mb-6 p-5"
        >
          <h2 className="mb-3 text-sm font-semibold text-zinc-900">Import from Audius</h2>
          <p className="mb-4 text-xs text-zinc-500">
            Search Audius for tracks and import them into the catalog. Imported tracks are
            placed in <strong>License review</strong> status — review licensing before activating.
          </p>
          <div className="flex gap-3">
            <input
              value={importSearch}
              onChange={(e) => setImportSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleImportSearch())}
              placeholder="Search Audius (e.g. 'workout electronic')..."
              className="flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
            <button
              onClick={handleImportSearch}
              disabled={importing || !importSearch.trim()}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              {importing ? 'Searching…' : 'Search'}
            </button>
          </div>

          {importMessage && <p className="mt-3 text-sm text-zinc-600">{importMessage}</p>}

          {importResults.length > 0 && (
            <div className="mt-4 space-y-2">
              {importResults.map((track) => (
                <div key={track.id} className="flex items-center gap-3 rounded-lg border border-zinc-200 p-3">
                  <div className="flex-1">
                    <p className="font-medium text-zinc-900">{track.title}</p>
                    <p className="text-xs text-zinc-500">{track.artist} — {track.provider}</p>
                  </div>
                  <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                    Review
                  </span>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      <div className="admin-surface mb-4 p-4">
      <div className="grid gap-3 lg:grid-cols-5">
        <div className="relative lg:col-span-2">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title, artist, track ID..."
            className="admin-input"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as TrackStatus | 'all')}
            className="w-full appearance-none rounded-xl border border-zinc-200 bg-white py-2.5 pl-10 pr-3 text-sm text-zinc-900 outline-none transition focus:border-blue-500"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <input
          value={provider}
          onChange={(e) => setProvider(e.target.value)}
          placeholder="Provider"
          className="rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-blue-500"
        />
        <input
          value={genre}
          onChange={(e) => setGenre(e.target.value)}
          placeholder="Genre"
          className="rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-blue-500"
        />
      </div>

      <div className="mt-3 flex items-center gap-3">
        <input
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          placeholder="Country / region"
          className="w-full max-w-xs rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-blue-500"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
      </div>

      <div className="admin-surface">
        <DualHScroll deps={tracks.length}>
          <table className="admin-table w-full min-w-[1400px]">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/90">
                <th className="px-4 py-3 text-left">Rank</th>
                <th className="px-4 py-3 text-left">Track</th>
                <th className="px-4 py-3 text-left">Provider</th>
                <th className="px-4 py-3 text-left">Genre</th>
                <th className="px-4 py-3 text-left">Energy</th>
                <th className="px-4 py-3 text-left">Region</th>
                <th className="px-4 py-3 text-left">License</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tracks.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-sm text-zinc-500">
                    {playlist === 'floor'
                      ? 'No floor playlist tracks matched. Switch to Full library to see the rest of the catalog.'
                      : 'No tracks found. Use Import to search Audius and add tracks to the catalog.'}
                  </td>
                </tr>
              ) : (
                tracks.map((track) => (
                  <tr key={track.id} className="border-b border-zinc-100 last:border-0 hover:bg-blue-50/40">
                    <td className="px-4 py-3 text-sm tabular-nums text-zinc-500">
                      {track.playerRank != null ? (
                        <span className="inline-flex min-w-[2.5rem] items-center justify-center rounded-md bg-black px-2 py-0.5 text-xs font-semibold text-white">
                          #{track.playerRank}
                        </span>
                      ) : (
                        <span className="text-zinc-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="max-w-[260px]">
                        <p className="truncate text-sm font-medium text-zinc-900">{track.title}</p>
                        <p className="truncate text-xs text-zinc-500">{track.artist}</p>
                        {track.playerRank != null && playlist === 'all' && (
                          <p className="mt-1 text-[11px] font-medium text-blue-700">On floor playlist</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-600">
                      <div className="space-y-1">
                        <div className="font-medium text-zinc-800">{track.provider}</div>
                        <div className="truncate text-xs text-zinc-500">{track.providerTrackId}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-600">{track.genre || '—'}</td>
                    <td className="px-4 py-3 text-sm text-zinc-600">{track.energyLevel ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-zinc-600">{track.countryOrRegion || '—'}</td>
                    <td className="px-4 py-3 text-sm text-zinc-600">
                      <div className="max-w-[220px]">
                        <p className="truncate">{track.licenseName || '—'}</p>
                        <p className="truncate text-xs text-zinc-400">{track.source || track.sourceUrl || 'No source'}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={track.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setSelected(track)}
                          className="inline-flex items-center gap-1 rounded-md border border-zinc-200 px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          View
                        </button>
                        <button
                          onClick={() => updateTrack(track, { status: 'active' })}
                          className="inline-flex items-center gap-1 rounded-md border border-emerald-200 px-2.5 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
                          disabled={saving || track.status === 'active'}
                        >
                          <ShieldCheck className="h-3.5 w-3.5" />
                          Activate
                        </button>
                        <button
                          onClick={() => updateTrack(track, { status: 'disabled' })}
                          className="inline-flex items-center gap-1 rounded-md border border-amber-200 px-2.5 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-50"
                          disabled={saving || track.status === 'disabled'}
                        >
                          <ShieldOff className="h-3.5 w-3.5" />
                          Disable
                        </button>
                        <button
                          onClick={() => setDeleteTrack(track)}
                          className="inline-flex items-center gap-1 rounded-md border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
                          disabled={saving}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </DualHScroll>
      </div>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="flex max-h-[90vh] max-w-2xl flex-col gap-4 overflow-hidden">
          <DialogHeader className="shrink-0 pr-8">
            <DialogTitle>{selected?.title || 'Track details'}</DialogTitle>
            <DialogDescription>{selected?.artist || ' '}</DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain pr-1">
              <div className="grid gap-4 text-sm text-zinc-700 sm:grid-cols-2">
              <Detail label="Provider" value={selected.provider} />
              <Detail label="Provider track ID" value={selected.providerTrackId} />
              <Detail label="Genre" value={selected.genre || '—'} />
              <Detail label="Sub-genre" value={selected.subGenre || '—'} />
              <Detail
                label="Floor playlist"
                value={selected.playerRank != null ? `Rank #${selected.playerRank} of 1000` : 'Not on the gym player'}
              />
              <Detail label="Energy level" value={selected.energyLevel ? String(selected.energyLevel) : '—'} />
              <Detail label="Region" value={selected.countryOrRegion || '—'} />
              <Detail label="License" value={selected.licenseName || '—'} />
              <Detail label="Status" value={selected.status} />
              <Detail label="Source" value={selected.source || '—'} />
              <Detail
                label="Source URL"
                value={
                  selected.sourceUrl ? (
                    <a href={selected.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-blue-700 underline">
                      <Link2 className="h-3.5 w-3.5" />
                      View source
                    </a>
                  ) : '—'
                }
              />
              <Detail
                label="Attribution"
                value={selected.attributionText || (selected.attributionRequired ? 'Required' : 'Not required')}
              />
              <Detail label="Commercial use" value={selected.commercialUseAllowed ? 'Allowed' : 'Review required'} />
              <Detail label="Public performance" value={selected.publicPerformanceAllowed ? 'Allowed' : 'Review required'} />
              <Detail label="Explicit" value={selected.isExplicit ? 'Yes' : 'No'} />
              <Detail label="Verification" value={selected.verificationDate ? new Date(selected.verificationDate).toLocaleString() : '—'} />
              </div>
            </div>
          )}
          <DialogFooter className="shrink-0 gap-2 sm:justify-between">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => selected && updateTrack(selected, { status: 'license_review' })}
                className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                disabled={!selected || saving}
              >
                <FileText className="h-4 w-4" />
                Review license
              </button>
              <button
                onClick={() => selected && updateTrack(selected, { status: 'active' })}
                className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50"
                disabled={!selected || saving}
              >
                <ShieldCheck className="h-4 w-4" />
                Activate
              </button>
              <button
                onClick={() => selected && updateTrack(selected, { status: 'disabled' })}
                className="inline-flex items-center gap-2 rounded-lg border border-amber-200 px-3 py-2 text-sm font-medium text-amber-700 hover:bg-amber-50"
                disabled={!selected || saving}
              >
                <ShieldOff className="h-4 w-4" />
                Disable
              </button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteTrack)} onOpenChange={(open) => !open && setDeleteTrack(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete track?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the track from the global catalog. The provider track ID is required to confirm.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteTrack && (
            <div className="space-y-3 text-sm">
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                <p className="font-medium text-zinc-900">{deleteTrack.title}</p>
                <p className="text-zinc-500">{deleteTrack.artist}</p>
                <p className="mt-2 text-xs text-zinc-500">Provider track ID: <span className="font-medium text-zinc-800">{deleteTrack.providerTrackId}</span></p>
              </div>
              <label className="block text-xs font-medium uppercase tracking-wide text-zinc-500">
                Type the provider track ID to confirm
              </label>
              <input
                value={confirmValue}
                onChange={(e) => setConfirmValue(e.target.value)}
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
                placeholder={deleteTrack.providerTrackId}
              />
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmValue('')}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                confirmDelete();
              }}
              disabled={!deleteTrack || confirmValue.trim().toLowerCase() !== deleteTrack.providerTrackId.trim().toLowerCase() || saving}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {saving ? 'Deleting...' : 'Delete track'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function DualHScroll({ children, deps }: { children: ReactNode; deps: unknown }) {
  const topRef = useRef<HTMLDivElement | null>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const spacerRef = useRef<HTMLDivElement | null>(null);
  const lock = useRef(false);

  const measure = useCallback(() => {
    const body = bodyRef.current;
    const spacer = spacerRef.current;
    if (!body || !spacer) return;
    spacer.style.width = `${body.scrollWidth}px`;
  }, []);

  useEffect(() => {
    measure();
    const body = bodyRef.current;
    if (!body) return;
    const observer = new ResizeObserver(measure);
    observer.observe(body);
    const table = body.querySelector('table');
    if (table) observer.observe(table);
    window.addEventListener('resize', measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [deps, measure]);

  const sync = (from: HTMLDivElement | null, to: HTMLDivElement | null) => {
    if (!from || !to || lock.current) return;
    lock.current = true;
    to.scrollLeft = from.scrollLeft;
    lock.current = false;
  };

  return (
    <>
      <div
        ref={topRef}
        className="music-table-h-scroll h-4 overflow-x-scroll overflow-y-hidden border-b border-zinc-200 bg-zinc-50"
        onScroll={() => sync(topRef.current, bodyRef.current)}
        aria-label="Horizontal scroll for music listings"
      >
        <div ref={spacerRef} className="h-4" />
      </div>
      <div
        ref={bodyRef}
        className="music-table-h-scroll max-h-[min(72vh,780px)] overflow-x-scroll overflow-y-auto"
        onScroll={() => sync(bodyRef.current, topRef.current)}
      >
        {children}
      </div>
    </>
  );
}

function StatCard({ label, value, icon: Icon }: { label: string; value: number; icon: ComponentType<{ className?: string }> }) {
  return (
    <div className="admin-stat">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-zinc-400">{label}</p>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-black/30 text-white">
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-4 text-[1.65rem] font-semibold tracking-tight text-white">{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: TrackStatus }) {
  const styles: Record<TrackStatus, string> = {
    active: 'border-black bg-black text-white',
    disabled: 'border-zinc-200 bg-zinc-100 text-zinc-600',
    license_review: 'border-blue-700 bg-blue-700 text-white',
    broken: 'border-zinc-300 bg-zinc-200 text-zinc-700',
    removed: 'border-zinc-200 bg-zinc-100 text-zinc-500',
    blocked: 'border-zinc-800 bg-zinc-900 text-zinc-100',
    pending_review: 'border-blue-700 bg-blue-700 text-white',
  };

  return <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${styles[status] || styles.disabled}`}>{status}</span>;
}

function Detail({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-lg border border-zinc-200 p-3">
      <div className="text-xs uppercase tracking-wide text-zinc-500">{label}</div>
      <div className="mt-1 break-words text-sm text-zinc-900">{value}</div>
    </div>
  );
}
