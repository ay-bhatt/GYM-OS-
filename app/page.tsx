'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (!data.authenticated || !data.user) {
          router.replace('/login');
        } else if (data.user.role === 'SUPER_ADMIN') {
          router.replace('/super-admin/dashboard');
        } else {
          router.replace('/gym/dashboard');
        }
      })
      .catch(() => router.replace('/login'));
  }, [router]);

    return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-950 pt-16 lg:pt-20">
      <Loader2 className="h-8 w-8 animate-spin text-neutral-500" />
    </div>
  );
}
