'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Dumbbell, Users, DollarSign, TrendingUp, Building2, Clock, UserX } from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface SuperStats {
  totalGyms: number;
  totalMembers: number;
  activeMembers: number;
  expiringMembers: number;
  expiredMembers: number;
  totalRevenue: number;
  todayAttendance: number;
}

interface GymRow {
  id: string;
  gym_id: string;
  name: string;
  owner_name: string | null;
  status: string;
  member_count: number;
  revenue: number;
}

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState<SuperStats | null>(null);
  const [gyms, setGyms] = useState<GymRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard');
      if (!res.ok) return;
      const data = await res.json();
      setStats(data.stats);
      setGyms(data.gyms || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900" />
      </div>
    );
  }

  const cards = [
    { label: 'Total Gyms', value: stats?.totalGyms ?? 0, icon: Building2, color: 'text-zinc-900', bg: 'bg-zinc-100' },
    { label: 'Total Members', value: stats?.totalMembers ?? 0, icon: Users, color: 'text-sky-600', bg: 'bg-sky-50' },
    { label: 'Active', value: stats?.activeMembers ?? 0, icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Expiring', value: stats?.expiringMembers ?? 0, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Expired', value: stats?.expiredMembers ?? 0, icon: UserX, color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'Total Revenue', value: `${(stats?.totalRevenue ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, icon: DollarSign, color: 'text-zinc-900', bg: 'bg-zinc-100' },
    { label: 'Today\'s Attendance', value: stats?.todayAttendance ?? 0, icon: Dumbbell, color: 'text-amber-600', bg: 'bg-amber-50' },
  ];

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-sky-600">Platform</p>
        <h1 className="admin-page-title">Overview</h1>
        <p className="admin-page-sub">Every gym, member, and dollar across ForgeGym.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-7">
        {cards.map((card, i) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.2 }}
              className="admin-stat"
            >
              <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl ${card.bg}`}>
                <Icon className={`h-4 w-4 ${card.color}`} />
              </div>
              <p className="text-2xl font-semibold tracking-tight text-zinc-900">{card.value}</p>
              <p className="mt-0.5 text-xs text-zinc-500">{card.label}</p>
            </motion.div>
          );
        })}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.3 }}
        className="admin-surface mt-6 p-5"
      >
        <h2 className="mb-4 text-sm font-semibold text-zinc-900">All Gyms</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-200">
                <th className="pb-2 text-left text-xs font-medium text-zinc-500">Gym ID</th>
                <th className="pb-2 text-left text-xs font-medium text-zinc-500">Name</th>
                <th className="pb-2 text-left text-xs font-medium text-zinc-500">Owner</th>
                <th className="pb-2 text-left text-xs font-medium text-zinc-500">Members</th>
                <th className="pb-2 text-left text-xs font-medium text-zinc-500">Revenue</th>
                <th className="pb-2 text-left text-xs font-medium text-zinc-500">Status</th>
              </tr>
            </thead>
            <tbody>
              {gyms.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-sm text-zinc-400">No gyms found</td>
                </tr>
              ) : (
                gyms.map((g) => (
                  <tr key={g.id} className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50">
                    <td className="py-3 text-sm text-zinc-600">{g.gym_id}</td>
                    <td className="py-3 text-sm font-medium text-zinc-900">{g.name}</td>
                    <td className="py-3 text-sm text-zinc-600">{g.owner_name || '—'}</td>
                    <td className="py-3 text-sm text-zinc-600">{g.member_count}</td>
                    <td className="py-3 text-sm text-zinc-600">${g.revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="py-3">
                      <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${
                        g.status === 'active'
                          ? 'bg-green-50 text-green-700 border-green-200'
                          : 'bg-zinc-50 text-zinc-500 border-zinc-200'
                      }`}>
                        {g.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
