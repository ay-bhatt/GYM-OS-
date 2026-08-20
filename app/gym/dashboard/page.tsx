'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Calendar,
  Copy,
  DollarSign,
  Loader2,
  Lock,
  LogOut,
  QrCode,
  TrendingUp,
  UserCheck,
  Users,
  UserX,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { GymMemberCard, type GymMemberCardData } from '@/components/gym/member-card';
import { formatClock } from '@/lib/member-visual';

interface Stats {
  totalMembers: number;
  activeMembers: number;
  expiringMembers: number;
  expiredMembers: number;
  totalRevenue: number;
  todayAttendance: number;
  insideNow: number;
  leftToday: number;
}

interface FloorMember extends GymMemberCardData {
  attendanceId: string;
  check_in_time: string | null;
  check_out_time: string | null;
}

export default function GymDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [attendanceData, setAttendanceData] = useState<{ date: string; count: number }[]>([]);
  const [revenueData, setRevenueData] = useState<{ month: string; revenue: number }[]>([]);
  const [inside, setInside] = useState<FloorMember[]>([]);
  const [left, setLeft] = useState<FloorMember[]>([]);
  const [floorTab, setFloorTab] = useState<'inside' | 'left'>('inside');
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
      setInside(data.floor?.inside || []);
      setLeft(data.floor?.left || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
    const timer = window.setInterval(fetchDashboard, 20000);
    return () => window.clearInterval(timer);
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

  const checkoutMember = async (attendanceId: string) => {
    await fetch(`/api/attendance/${attendanceId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    fetchDashboard();
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-900" />
      </div>
    );
  }

  const highlightCards = [
    { label: 'On the floor', value: stats?.insideNow ?? 0, icon: UserCheck },
    { label: 'Left today', value: stats?.leftToday ?? 0, icon: LogOut },
    { label: 'Total members', value: stats?.totalMembers ?? 0, icon: Users },
    { label: 'Unpaid / expired', value: stats?.expiredMembers ?? 0, icon: UserX },
    {
      label: 'Revenue',
      value: `$${(stats?.totalRevenue ?? 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
      icon: DollarSign,
    },
    { label: "Today's visits", value: stats?.todayAttendance ?? 0, icon: Calendar },
  ];

  const floorMembers = floorTab === 'inside' ? inside : left;

  return (
    <div className="px-4 py-5 lg:p-8">
      <div className="mb-5 flex items-end justify-between gap-3">
        <div>
          <p className="admin-kicker">Live desk</p>
          <h1 className="admin-page-title">Who is in the gym</h1>
          <p className="admin-page-sub">Scan a member QR to check them in or out.</p>
        </div>
        <Link
          href="/gym/attendance"
          className="admin-primary-btn hidden lg:inline-flex"
        >
          <QrCode className="h-4 w-4" />
          Scan
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        {highlightCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="admin-stat"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-zinc-400">{card.label}</p>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-black/30 text-white">
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-4 text-[1.65rem] font-semibold tracking-tight text-white">{card.value}</p>
            </motion.div>
          );
        })}
      </div>

      <div className="admin-surface mt-6 p-4">
        <div className="mb-4 flex rounded-xl bg-zinc-100 p-1">
          <button
            onClick={() => setFloorTab('inside')}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium ${
              floorTab === 'inside' ? 'bg-[#1d4ed8] text-white shadow-sm' : 'text-zinc-500'
            }`}
          >
            Inside now ({inside.length})
          </button>
          <button
            onClick={() => setFloorTab('left')}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium ${
              floorTab === 'left' ? 'bg-[#1d4ed8] text-white shadow-sm' : 'text-zinc-500'
            }`}
          >
            Left today ({left.length})
          </button>
        </div>

        {floorMembers.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-200 py-10 text-center text-sm text-zinc-400">
            {floorTab === 'inside' ? 'No one is checked in right now.' : 'No check-outs yet today.'}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {floorMembers.map((member) => (
              <div key={member.attendanceId} className="space-y-2">
                <GymMemberCard
                  member={member}
                  href={`/gym/members/${member.id}`}
                  meta={
                    floorTab === 'inside'
                      ? `In since ${formatClock(member.check_in_time)}`
                      : `Left at ${formatClock(member.check_out_time)}`
                  }
                />
                {floorTab === 'inside' && (
                  <button
                    onClick={() => checkoutMember(member.attendanceId)}
                    className="w-full rounded-xl border border-zinc-200 bg-black py-2 text-xs font-medium text-white hover:bg-zinc-800"
                  >
                    Check out
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="admin-surface p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-900">Attendance</h2>
            <TrendingUp className="h-4 w-4 text-zinc-400" />
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={attendanceData}>
              <defs>
                <linearGradient id="attendanceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.28} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#71717a' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#71717a' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e4e4e7', background: '#ffffff', color: '#18181b', fontSize: '12px' }} />
              <Area type="monotone" dataKey="count" stroke="#2563eb" strokeWidth={2} fill="url(#attendanceGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="admin-surface p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-900">Revenue</h2>
            <DollarSign className="h-4 w-4 text-zinc-400" />
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#71717a' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#71717a' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ borderRadius: '12px', border: '1px solid #e4e4e7', background: '#ffffff', color: '#18181b', fontSize: '12px' }}
                formatter={(value: number) => [`$${value.toLocaleString()}`, 'Revenue']}
              />
              <Bar dataKey="revenue" fill="#1d4ed8" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="admin-surface mt-6 p-5">
        <h2 className="mb-3 text-sm font-semibold text-zinc-900">Account security</h2>
        <p className="text-sm text-zinc-500">Reset your gym admin password if you need a fresh temporary login.</p>
        <button
          onClick={handleResetPassword}
          disabled={resettingPassword}
          className="admin-secondary-btn mt-4 disabled:opacity-60"
        >
          {resettingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
          {resettingPassword ? 'Resetting…' : 'Reset password'}
        </button>
        {tempPassword && (
          <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Temporary password</p>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(tempPassword);
                  setTempPassword(null);
                }}
                className="rounded p-1 text-zinc-600"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
            <code className="block select-all font-mono text-sm text-zinc-900">{tempPassword}</code>
          </div>
        )}
        {resetError && <p className="mt-2 text-sm text-red-600">{resetError}</p>}
      </div>
    </div>
  );
}
