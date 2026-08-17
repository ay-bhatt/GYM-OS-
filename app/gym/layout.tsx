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
    <div className="flex min-h-screen bg-[#F4F1FF]">
      <Sidebar role={session.role} gymName={gymName} />
      <main className="relative flex-1 overflow-x-hidden pb-28 pt-16 lg:pb-8 lg:pt-20">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(124,92,255,0.14),transparent_32%),radial-gradient(circle_at_top_left,rgba(255,255,255,0.85),transparent_40%)]" />
        <div className="relative">{children}</div>
      </main>
      <GymBottomNav />
    </div>
  );
}