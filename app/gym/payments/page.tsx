'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DollarSign,
  TrendingUp,
  CreditCard,
  Plus,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface PaymentRecord {
  id: string;
  member_id: string;
  amount: number;
  discount: number;
  payment_method: string | null;
  payment_date: string;
  notes: string | null;
  members: { member_id: string; name: string; phone: string };
  membership_plans: { name: string } | null;
}

interface Member {
  id: string;
  member_id: string;
  name: string;
}

interface PaymentForm {
  member_id: string;
  amount: string;
  discount: string;
  payment_method: string;
  notes: string;
}

const emptyForm: PaymentForm = {
  member_id: '',
  amount: '',
  discount: '',
  payment_method: '',
  notes: '',
};

const paymentMethods = ['Cash', 'Card', 'Bank Transfer', 'Digital Wallet'];

export default function PaymentsPage() {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;

  const [members, setMembers] = useState<Member[]>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<PaymentForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/payments');
      if (!res.ok) throw new Error('Failed to fetch payments');
      const json = await res.json();
      setPayments(json.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load payments');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMembers = useCallback(async () => {
    try {
      const res = await fetch('/api/members?limit=1000');
      if (!res.ok) return;
      const json = await res.json();
      setMembers(
        (json.data || []).map((m: { id: string; member_id: string; name: string }) => ({
          id: m.id,
          member_id: m.member_id,
          name: m.name,
        }))
      );
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  // Filter by search
  const filtered = search
    ? payments.filter((p) =>
        p.members?.name?.toLowerCase().includes(search.toLowerCase())
      )
    : payments;

  const totalPages = Math.max(1, Math.ceil(filtered.length / limit));
  const paginated = filtered.slice((page - 1) * limit, page * limit);

  // Summary
  const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);
  const now = new Date();
  const thisMonthRevenue = payments
    .filter((p) => {
      const d = new Date(p.payment_date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((sum, p) => sum + p.amount, 0);

  const summaryCards = [
    {
      label: 'Total Revenue',
      value: `$${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: DollarSign,
      color: 'text-sky-600',
      bg: 'bg-sky-50',
    },
    {
      label: "This Month's Revenue",
      value: `$${thisMonthRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: TrendingUp,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      label: 'Payment Count',
      value: payments.length,
      icon: CreditCard,
      color: 'text-zinc-900',
      bg: 'bg-zinc-100',
    },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          member_id: form.member_id,
          amount: Number(form.amount),
          discount: Number(form.discount || 0),
          payment_method: form.payment_method,
          notes: form.notes,
        }),
      });
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j.error || 'Failed to record payment');
      }
      setModalOpen(false);
      setForm(emptyForm);
      fetchPayments();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="px-4 py-4 lg:p-8"
    >
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-500">Revenue</p>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Payments</h1>
          <p className="mt-1 text-sm text-zinc-500">Track member payments and revenue.</p>
        </div>
        <button
          onClick={() => {
            setForm(emptyForm);
            setFormError('');
            setModalOpen(true);
          }}
          className="inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-violet-200"
        >
          <Plus className="h-4 w-4" />
          Add Payment
        </button>
      </div>

      {/* Summary cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {summaryCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.2 }}
              className="admin-stat"
            >
              <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-lg ${card.bg}`}>
                <Icon className={`h-4 w-4 ${card.color}`} />
              </div>
              <p className="text-2xl font-semibold text-zinc-900">{card.value}</p>
              <p className="mt-0.5 text-xs text-zinc-500">{card.label}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Search */}
      <div className="mb-4 relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Search by member name..."
          className="admin-input"
        />
      </div>

      {/* Table */}
      <div className="admin-surface">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-900" />
          </div>
        ) : error ? (
          <div className="flex h-64 items-center justify-center text-sm text-red-500">{error}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-200">
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">Member Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">Discount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">Payment Method</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">Notes</th>
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-sm text-zinc-400">
                      No payments found
                    </td>
                  </tr>
                ) : (
                  paginated.map((p) => (
                    <tr key={p.id} className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50">
                      <td className="px-4 py-3 text-sm font-medium text-zinc-900">
                        {p.members?.name || '—'}
                        {p.members?.member_id && (
                          <span className="ml-1.5 text-xs text-zinc-400">({p.members.member_id})</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-zinc-900">${p.amount.toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm text-zinc-600">${p.discount.toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm text-zinc-600">{p.payment_method || '—'}</td>
                      <td className="px-4 py-3 text-sm text-zinc-600">
                        {new Date(p.payment_date).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-600">{p.notes || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && filtered.length > limit && (
          <div className="flex items-center justify-between border-t border-zinc-200 px-4 py-3">
            <p className="text-xs text-zinc-500">
              Page {page} of {totalPages} · {filtered.length} total
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="inline-flex items-center rounded-md border border-zinc-200 px-2.5 py-1.5 text-xs font-medium text-zinc-700 disabled:opacity-40 enabled:hover:bg-zinc-50"
              >
                <ChevronLeft className="h-4 w-4" />
                Prev
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="inline-flex items-center rounded-md border border-zinc-200 px-2.5 py-1.5 text-xs font-medium text-zinc-700 disabled:opacity-40 enabled:hover:bg-zinc-50"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Payment Modal */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setModalOpen(false)}
              className="absolute inset-0 bg-black/30"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="relative z-10 w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 shadow-xl"
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-zinc-900">Add Payment</h2>
                <button onClick={() => setModalOpen(false)} className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-600">Member *</label>
                  <select
                    required
                    value={form.member_id}
                    onChange={(e) => setForm({ ...form, member_id: e.target.value })}
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-300 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                  >
                    <option value="">Select member...</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.member_id})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-zinc-600">Amount *</label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={form.amount}
                      onChange={(e) => setForm({ ...form, amount: e.target.value })}
                      className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-300 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-zinc-600">Discount</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.discount}
                      onChange={(e) => setForm({ ...form, discount: e.target.value })}
                      className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-300 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-600">Payment Method</label>
                  <select
                    value={form.payment_method}
                    onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-300 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                  >
                    <option value="">Select...</option>
                    {paymentMethods.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-600">Notes</label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    rows={2}
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-300 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                  />
                </div>

                {formError && <p className="text-sm text-red-500">{formError}</p>}

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Record Payment'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
