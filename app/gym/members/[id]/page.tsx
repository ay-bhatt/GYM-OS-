'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import QRCode from 'qrcode';
import {
  ArrowLeft,
  Phone,
  MapPin,
  AlertCircle,
  Calendar,
  CreditCard,
  QrCode,
  Pencil,
  CheckCircle,
  X,
} from 'lucide-react';

interface Plan {
  id: string;
  name: string;
  duration_days: number;
  price: number;
  discount: number;
  final_price: number;
  description: string | null;
}

interface Payment {
  id: string;
  amount: number;
  discount: number;
  payment_method: string | null;
  payment_date: string;
  notes: string | null;
}

interface MemberDetail {
  id: string;
  member_id: string;
  name: string;
  phone: string | null;
  address: string | null;
  emergency_contact: string | null;
  date_of_birth: string | null;
  gender: string | null;
  age: number | null;
  plan_id: string | null;
  start_date: string | null;
  expiry_date: string | null;
  amount_paid: number;
  status: string;
  notes: string | null;
  plan: Plan | null;
  attendanceCount: number;
  payments: Payment[];
}

const statusStyles: Record<string, string> = {
  active: 'bg-green-50 text-green-700 border-green-200',
  expiring: 'bg-amber-50 text-amber-700 border-amber-200',
  expired: 'bg-red-50 text-red-700 border-red-200',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${statusStyles[status] || statusStyles.active}`}>
      {status}
    </span>
  );
}

export default function MemberDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [member, setMember] = useState<MemberDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [qrUrl, setQrUrl] = useState('');

  const fetchMember = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/members/${id}`);
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j.error || 'Failed to fetch member');
      }
      const json = await res.json();
      setMember(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load member');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchQR = useCallback(async () => {
    try {
      const res = await fetch(`/api/members/${id}/qr`);
      if (!res.ok) return;
      const json = await res.json();
      if (json.data?.qr_token) {
        const url = await QRCode.toDataURL(json.data.qr_token, {
          width: 200,
          margin: 2,
          color: { dark: '#18181b', light: '#ffffff' },
        });
        setQrUrl(url);
      }
    } catch {
      // silent
    }
  }, [id]);

  useEffect(() => {
    fetchMember();
    fetchQR();
  }, [fetchMember, fetchQR]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-900" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 lg:p-8">
        <button onClick={() => router.push('/gym/members')} className="mb-4 inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900">
          <ArrowLeft className="h-4 w-4" /> Back to Members
        </button>
        <p className="text-sm text-red-500">{error}</p>
      </div>
    );
  }

  if (!member) return null;

  const initials = member.name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="p-6 lg:p-8"
    >
      {/* Back button */}
      <button
        onClick={() => router.push('/gym/members')}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Members
      </button>

      {/* Header card */}
      <div className={`relative mb-6 overflow-hidden rounded-[28px] border p-6 shadow-sm ${
        member.status !== 'expired' && Number(member.amount_paid) > 0
          ? 'border-emerald-100 bg-emerald-50'
          : 'border-rose-100 bg-rose-50'
      }`}>
        {member.plan_id && (
          <span className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full bg-amber-400 text-white shadow-sm">
            <span className="text-sm">★</span>
          </span>
        )}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className={`flex h-16 w-16 items-center justify-center rounded-full text-xl font-semibold text-white ${
              member.status !== 'expired' && Number(member.amount_paid) > 0 ? 'bg-emerald-500' : 'bg-rose-400'
            }`}>
              {initials}
            </div>
            <div>
              <h1 className="text-xl font-semibold text-zinc-900">{member.name}</h1>
              <p className="text-sm text-zinc-500">{member.member_id}{member.gender ? ` · ${member.gender}` : ''}</p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <StatusBadge status={member.status} />
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  member.status !== 'expired' && Number(member.amount_paid) > 0
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-rose-100 text-rose-700'
                }`}>
                  {member.status !== 'expired' && Number(member.amount_paid) > 0 ? 'Fee paid' : 'Fee due'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Info grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Contact info */}
        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="mb-4 text-sm font-semibold text-zinc-900">Contact Information</h2>
          <div className="space-y-3">
            <div className="flex items-center gap-2.5 text-sm">
              <Phone className="h-4 w-4 text-zinc-400" />
              <span className="text-zinc-600">{member.phone || '—'}</span>
            </div>
            <div className="flex items-center gap-2.5 text-sm">
              <MapPin className="h-4 w-4 text-zinc-400" />
              <span className="text-zinc-600">{member.address || '—'}</span>
            </div>
            <div className="flex items-center gap-2.5 text-sm">
              <AlertCircle className="h-4 w-4 text-zinc-400" />
              <span className="text-zinc-600">{member.emergency_contact || '—'}</span>
            </div>
            <div className="flex items-center gap-2.5 text-sm">
              <Calendar className="h-4 w-4 text-zinc-400" />
              <span className="text-zinc-600">
                {member.date_of_birth ? new Date(member.date_of_birth).toLocaleDateString() : '—'}
                {member.age ? ` (${member.age} yrs)` : ''}
              </span>
            </div>
            {member.gender && (
              <div className="flex items-center gap-2.5 text-sm">
                <span className="text-zinc-400">Gender:</span>
                <span className="capitalize text-zinc-600">{member.gender}</span>
              </div>
            )}
          </div>
          {member.notes && (
            <div className="mt-4 border-t border-zinc-100 pt-3">
              <p className="mb-1 text-xs font-medium text-zinc-500">Notes</p>
              <p className="text-sm text-zinc-600">{member.notes}</p>
            </div>
          )}
        </div>

        {/* Membership info */}
        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="mb-4 text-sm font-semibold text-zinc-900">Membership</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-500">Plan</span>
              <span className="font-medium text-zinc-900">{member.plan?.name || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Duration</span>
              <span className="text-zinc-600">{member.plan?.duration_days ? `${member.plan.duration_days} days` : '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Start Date</span>
              <span className="text-zinc-600">{member.start_date ? new Date(member.start_date).toLocaleDateString() : '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Expiry Date</span>
              <span className="text-zinc-600">{member.expiry_date ? new Date(member.expiry_date).toLocaleDateString() : '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Amount Paid</span>
              <span className="font-medium text-zinc-900">${member.amount_paid.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* QR Code */}
        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-zinc-900">
            <QrCode className="h-4 w-4" /> QR Code
          </h2>
          <div className="flex flex-col items-center">
            {qrUrl ? (
              <img src={qrUrl} alt="Member QR Code" className="rounded-lg border border-zinc-200" />
            ) : (
              <div className="flex h-[200px] w-[200px] items-center justify-center rounded-lg border border-zinc-200 text-xs text-zinc-400">
                Generating...
              </div>
            )}
            <p className="mt-3 text-xs text-zinc-500">Scan to check in</p>
          </div>
        </div>
      </div>

      {/* Attendance summary */}
      <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-900">Attendance</h2>
          <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700">
            {member.attendanceCount} total
          </span>
        </div>
        <p className="py-4 text-center text-sm text-zinc-400">
          {member.attendanceCount > 0
            ? `${member.attendanceCount} check-in${member.attendanceCount !== 1 ? 's' : ''} recorded`
            : 'No attendance records yet'}
        </p>
      </div>

      {/* Payment history */}
      <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-5">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-zinc-900">
          <CreditCard className="h-4 w-4" /> Payment History
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-200">
                <th className="pb-2 text-left text-xs font-medium text-zinc-500">Date</th>
                <th className="pb-2 text-left text-xs font-medium text-zinc-500">Amount</th>
                <th className="pb-2 text-left text-xs font-medium text-zinc-500">Discount</th>
                <th className="pb-2 text-left text-xs font-medium text-zinc-500">Method</th>
                <th className="pb-2 text-left text-xs font-medium text-zinc-500">Notes</th>
              </tr>
            </thead>
            <tbody>
              {member.payments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-sm text-zinc-400">No payments recorded</td>
                </tr>
              ) : (
                member.payments.map((p) => (
                  <tr key={p.id} className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50">
                    <td className="py-3 text-sm text-zinc-600">
                      {new Date(p.payment_date).toLocaleDateString()}
                    </td>
                    <td className="py-3 text-sm font-medium text-zinc-900">${p.amount.toFixed(2)}</td>
                    <td className="py-3 text-sm text-zinc-600">${p.discount.toFixed(2)}</td>
                    <td className="py-3 text-sm text-zinc-600">{p.payment_method || '—'}</td>
                    <td className="py-3 text-sm text-zinc-600">{p.notes || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}
