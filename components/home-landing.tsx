'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  ArrowRight,
  Building2,
  CreditCard,
  Dumbbell,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  LogIn,
  Music2,
  QrCode,
  ShieldCheck,
  Sparkles,
  User,
  Users,
  X,
} from 'lucide-react';
<<<<<<< HEAD
import dynamic from 'next/dynamic';

const Dumbbell3D = dynamic(() => import('@/components/dumbbell-3d'), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-zinc-950" />,
});
=======
import Dumbbell3D from '@/components/dumbbell-3d';
>>>>>>> c56d30689396b218514a6278f83a8e01920b619b

const HIGHLIGHTS = [
  {
    icon: Users,
    title: 'Members & plans',
    body: 'Records, renewals, and memberships stay organized in one place.',
  },
  {
    icon: QrCode,
    title: 'QR attendance',
    body: 'Fast check-in on the floor, with a live view of who is in today.',
  },
  {
    icon: CreditCard,
    title: 'Payments',
    body: 'Track dues, collections, and revenue without leaving the desk.',
  },
  {
    icon: Building2,
    title: 'Isolated gyms',
    body: 'Every location stays private. Super Admins see the whole network.',
  },
];

const PILLARS = [
  { label: 'Members', icon: Users },
  { label: 'Attendance', icon: QrCode },
  { label: 'Payments', icon: CreditCard },
  { label: 'Music', icon: Music2 },
];

export function HomeLanding() {
  const router = useRouter();
  const [loginOpen, setLoginOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const openLogin = () => {
    setLoginOpen(true);
    setError('');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Login failed');
        setLoading(false);
        return;
      }

      router.push(data.redirect);
    } catch {
      setError('Network error. Please check your connection.');
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-zinc-950 lg:flex-row">
<<<<<<< HEAD
      <div className="relative flex min-h-[56vh] flex-none items-end justify-center overflow-hidden bg-zinc-950 lg:min-h-screen lg:flex-[1.05]">
        <div className="absolute inset-0">
          <Dumbbell3D />
        </div>
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_38%,rgba(14,165,233,0.2),transparent_46%),radial-gradient(circle_at_80%_80%,rgba(14,165,233,0.1),transparent_36%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(9,9,11,0.08),transparent_32%,rgba(9,9,11,0.72))] lg:bg-[linear-gradient(to_right,rgba(9,9,11,0.08),transparent_44%,rgba(9,9,11,0.28))]" />
=======
      <div className="relative flex min-h-[46vh] flex-none items-end justify-center overflow-hidden bg-zinc-950 lg:min-h-screen lg:flex-[1.05]">
        <div className="absolute inset-0">
          <Dumbbell3D />
        </div>
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(14,165,233,0.22),transparent_42%),radial-gradient(circle_at_80%_80%,rgba(14,165,233,0.12),transparent_36%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(9,9,11,0.15),transparent_28%,rgba(9,9,11,0.88))] lg:bg-[linear-gradient(to_right,rgba(9,9,11,0.15),transparent_40%,rgba(9,9,11,0.35))]" />
>>>>>>> c56d30689396b218514a6278f83a8e01920b619b
        <div className="pointer-events-none absolute inset-0 opacity-[0.12] [background-image:linear-gradient(rgba(255,255,255,0.16)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.16)_1px,transparent_1px)] [background-size:56px_56px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_78%)]" />

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="relative z-10 w-full px-6 pb-8 pt-20 text-center lg:px-12 lg:pb-16 lg:pt-0 lg:text-left"
        >
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.9)]" />
            <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/70">
              ForgeGym
            </span>
          </div>
          <h1 className="max-w-md text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-5xl lg:leading-[1.08]">
            Run the gym.
            <span className="block text-sky-300">Keep the floor moving.</span>
          </h1>
          <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-white/60 lg:mx-0">
            Members, memberships, attendance, and payments — built for independent gyms that want
            a clean desk and a busy floor.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2 lg:justify-start">
            {PILLARS.map((item) => {
              const Icon = item.icon;
              return (
                <span
                  key={item.label}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-white/75 backdrop-blur-sm"
                >
                  <Icon className="h-3 w-3 text-sky-300" />
                  {item.label}
                </span>
              );
            })}
          </div>
        </motion.div>
      </div>

      <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-zinc-50 px-6 py-14 sm:px-10 lg:min-h-screen lg:px-14 lg:py-20">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,0.12),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(244,244,245,1),transparent_46%)]" />
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-sky-200/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-16 h-56 w-56 rounded-full bg-sky-100/80 blur-3xl" />

        <button
          type="button"
          onClick={openLogin}
          className="fixed right-4 top-[4.25rem] z-[101] inline-flex h-11 w-11 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-800 shadow-lg sm:absolute sm:right-5 sm:top-4 sm:z-20 lg:right-8 lg:top-6"
          title="Sign in"
          aria-label="Sign in"
        >
          <LogIn className="h-4 w-4" />
        </button>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="relative w-full max-w-lg"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-200/80 bg-sky-50 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-sky-700">
            <Sparkles className="h-3 w-3" />
            Built for independent gyms
          </div>

          <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl">
            The quiet system behind a loud gym.
          </h2>
          <p className="mt-4 max-w-md text-sm leading-7 text-zinc-600">
            ForgeGym keeps each location isolated — its own members, plans, attendance, and
            payments — while a Super Admin can watch every gym from one dashboard.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {HIGHLIGHTS.map((item, index) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: 0.12 + index * 0.06 }}
                  className="group rounded-2xl border border-zinc-200/80 bg-white/80 p-4 shadow-[0_1px_0_rgba(255,255,255,0.8)_inset,0_10px_30px_rgba(15,23,42,0.04)] backdrop-blur-sm transition-transform hover:-translate-y-0.5"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-900 text-white shadow-sm transition-colors group-hover:bg-sky-500">
                    <Icon className="h-4 w-4" />
                  </div>
                  <p className="mt-3 text-sm font-semibold text-zinc-900">{item.title}</p>
                  <p className="mt-1 text-xs leading-5 text-zinc-500">{item.body}</p>
                </motion.div>
              );
            })}
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white/70 px-4 py-3 backdrop-blur-sm">
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <ShieldCheck className="h-4 w-4 text-sky-600" />
              Tenant-isolated data. Sign in to open your desk.
            </div>
            <button
              type="button"
              onClick={openLogin}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-900 transition-colors hover:text-sky-700"
            >
              Continue
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {loginOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setLoginOpen(false)}
              className="absolute inset-0 bg-zinc-950/45 backdrop-blur-[2px]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 8 }}
              transition={{ duration: 0.18 }}
              className="relative z-10 w-full max-w-sm overflow-hidden rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl"
            >
              <div className="mb-6 flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900 text-white">
                    <Dumbbell className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-zinc-900">Sign in</h2>
                    <p className="mt-0.5 text-sm text-zinc-500">Open your ForgeGym dashboard.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setLoginOpen(false)}
                  className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
                  aria-label="Close sign in"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="home-username" className="mb-1.5 block text-sm font-medium text-zinc-700">
                    Username
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                    <input
                      id="home-username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full rounded-lg border border-zinc-200 bg-white py-2.5 pl-10 pr-3 text-sm text-zinc-900 outline-none transition-colors focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                      placeholder="Enter username"
                      autoComplete="username"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="home-password" className="mb-1.5 block text-sm font-medium text-zinc-700">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                    <input
                      id="home-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-lg border border-zinc-200 bg-white py-2.5 pl-10 pr-10 text-sm text-zinc-900 outline-none transition-colors focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                      placeholder="Enter password"
                      autoComplete="current-password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((current) => !current)}
                      className="absolute inset-y-0 right-0 flex items-center rounded-r-lg px-3 text-zinc-400 hover:text-zinc-700"
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-zinc-900 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    'Sign in'
                  )}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
