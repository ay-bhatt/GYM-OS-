import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { createServerClient } from '@/lib/supabase-server';
import { Sidebar } from '@/components/sidebar';

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
    <div className="flex min-h-screen bg-zinc-50">
      <Sidebar role={session.role} gymName={gymName} />
      <main className="flex-1 overflow-x-hidden pt-16 lg:pt-20 pb-4">
        {children}
      </main>
    </div>
  );
}