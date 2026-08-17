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
  Settings,
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
  { label: 'Payments', href: '/gym/payments', icon: CreditCard },
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

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  const SidebarContent = (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b border-zinc-200 px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900">
          <Dumbbell className="h-4 w-4 text-white" />
        </div>
        <span className="text-lg font-semibold text-zinc-900">ForgeGym</span>
      </div>

      {/* Gym Name (for gym admin) */}
      {gymName && (
        <div className="px-6 py-3 border-b border-zinc-200">
          <p className="text-xs text-zinc-400 uppercase tracking-wide">Current Gym</p>
          <p className="text-sm font-medium text-zinc-700 truncate">{gymName}</p>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {nav.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-zinc-900 text-white'
                  : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="border-t border-zinc-200 p-3">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-red-50 hover:text-red-600"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <aside className="hidden lg:flex w-64 flex-shrink-0 border-r border-zinc-200 bg-white">
        {SidebarContent}
      </aside>

      {/* Mobile header */}
      <div className="lg:hidden flex h-14 items-center justify-between border-b border-zinc-200 bg-white px-4">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-900">
            <Dumbbell className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="font-semibold text-zinc-900">ForgeGym</span>
        </div>
        <button onClick={() => setMobileOpen(true)} className="p-2 text-zinc-600">
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
                          className="fixed inset-0 z-[110] bg-black/30 lg:hidden"
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'tween', duration: 0.2 }}
              className="fixed left-0 top-0 z-[120] h-full w-64 bg-white lg:hidden"
            >
              {SidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
