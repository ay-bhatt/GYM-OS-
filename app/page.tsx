'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { HomeLanding } from '@/components/home-landing';

export default function Home() {
  const router = useRouter();
  const [authChecking, setAuthChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const failsafe = window.setTimeout(() => {
      if (!cancelled) setAuthChecking(false);
    }, 4000);

    fetch('/api/auth/me', { cache: 'no-store' })
      .then((res) => res.json().catch(() => ({ authenticated: false })))
      .then((data) => {
        if (cancelled) return;
        if (data.authenticated && data.user) {
          router.replace(data.user.role === 'SUPER_ADMIN' ? '/super-admin/dashboard' : '/gym/dashboard');
          return;
        }
        setAuthChecking(false);
      })
      .catch(() => {
        if (!cancelled) setAuthChecking(false);
      });

    return () => {
      cancelled = true;
      window.clearTimeout(failsafe);
    };
  }, [router]);

  if (authChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-950">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-500" />
      </div>
    );
  }

  return <HomeLanding />;
}
