import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { createServerClient } from '@/lib/supabase-server';
import { Sidebar } from '@/components/sidebar';
import { GymBottomNav } from '@/components/gym/bottom-nav';

export default async function GymAdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  if (!session) redirect('/login');
  if (session.role !== 'GYM_ADMIN') redirect('/super-admin/dashboard');

  let gymName = '';
  if (session.gymId) {
    const supabase = createServerClient();
    const { data } = await supabase
      .from('gyms')
      .select('name')
      .eq('gym_id', session.gymId)
      .maybeSingle();
    gymName = data?.name || session.gymId;
  }

  return (
    <div className="flex min-h-screen bg-white">
      <Sidebar role={session.role} gymName={gymName} />
      <div className="relative min-w-0 flex-1">
        <div className="admin-canvas pointer-events-none absolute inset-0" />
        <main className="relative flex-1 overflow-x-hidden pt-4 pb-24 lg:pt-6 lg:pb-10">
          <div className="relative mx-auto w-full max-w-[1440px]">{children}</div>
        </main>
      </div>
      <GymBottomNav />
    </div>
  );
}