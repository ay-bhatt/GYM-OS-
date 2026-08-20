'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Dumbbell, Users, DollarSign, TrendingUp, Building2, Clock, UserX } from 'lucide-react';

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
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-900" />
      </div>
    );
  }

  const cards = [
    { label: 'Total gyms', value: stats?.totalGyms ?? 0, icon: Building2 },
    { label: 'Members', value: stats?.totalMembers ?? 0, icon: Users },
    { label: 'Active', value: stats?.activeMembers ?? 0, icon: TrendingUp },
    { label: 'Expiring', value: stats?.expiringMembers ?? 0, icon: Clock },
    { label: 'Expired', value: stats?.expiredMembers ?? 0, icon: UserX },
    { label: 'Revenue', value: `${(stats?.totalRevenue ?? 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`, icon: DollarSign },
    { label: 'Today in', value: stats?.todayAttendance ?? 0, icon: Dumbbell },
  ];

  return (
    <div className="p-5 sm:p-6 lg:p-8">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="admin-kicker">Platform</p>
          <h1 className="admin-page-title">Overview</h1>
          <p className="admin-page-sub">Every gym, member, and dollar across ForgeGym.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-7">
        {cards.map((card, i) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, duration: 0.22 }}
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

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18, duration: 0.28 }}
        className="admin-surface mt-6"
      >
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">Network gyms</h2>
            <p className="mt-0.5 text-xs text-zinc-500">Live snapshot of every location on the platform.</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="admin-table w-full">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/80">
                <th className="px-5 py-3 text-left">Gym ID</th>
                <th className="px-5 py-3 text-left">Name</th>
                <th className="px-5 py-3 text-left">Owner</th>
                <th className="px-5 py-3 text-left">Members</th>
                <th className="px-5 py-3 text-left">Revenue</th>
                <th className="px-5 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {gyms.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-sm text-zinc-400">No gyms found</td>
                </tr>
              ) : (
                gyms.map((g) => (
                  <tr key={g.id} className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50">
                    <td className="px-5 py-3.5 text-sm text-zinc-500">{g.gym_id}</td>
                    <td className="px-5 py-3.5 text-sm font-medium text-zinc-900">{g.name}</td>
                    <td className="px-5 py-3.5 text-sm text-zinc-600">{g.owner_name || '—'}</td>
                    <td className="px-5 py-3.5 text-sm text-zinc-600">{g.member_count}</td>
                    <td className="px-5 py-3.5 text-sm tabular-nums text-zinc-600">${g.revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold capitalize ${
                        g.status === 'active'
                          ? 'border-black bg-black text-white'
                          : 'border-zinc-200 bg-zinc-100 text-zinc-600'
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
