'use client';

import { type ComponentType, type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
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
  }, [country, genre, provider, search, status]);

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
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Music Library</h1>
          <p className="text-sm text-zinc-500">Review licensing, activate approved tracks, and keep the gym queue clean.</p>
        </div>
                <button
          onClick={fetchTracks}
          className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          <RefreshCcw className="h-4 w-4" />
          Refresh
        </button>
        <button
          onClick={() => setImportOpen(!importOpen)}
          className="inline-flex items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-medium text-sky-700 hover:bg-sky-100"
        >
          <Upload className="h-4 w-4" />
          Import
        </button>
      </div>

      <div className="mb-4 grid gap-3 md:grid-cols-4">
        <StatCard label="Total" value={tracks.length} icon={Music2} />
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
          className="mb-6 rounded-xl border border-zinc-200 bg-white p-5"
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
              className="flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-500"
            />
            <button
              onClick={handleImportSearch}
              disabled={importing || !importSearch.trim()}
              className="inline-flex items-center gap-2 rounded-lg bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600 disabled:opacity-60"
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

      <div className="mb-4 grid gap-3 lg:grid-cols-5">
        <div className="relative lg:col-span-2">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title, artist, track ID..."
            className="w-full rounded-lg border border-zinc-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:border-zinc-400"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as TrackStatus | 'all')}
            className="w-full appearance-none rounded-lg border border-zinc-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:border-zinc-400"
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
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-zinc-400"
        />
        <input
          value={genre}
          onChange={(e) => setGenre(e.target.value)}
          placeholder="Genre"
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-zinc-400"
        />
      </div>

      <div className="mb-4 flex items-center gap-3">
        <input
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          placeholder="Country / region"
          className="w-full max-w-xs rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-zinc-400"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">Track</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">Provider</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">Genre</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">Energy</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">Region</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">License</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">Status</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-zinc-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tracks.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-sm text-zinc-500">
                    No tracks found. Use the "Import" button to search Audius and add tracks to the catalog, or add approved data here to start filling the library.
                  </td>
                </tr>
              ) : (
                tracks.map((track) => (
                  <tr key={track.id} className="border-b border-zinc-100 last:border-0">
                    <td className="px-4 py-3">
                      <div className="max-w-[260px]">
                        <p className="truncate text-sm font-medium text-zinc-900">{track.title}</p>
                        <p className="truncate text-xs text-zinc-500">{track.artist}</p>
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
        </div>
      </div>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selected?.title || 'Track details'}</DialogTitle>
            <DialogDescription>{selected?.artist || ' '}</DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="grid gap-4 text-sm text-zinc-700 sm:grid-cols-2">
              <Detail label="Provider" value={selected.provider} />
              <Detail label="Provider track ID" value={selected.providerTrackId} />
              <Detail label="Genre" value={selected.genre || '—'} />
              <Detail label="Sub-genre" value={selected.subGenre || '—'} />
              <Detail label="Energy level" value={selected.energyLevel ? String(selected.energyLevel) : '—'} />
              <Detail label="Region" value={selected.countryOrRegion || '—'} />
              <Detail label="License" value={selected.licenseName || '—'} />
              <Detail label="Status" value={selected.status} />
              <Detail label="Source" value={selected.source || '—'} />
              <Detail
                label="Source URL"
                value={
                  selected.sourceUrl ? (
                    <a href={selected.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sky-700 underline">
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
          )}
          <DialogFooter className="gap-2 sm:justify-between">
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

function StatCard({ label, value, icon: Icon }: { label: string; value: number; icon: ComponentType<{ className?: string }> }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-100 text-zinc-700">
        <Icon className="h-4 w-4" />
      </div>
      <div className="text-2xl font-semibold text-zinc-900">{value}</div>
      <div className="text-xs text-zinc-500">{label}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: TrackStatus }) {
  const styles: Record<TrackStatus, string> = {
    active: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    disabled: 'border-zinc-200 bg-zinc-50 text-zinc-600',
    license_review: 'border-amber-200 bg-amber-50 text-amber-700',
    broken: 'border-red-200 bg-red-50 text-red-700',
    removed: 'border-zinc-300 bg-zinc-100 text-zinc-700',
    blocked: 'border-red-200 bg-red-50 text-red-700',
    pending_review: 'border-amber-200 bg-amber-50 text-amber-700',
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
