'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  QrCode,
  Dumbbell,
  Music2,
  LogOut,
  Menu,
  X,
  Wallet,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const gymAdminNav: NavItem[] = [
  { label: 'Dashboard', href: '/gym/dashboard', icon: LayoutDashboard },
  { label: 'Members', href: '/gym/members', icon: Users },
  { label: 'Attendance', href: '/gym/attendance', icon: QrCode },
  { label: 'Plans', href: '/gym/plans', icon: CreditCard },
  { label: 'Payments', href: '/gym/payments', icon: Wallet },
];

const superAdminNav: NavItem[] = [
  { label: 'Dashboard', href: '/super-admin/dashboard', icon: LayoutDashboard },
  { label: 'Gyms', href: '/super-admin/gyms', icon: Dumbbell },
  { label: 'Music Library', href: '/super-admin/music', icon: Music2 },
];

export function Sidebar({ role, gymName }: { role: string; gymName?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const nav = role === 'SUPER_ADMIN' ? superAdminNav : gymAdminNav;
  const isSuper = role === 'SUPER_ADMIN';

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  const SidebarContent = (
    <div className="relative flex h-full flex-col">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.18),transparent_70%)]" />

      <div className="relative flex h-16 items-center gap-2.5 px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500 shadow-[0_0_20px_rgba(14,165,233,0.35)]">
          <Dumbbell className="h-4 w-4 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-[15px] font-semibold tracking-tight text-white">ForgeGym</p>
          <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">
            {isSuper ? 'Super Admin' : 'Gym Admin'}
          </p>
        </div>
      </div>

      {gymName && (
        <div className="relative mx-4 mb-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
          <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">Current gym</p>
          <p className="truncate text-sm font-medium text-zinc-100">{gymName}</p>
        </div>
      )}

      <nav className="relative flex-1 space-y-1 px-3 py-3">
        {nav.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                isActive
                  ? 'bg-white/10 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]'
                  : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-100'
              }`}
            >
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                  isActive ? 'bg-sky-500 text-white' : 'bg-white/5 text-zinc-400 group-hover:text-zinc-200'
                }`}
              >
                <Icon className="h-4 w-4" />
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="relative border-t border-white/10 p-3">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-zinc-400 transition-colors hover:bg-red-500/10 hover:text-red-300"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5">
            <LogOut className="h-4 w-4" />
          </span>
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <>
      <aside className="sticky top-0 hidden h-screen w-64 flex-shrink-0 flex-col border-r border-white/10 bg-zinc-950 pt-16 lg:flex">
        {SidebarContent}
      </aside>

      <div className={`fixed inset-x-0 top-16 z-40 h-14 items-center justify-between border-b border-white/10 bg-zinc-950/95 px-4 backdrop-blur ${role === 'SUPER_ADMIN' ? 'flex lg:hidden' : 'hidden'}`}>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500">
            <Dumbbell className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="font-semibold text-white">ForgeGym</span>
        </div>
        <button onClick={() => setMobileOpen(true)} className="rounded-lg p-2 text-zinc-300 hover:bg-white/10" aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </button>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 z-[110] bg-black/50 lg:hidden"
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'tween', duration: 0.2 }}
              className="fixed left-0 top-0 z-[120] h-full w-64 bg-zinc-950 pt-16 lg:hidden"
            >
              <button
                onClick={() => setMobileOpen(false)}
                className="absolute right-3 top-20 rounded-lg p-1.5 text-zinc-400 hover:bg-white/10 hover:text-white"
                aria-label="Close menu"
              >
                <X className="h-4 w-4" />
              </button>
              {SidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
