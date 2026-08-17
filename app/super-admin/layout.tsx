import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { Sidebar } from '@/components/sidebar';

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  if (!session) redirect('/login');
  if (session.role !== 'SUPER_ADMIN') redirect('/gym/dashboard');

  return (
    <div className="flex min-h-screen bg-zinc-50">
      <Sidebar role={session.role} />
      <main className="flex-1 overflow-x-hidden pt-16 lg:pt-20 pb-4">
        {children}
      </main>
    </div>
  );
}