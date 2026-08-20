'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CreditCard, LayoutDashboard, QrCode, Users, Wallet } from 'lucide-react';

const items = [
  { href: '/gym/dashboard', label: 'Home', icon: LayoutDashboard },
  { href: '/gym/members', label: 'Members', icon: Users },
  { href: '/gym/attendance', label: 'Scan', icon: QrCode, center: true },
  { href: '/gym/plans', label: 'Plans', icon: CreditCard },
  { href: '/gym/payments', label: 'Pay', icon: Wallet },
];

export function GymBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 bg-white/95 px-2 pb-[max(0.4rem,env(safe-area-inset-bottom))] pt-1.5 shadow-[0_-10px_30px_rgba(15,23,42,0.08)] backdrop-blur lg:hidden">
      <div className="mx-auto grid max-w-lg grid-cols-5 items-end">
        {items.map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.href || (item.href !== '/gym/dashboard' && pathname.startsWith(item.href));

          if (item.center) {
            return (
              <Link key={item.href} href={item.href} className="-mt-5 flex flex-col items-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-blue-800 text-white shadow-[0_12px_24px_rgba(37,99,235,0.35)] ring-4 ring-white">
                  <Icon className="h-6 w-6" />
                </span>
                <span className="mt-0.5 text-[10px] font-semibold text-blue-700">{item.label}</span>
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 py-1 text-[10px] font-medium ${
                active ? 'text-blue-700' : 'text-zinc-400'
              }`}
            >
              <Icon className={`h-5 w-5 ${active ? 'text-blue-700' : 'text-zinc-400'}`} />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
