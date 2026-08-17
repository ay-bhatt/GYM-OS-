'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  UserCheck,
  UserX,
  Clock,
  DollarSign,
  TrendingUp,
  Calendar,
  Lock,
  Copy,
  Loader2,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';

interface Stats {
  totalMembers: number;
  activeMembers: number;
  expiringMembers: number;
  expiredMembers: number;
  totalRevenue: number;
  todayAttendance: number;
}

interface AttendanceData {
  date: string;
  count: number;
}

interface RevenueData {
  month: string;
  revenue: number;
}

interface RecentMember {
  id: string;
  member_id: string;
  name: string;
  status: string;
  expiry_date: string | null;
}

export default function GymDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [attendanceData, setAttendanceData] = useState<AttendanceData[]>([]);
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [recentMembers, setRecentMembers] = useState<RecentMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [resetError, setResetError] = useState('');

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard');
      if (!res.ok) return;
      const data = await res.json();
      setStats(data.stats);
      setAttendanceData(data.attendanceChart || []);
      setRevenueData(data.revenueChart || []);
      setRecentMembers(data.recentMembers || []);
    } finally {
      setLoading(false);
    }
  }, []);

    useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const handleResetPassword = async () => {
    setResettingPassword(true);
    setResetError('');
    setTempPassword(null);
    try {
      const res = await fetch('/api/auth/reset-password', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reset password');
      if (data.data?.temporaryPassword) {
        setTempPassword(data.data.temporaryPassword);
      } else {
        setResetError('Password reset, but no new password returned.');
      }
    } catch (err) {
      setResetError(err instanceof Error ? err.message : 'Failed to reset password');
    } finally {
      setResettingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900" />
      </div>
    );
  }

  const cards = [
    {
      label: 'Total Members',
      value: stats?.totalMembers ?? 0,
      icon: Users,
      color: 'text-zinc-900',
      bg: 'bg-zinc-100',
    },
    {
      label: 'Active',
      value: stats?.activeMembers ?? 0,
      icon: UserCheck,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      label: 'Expiring Soon',
      value: stats?.expiringMembers ?? 0,
      icon: Clock,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
    {
      label: 'Expired',
      value: stats?.expiredMembers ?? 0,
      icon: UserX,
      color: 'text-red-600',
      bg: 'bg-red-50',
    },
    {
      label: 'Total Revenue',
      value: `$${(stats?.totalRevenue ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: DollarSign,
      color: 'text-sky-600',
      bg: 'bg-sky-50',
    },
    {
      label: 'Today\'s Attendance',
      value: stats?.todayAttendance ?? 0,
      icon: Calendar,
      color: 'text-zinc-900',
      bg: 'bg-zinc-100',
    },
  ];

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-zinc-900">Dashboard</h1>
        <p className="text-sm text-zinc-500">Overview of your gym's performance.</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {cards.map((card, i) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.2 }}
              className="rounded-xl border border-zinc-200 bg-white p-4"
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

      {/* Charts */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.3 }}
          className="rounded-xl border border-zinc-200 bg-white p-5"
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-900">Attendance (Last 14 Days)</h2>
            <TrendingUp className="h-4 w-4 text-zinc-400" />
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={attendanceData}>
              <defs>
                <linearGradient id="attendanceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#71717a' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#71717a' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  borderRadius: '8px',
                  border: '1px solid #e4e4e7',
                  fontSize: '12px',
                }}
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#0ea5e9"
                strokeWidth={2}
                fill="url(#attendanceGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.3 }}
          className="rounded-xl border border-zinc-200 bg-white p-5"
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-900">Revenue (Last 6 Months)</h2>
            <DollarSign className="h-4 w-4 text-zinc-400" />
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#71717a' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#71717a' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  borderRadius: '8px',
                  border: '1px solid #e4e4e7',
                  fontSize: '12px',
                }}
                formatter={(value: number) => [`$${value.toLocaleString()}`, 'Revenue']}
              />
              <Bar dataKey="revenue" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Recent Members */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.3 }}
        className="mt-6 rounded-xl border border-zinc-200 bg-white p-5"
      >
        <h2 className="mb-4 text-sm font-semibold text-zinc-900">Recent Members</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-200">
                <th className="pb-2 text-left text-xs font-medium text-zinc-500">Member ID</th>
                <th className="pb-2 text-left text-xs font-medium text-zinc-500">Name</th>
                <th className="pb-2 text-left text-xs font-medium text-zinc-500">Status</th>
                <th className="pb-2 text-left text-xs font-medium text-zinc-500">Expiry</th>
              </tr>
            </thead>
            <tbody>
              {recentMembers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-sm text-zinc-400">No members yet</td>
                </tr>
              ) : (
                recentMembers.map((m) => (
                  <tr key={m.id} className="border-b border-zinc-100 last:border-0">
                    <td className="py-3 text-sm text-zinc-600">{m.member_id}</td>
                    <td className="py-3 text-sm font-medium text-zinc-900">{m.name}</td>
                    <td className="py-3">
                      <StatusBadge status={m.status} />
                    </td>
                    <td className="py-3 text-sm text-zinc-600">
                      {m.expiry_date ? new Date(m.expiry_date).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
                </div>
      </motion.div>

      {/* Account Security */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.3 }}
        className="mt-6 rounded-xl border border-zinc-200 bg-white p-5"
      >
        <h2 className="mb-4 text-sm font-semibold text-zinc-900">Account Security</h2>
        <div className="space-y-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-500">Gym Admin Login</p>
            <p className="mt-1 text-sm text-zinc-600">
              Your username is pre-set when the gym was created. You can reset your password below
              if you've forgotten it or need a fresh temporary credential.
            </p>
          </div>

          <button
            onClick={handleResetPassword}
            disabled={resettingPassword}
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
          >
            {resettingPassword ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Lock className="h-4 w-4" />
            )}
            {resettingPassword ? 'Resetting…' : 'Reset Password'}
          </button>

          {tempPassword && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs uppercase tracking-wide text-emerald-700">New Temporary Password</p>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(tempPassword);
                    setTempPassword(null);
                  }}
                  className="rounded p-1 text-emerald-700 hover:bg-emerald-100"
                  title="Copy to clipboard"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </div>
              <code className="block font-mono text-sm text-zinc-900 select-all">{tempPassword}</code>
              <p className="mt-2 text-xs text-zinc-600">
                Use this to sign in, then change it from your account settings.
              </p>
            </div>
          )}

                    {resetError && <p className="text-sm text-red-600">{resetError}</p>}
        </div>
      </motion.div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: 'bg-green-50 text-green-700 border-green-200',
    expiring: 'bg-amber-50 text-amber-700 border-amber-200',
    expired: 'bg-red-50 text-red-700 border-red-200',
  };
  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${styles[status] || styles.active}`}>
      {status}
    </span>
  );
}
