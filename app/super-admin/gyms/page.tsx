'use client';

import { type ComponentType, type FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Building2,
  Eye,
  EyeOff,
  Loader2,
  Plus,
  Search,
  ShieldCheck,
  ShieldOff,
  Trash2,
  Pencil,
  X,
  Lock,
    Copy,
  Key,
  Save,
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

interface GymRow {
  id: string;
  gym_id: string;
  name: string;
  owner_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  status: string;
  admin_username: string | null;
  admin_password: string | null;
  memberCount: number;
  revenue: number;
  created_at: string;
}

type FormState = {
  name: string;
  gym_id: string;
  owner_name: string;
  username: string;
  phone: string;
  email: string;
  address: string;
  status: string;
  admin_password: string;
};

const EMPTY_FORM: FormState = {
  name: '',
  gym_id: '',
  owner_name: '',
  username: '',
  phone: '',
  email: '',
  address: '',
  status: 'active',
  admin_password: '',
};

export default function GymsPage() {
  const [gyms, setGyms] = useState<GymRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState<'create' | 'view' | 'edit'>('create');
  const [selectedGym, setSelectedGym] = useState<GymRow | null>(null);
  const [deleteGym, setDeleteGym] = useState<GymRow | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState('');
    const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
    const [resettingPassword, setResettingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState<string | null>(null);
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [loadingPassword, setLoadingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [settingCustomPassword, setSettingCustomPassword] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});

  const fetchGyms = useCallback(async () => {
    try {
      const res = await fetch('/api/gyms');
      if (!res.ok) return;
      const data = await res.json();
      setGyms(data.data || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGyms();
  }, [fetchGyms]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return gyms;
    return gyms.filter((g) =>
      [g.name, g.gym_id, g.owner_name || '', g.admin_username || '', g.status]
        .join(' ')
        .toLowerCase()
        .includes(term)
    );
    }, [gyms, search]);

  const loadGymPassword = useCallback(async (gymId: string) => {
    setLoadingPassword(true);
    try {
      const res = await fetch(`/api/gyms/${gymId}`);
      if (!res.ok) {
        setCurrentPassword(null);
        return;
      }
      const json = await res.json();
      setCurrentPassword(json.data?.admin_password || null);
    } catch {
      setCurrentPassword(null);
    } finally {
      setLoadingPassword(false);
    }
  }, []);

  const openCreate = () => {
    setMode('create');
    setSelectedGym(null);
    setForm(EMPTY_FORM);
    setError('');
    setSuccess('');
    setModalOpen(true);
  };

            const openView = (gym: GymRow) => {
    setMode('view');
    setSelectedGym(gym);
    setForm({
      name: gym.name,
      gym_id: gym.gym_id,
      owner_name: gym.owner_name || '',
      username: gym.admin_username || '',
      phone: gym.phone || '',
      email: gym.email || '',
      address: gym.address || '',
      status: gym.status,
      admin_password: '',
    });
    setShowNewPassword(false);
    setNewPassword('');
    setCurrentPassword(null);
    setError('');
    setSuccess('');
    setModalOpen(true);
    loadGymPassword(gym.id);
  };

    const openEdit = (gym: GymRow) => {
    setMode('edit');
    setSelectedGym(gym);
    setForm({
      name: gym.name,
      gym_id: gym.gym_id,
      owner_name: gym.owner_name || '',
      username: gym.admin_username || '',
      phone: gym.phone || '',
      email: gym.email || '',
      address: gym.address || '',
      status: gym.status,
      admin_password: '',
    });
    setShowNewPassword(false);
    setNewPassword('');
    setCurrentPassword(null);
    setError('');
    setSuccess('');
    setModalOpen(true);
    loadGymPassword(gym.id);
  };

    const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const pendingPassword = mode === 'create' ? form.admin_password : newPassword;
    if (pendingPassword && pendingPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const payload: {
        name: string;
        owner_name: string;
        phone: string;
        email: string;
        address: string;
        password?: string;
      } = {
        name: form.name,
        owner_name: form.owner_name,
        phone: form.phone,
        email: form.email,
        address: form.address,
      };

      if (pendingPassword) {
        payload.password = pendingPassword;
      }

      const res = await fetch(mode === 'create' ? '/api/gyms' : `/api/gyms/${selectedGym?.id}`, {
        method: mode === 'create' ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          mode === 'create'
            ? payload
            : {
                ...payload,
                gym_id: form.gym_id,
                admin_username: form.username,
                status: form.status,
              }
        ),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Failed to ${mode === 'create' ? 'create' : 'update'} gym`);
      }

      await fetchGyms();
      if (mode === 'create' && data.data?.adminUser?.temporaryPassword) {
        setSuccess(`Gym created. Temporary password: ${data.data.adminUser.temporaryPassword}`);
      } else if (mode === 'edit' && pendingPassword) {
        setCurrentPassword(pendingPassword);
        setNewPassword('');
        setSuccess('Gym updated and password set.');
      } else {
        setSuccess(mode === 'create' ? 'Gym created.' : 'Gym updated.');
      }
      if (mode !== 'create' && !pendingPassword) setModalOpen(false);
      if (mode === 'create') {
        setForm(EMPTY_FORM);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  const toggleGymStatus = async (gym: GymRow, nextStatus: 'active' | 'suspended') => {
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/gyms/${gym.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: nextStatus,
          name: gym.name,
          owner_name: gym.owner_name,
          phone: gym.phone,
          email: gym.email,
          address: gym.address,
          gym_id: gym.gym_id,
          admin_username: gym.admin_username,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update gym status');
      await fetchGyms();
      setSuccess(`Gym ${nextStatus === 'active' ? 'activated' : 'suspended'}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update gym');
    } finally {
      setSaving(false);
    }
  };

  const deleteGymNow = async () => {
    if (!deleteGym) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/gyms/${deleteGym.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmGymId: deleteConfirm }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete gym');
      setDeleteGym(null);
      setDeleteConfirm('');
setSuccess(`Deleted ${deleteGym.name}.`);
      await fetchGyms();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete gym');
    } finally {
      setSaving(false);
    }
  };

    const resetGymPassword = async () => {
    if (!selectedGym) return;
    setResettingPassword(true);
    setError('');
    setSuccess('');
    setNewPassword('');
    setShowNewPassword(false);
    try {
      const res = await fetch(`/api/gyms/${selectedGym.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reset_password: true,
          name: selectedGym.name,
          owner_name: selectedGym.owner_name ?? '',
          phone: selectedGym.phone ?? '',
          email: selectedGym.email ?? '',
          address: selectedGym.address ?? '',
          gym_id: selectedGym.gym_id,
          admin_username: selectedGym.admin_username ?? '',
          status: selectedGym.status,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reset password');
      if (data.data?.admin_password) {
        setCurrentPassword(data.data.admin_password);
        setGyms((current) =>
          current.map((gym) =>
            gym.id === selectedGym.id ? { ...gym, admin_password: data.data.admin_password } : gym
          )
        );
        setSuccess(
          'Password reset to a new random value. It now appears under "Admin Password" below — share it securely with the gym owner.'
        );
      } else {
        setSuccess('Password reset.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password');
    } finally {
      setResettingPassword(false);
    }
  };

  const setCustomGymPassword = async () => {
    if (!selectedGym) return;
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    setSettingCustomPassword(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`/api/gyms/${selectedGym.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: selectedGym.name,
          owner_name: selectedGym.owner_name ?? '',
          phone: selectedGym.phone ?? '',
          email: selectedGym.email ?? '',
          address: selectedGym.address ?? '',
          gym_id: selectedGym.gym_id,
          admin_username: selectedGym.admin_username ?? '',
          status: selectedGym.status,
          password: newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to set password');
      setCurrentPassword(newPassword);
      setGyms((current) =>
        current.map((gym) =>
          gym.id === selectedGym.id ? { ...gym, admin_password: newPassword } : gym
        )
      );
      setNewPassword('');
      setShowNewPassword(false);
      setSuccess('Password set. The gym admin can now sign in with this password.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set password');
    } finally {
      setSettingCustomPassword(false);
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
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-sky-600">Network</p>
          <h1 className="admin-page-title">Gyms</h1>
          <p className="admin-page-sub">Manage every gym on the platform.</p>
        </div>
        <button
          onClick={openCreate}
          className="admin-primary-btn"
        >
          <Plus className="h-4 w-4" />
          Add Gym
        </button>
      </div>

      <div className="mb-4 flex items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, ID, owner, or username..."
            className="admin-input"
          />
        </div>
        {(error || success) && (
          <p className={`text-sm ${error ? 'text-red-600' : 'text-emerald-700'}`}>{error || success}</p>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="admin-surface p-10 text-center">
          <Building2 className="mx-auto h-10 w-10 text-zinc-300" />
          <h2 className="mt-4 text-base font-semibold text-zinc-900">No gyms have been added yet.</h2>
          <p className="mt-1 text-sm text-zinc-500">Create your first gym to start managing the platform.</p>
          <button
            onClick={openCreate}
            className="admin-primary-btn mt-5"
          >
            <Plus className="h-4 w-4" />
            Add Gym
          </button>
        </div>
      ) : (
        <div className="admin-surface">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">Gym Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">Gym ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">Owner</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">Username</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">Password</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">Members</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">Created Date</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-zinc-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((gym) => (
                  <tr key={gym.id} className="border-b border-zinc-100 last:border-0">
                    <td className="px-4 py-3 text-sm font-medium text-zinc-900">{gym.name}</td>
                    <td className="px-4 py-3 text-sm text-zinc-600">{gym.gym_id}</td>
                    <td className="px-4 py-3 text-sm text-zinc-600">{gym.owner_name || '—'}</td>
                    <td className="px-4 py-3 text-sm text-zinc-600">{gym.admin_username || '—'}</td>
                    <td className="px-4 py-3 text-sm text-zinc-600">
                      {gym.admin_password ? (
                        <div className="flex min-w-[150px] items-center gap-2">
                          <code className="max-w-[120px] truncate rounded border border-zinc-200 bg-zinc-50 px-2 py-1 font-mono text-xs text-zinc-800">
                            {visiblePasswords[gym.id] ? gym.admin_password : '********'}
                          </code>
                          <button
                            type="button"
                            onClick={() =>
                              setVisiblePasswords((current) => ({
                                ...current,
                                [gym.id]: !current[gym.id],
                              }))
                            }
                            className="rounded p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700"
                            title={visiblePasswords[gym.id] ? 'Hide password' : 'Show password'}
                          >
                            {visiblePasswords[gym.id] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(gym.admin_password || '');
                              setSuccess('Password copied to clipboard.');
                            }}
                            className="rounded p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700"
                            title="Copy password"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openEdit(gym)}
                          className="text-xs font-medium text-zinc-700 underline-offset-2 hover:underline"
                        >
                          Set password
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-600">{gym.memberCount}</td>
                    <td className="px-4 py-3">
                      <StatusPill status={gym.status} />
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-600">
                      {gym.created_at ? new Date(gym.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <ActionButton icon={Eye} label="View" onClick={() => openView(gym)} />
                        <ActionButton icon={Pencil} label="Edit" onClick={() => openEdit(gym)} />
                        {gym.status === 'active' ? (
                          <ActionButton icon={ShieldOff} label="Suspend" onClick={() => toggleGymStatus(gym, 'suspended')} />
                        ) : (
                          <ActionButton icon={ShieldCheck} label="Activate" onClick={() => toggleGymStatus(gym, 'active')} />
                        )}
                        <ActionButton icon={Trash2} label="Delete" danger onClick={() => setDeleteGym(gym)} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setModalOpen(false)}
              className="absolute inset-0 bg-zinc-950/45 backdrop-blur-[2px]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.18 }}
              className="relative z-10 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl"
            >
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-zinc-900">
                    {mode === 'create' ? 'Add Gym' : mode === 'edit' ? 'Edit Gym' : 'View Gym'}
                  </h2>
                  <p className="text-sm text-zinc-500">
                    {mode === 'create'
                      ? 'Create a new tenant and gym admin account.'
                      : 'Update the gym record without breaking existing data.'}
                  </p>
                </div>
                <button onClick={() => setModalOpen(false)} className="text-zinc-400 hover:text-zinc-600">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="grid gap-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Gym Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} disabled={mode === 'view'} />
                  <Field label="Gym ID" value={form.gym_id} onChange={(v) => setForm({ ...form, gym_id: v })} disabled={mode !== 'edit'} helperText={mode === 'create' ? 'Generated automatically on create.' : 'Editable by Super Admin only.'} />
                  <Field label="Owner Name" value={form.owner_name} onChange={(v) => setForm({ ...form, owner_name: v })} disabled={mode === 'view'} />
                  <Field label="Username" value={form.username} onChange={(v) => setForm({ ...form, username: v })} disabled={mode !== 'edit'} helperText={mode === 'create' ? 'Generated automatically on create.' : 'Gym admin login username.'} />
                  <Field label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} disabled={mode === 'view'} />
                  <Field label="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} disabled={mode === 'view'} />
                </div>
                <Field label="Address" value={form.address} onChange={(v) => setForm({ ...form, address: v })} disabled={mode === 'view'} textarea />
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-zinc-700">Status</label>
                    <select
                      value={form.status}
                      onChange={(e) => setForm({ ...form, status: e.target.value })}
                      disabled={mode !== 'edit'}
                      className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400 disabled:bg-zinc-50"
                    >
                      <option value="active">active</option>
                      <option value="suspended">suspended</option>
                    </select>
                    {mode === 'create' && <p className="mt-1 text-xs text-zinc-500">New gyms start active.</p>}
                  </div>
                  <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-600">
                    <p className="font-medium text-zinc-900">Notes</p>
                    <p className="mt-1">Changing Gym ID or username keeps the same underlying record and tenant data connected.</p>
                                    </div>
                </div>

                                {/* Create-mode: let Super Admin set the initial gym admin password */}
                {mode === 'create' && (
                  <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                    <p className="text-xs uppercase tracking-wide text-zinc-500">Admin Password</p>
                    <div className="mt-1.5 relative">
                      <input
                        type={showCreatePassword ? 'text' : 'password'}
                        value={form.admin_password || ''}
                        onChange={(e) => setForm({ ...form, admin_password: e.target.value })}
                        placeholder="Set a password for the gym admin login"
                        className="w-full rounded-lg border border-zinc-200 px-3 py-2 pr-10 text-sm outline-none focus:border-zinc-400"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCreatePassword(!showCreatePassword)}
                        className="absolute inset-y-0 right-0 flex items-center rounded-r-lg px-2 text-zinc-500 hover:text-zinc-700"
                        title={showCreatePassword ? 'Hide password' : 'Show password'}
                      >
                        {showCreatePassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      </button>
                    </div>
                    <p className="mt-1 text-xs text-zinc-500">This password lets the gym admin sign in. Leave blank to auto-generate.</p>
                  </div>
                )}

                {/* Admin Credentials / Password Reset (view & edit modes) */}
                {mode !== 'create' && (
                  <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                                        <div className="mb-3 flex items-center justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-zinc-500">Admin Login</p>
                        <p className="font-medium text-zinc-900">{form.username || selectedGym?.admin_username || '—'}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {mode === 'view' && (
                          <button
                            type="button"
                            onClick={() => loadGymPassword(selectedGym?.id ?? '')}
                            disabled={loadingPassword}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
                            title="View current password"
                          >
                            {loadingPassword ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />}
                            {loadingPassword ? 'Loading…' : 'View'}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={resetGymPassword}
                          disabled={resettingPassword}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
                        >
                          {resettingPassword ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Lock className="h-3.5 w-3.5" />
                          )}
                          {resettingPassword ? 'Resetting…' : 'Reset Password'}
                        </button>
                      </div>
                    </div>

                                        {/* Viewed / current password display */}
                                        {currentPassword && (
                      <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 p-3">
                        <div className="mb-1 flex items-center justify-between">
                          <p className="text-xs uppercase tracking-wide text-emerald-700">
                            {mode === 'view' ? 'Admin Password' : 'Temporary Password'}
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              if (currentPassword) {
                                navigator.clipboard.writeText(currentPassword);
                                setCurrentPassword(null);
                                setSuccess('Password copied to clipboard! Share it securely with the gym owner.');
                              }
                            }}
                            className="rounded p-1 text-emerald-700 hover:bg-emerald-100"
                            title="Copy to clipboard"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <code className="break-all font-mono text-sm text-zinc-900 select-all">
                          {currentPassword}
                        </code>
                        {mode === 'view' ? (
                          <p className="mt-1 text-xs text-zinc-600">Use this password to sign in to the gym admin panel as this gym.</p>
                        ) : (
                          <p className="mt-1 text-xs text-zinc-600">Share this securely. The gym owner should change it after first login.</p>
                        )}
                      </div>
                    )}

                    {/* Edit-mode: set a new password directly */}
                    {mode === 'edit' && (
                      <div className="mt-3 space-y-2">
                        <div className="relative">
                          <input
                            type={showNewPassword ? 'text' : 'password'}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Enter a new password to set (optional)"
                            className="w-full rounded-lg border border-zinc-200 px-3 py-2 pr-10 text-sm outline-none focus:border-zinc-400"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute inset-y-0 right-0 flex items-center rounded-r-lg px-2 text-zinc-500 hover:text-zinc-700"
                            title={showNewPassword ? 'Hide password' : 'Show password'}
                          >
                            {showNewPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                          </button>
                        </div>
                        {newPassword && (
                          <button
                            type="button"
                            onClick={setCustomGymPassword}
                            disabled={settingCustomPassword}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
                          >
                            {settingCustomPassword ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                            {settingCustomPassword ? 'Setting…' : 'Set Password'}
                          </button>
                        )}
                      </div>
                    )}

                    {mode === 'view' && !currentPassword && (
                      <p className="text-xs text-zinc-500">Click the View button to see the current password or Reset Password to generate a new one the gym owner can use to sign in.</p>
                    )}
                  </div>
                )}
                {error && <p className="text-sm text-red-600">{error}</p>}
                {success && <p className="text-sm text-emerald-700">{success}</p>}
                {mode !== 'view' && (
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === 'create' ? 'Create Gym' : 'Save Changes'}
                  </button>
                )}
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AlertDialog open={Boolean(deleteGym)} onOpenChange={(open) => !open && setDeleteGym(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Gym?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this gym and its associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteGym && (
            <div className="space-y-3 text-sm">
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                <p className="font-medium text-zinc-900">{deleteGym.name}</p>
                <p className="text-zinc-500">Gym ID: {deleteGym.gym_id}</p>
                <p className="text-zinc-500">Members: {deleteGym.memberCount}</p>
              </div>
              <label className="block text-xs font-medium uppercase tracking-wide text-zinc-500">Type the Gym ID to confirm</label>
              <input
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder={deleteGym.gym_id}
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
              />
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteConfirm('')}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                deleteGymNow();
              }}
              disabled={!deleteGym || deleteConfirm.trim().toLowerCase() !== deleteGym.gym_id.trim().toLowerCase() || saving}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {saving ? 'Deleting...' : 'Delete Gym'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ActionButton({
  icon: Icon,
  label,
  danger,
  onClick,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs font-medium ${
        danger
          ? 'border-red-200 text-red-700 hover:bg-red-50'
          : 'border-zinc-200 text-zinc-700 hover:bg-zinc-50'
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

function Field({
  label,
  value,
  onChange,
  disabled,
  textarea,
  helperText,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  textarea?: boolean;
  helperText?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-zinc-700">{label}</label>
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="min-h-[88px] w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400 disabled:bg-zinc-50"
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400 disabled:bg-zinc-50"
        />
      )}
      {helperText && <p className="mt-1 text-xs text-zinc-500">{helperText}</p>}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const active = status === 'active';
  return (
    <span
      className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${
        active ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-zinc-200 bg-zinc-50 text-zinc-600'
      }`}
    >
      {status}
    </span>
  );
}
