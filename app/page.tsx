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

    fetch('/api/auth/me')
      .then((res) => res.json())
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
    };
  }, [router]);

  if (authChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-950 pt-16 lg:pt-20">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-500" />
      </div>
    );
  }

  return <HomeLanding />;
}
