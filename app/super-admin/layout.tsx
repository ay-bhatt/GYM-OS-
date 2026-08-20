import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { Sidebar } from '@/components/sidebar';

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  if (!session) redirect('/login');
  if (session.role !== 'SUPER_ADMIN') redirect('/gym/dashboard');

  return (
    <div className="flex min-h-screen bg-[#eef2f6]">
      <Sidebar role={session.role} />
      <main className="relative flex-1 overflow-x-hidden pt-14 pb-8 lg:pt-6">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,0.08),transparent_28%),radial-gradient(circle_at_top_left,rgba(255,255,255,0.7),transparent_36%)]" />
        <div className="relative">{children}</div>
      </main>
    </div>
  );
}