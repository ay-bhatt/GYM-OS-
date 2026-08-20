import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { Sidebar } from '@/components/sidebar';

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  if (!session) redirect('/login');
  if (session.role !== 'SUPER_ADMIN') redirect('/gym/dashboard');

  return (
    <div className="flex min-h-screen bg-white">
      <Sidebar role={session.role} />
      <div className="relative min-w-0 flex-1">
        <div className="admin-canvas pointer-events-none absolute inset-0" />
        <main className="relative flex-1 overflow-x-hidden pt-14 pb-12 lg:pt-0">
          <div className="mx-auto w-full max-w-[1440px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
