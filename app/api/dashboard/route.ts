import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { createServerClient } from '@/lib/supabase-server';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerClient();
    const today = new Date().toISOString().split('T')[0];
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    const sevenDaysStr = sevenDaysFromNow.toISOString().split('T')[0];

    if (session.role === 'GYM_ADMIN') {
      if (!session.gymId) {
        return NextResponse.json({ error: 'No gym associated with account' }, { status: 403 });
      }

      const gymId = session.gymId;

      const { count: totalMembers } = await supabase
        .from('members')
        .select('*', { count: 'exact', head: true })
        .eq('gym_id', gymId);

      const { count: activeMembers } = await supabase
        .from('members')
        .select('*', { count: 'exact', head: true })
        .eq('gym_id', gymId)
        .eq('status', 'active');

      const { count: expiringMembers } = await supabase
        .from('members')
        .select('*', { count: 'exact', head: true })
        .eq('gym_id', gymId)
        .eq('status', 'expiring')
        .gte('expiry_date', today)
        .lte('expiry_date', sevenDaysStr);

      const { count: expiredMembers } = await supabase
        .from('members')
        .select('*', { count: 'exact', head: true })
        .eq('gym_id', gymId)
        .eq('status', 'expired');

      const { data: revenueRows } = await supabase
        .from('payments')
        .select('amount')
        .eq('gym_id', gymId);

      const totalRevenue = (revenueRows || []).reduce((sum, p) => sum + Number(p.amount), 0);

      const { count: todayAttendance } = await supabase
        .from('attendance')
        .select('*', { count: 'exact', head: true })
        .eq('gym_id', gymId)
        .eq('date', today);

      // Attendance chart: last 14 days
      const fourteenDaysAgo = new Date();
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
      const fourteenDaysStr = fourteenDaysAgo.toISOString().split('T')[0];

      const { data: attendanceRows } = await supabase
        .from('attendance')
        .select('date')
        .eq('gym_id', gymId)
        .gte('date', fourteenDaysStr)
        .order('date', { ascending: true });

      const attendanceMap: Record<string, number> = {};
      (attendanceRows || []).forEach((r: { date: string }) => {
        attendanceMap[r.date] = (attendanceMap[r.date] || 0) + 1;
      });

      const attendanceChart = Object.entries(attendanceMap).map(([date, count]) => ({
        date: date.slice(5),
        count,
      }));

      // Revenue chart: last 6 months
      const revenueChart: { month: string; revenue: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const year = d.getFullYear();
        const month = d.getMonth();
        const monthStart = new Date(year, month, 1).toISOString().split('T')[0];
        const monthEnd = new Date(year, month + 1, 0).toISOString().split('T')[0];

        const { data: monthPayments } = await supabase
          .from('payments')
          .select('amount')
          .eq('gym_id', gymId)
          .gte('payment_date', monthStart)
          .lte('payment_date', monthEnd);

        const monthRevenue = (monthPayments || []).reduce((sum, p) => sum + Number(p.amount), 0);
        revenueChart.push({
          month: d.toLocaleDateString('en-US', { month: 'short' }),
          revenue: monthRevenue,
        });
      }

      // Recent members
      const { data: recentMembers } = await supabase
        .from('members')
        .select('id, member_id, name, status, expiry_date')
        .eq('gym_id', gymId)
        .order('created_at', { ascending: false })
        .limit(5);

      return NextResponse.json({
        stats: {
          totalMembers: totalMembers || 0,
          activeMembers: activeMembers || 0,
          expiringMembers: expiringMembers || 0,
          expiredMembers: expiredMembers || 0,
          totalRevenue,
          todayAttendance: todayAttendance || 0,
        },
        attendanceChart,
        revenueChart,
        recentMembers: recentMembers || [],
      });
    }

    // SUPER_ADMIN
    const { count: totalMembers } = await supabase
      .from('members')
      .select('*', { count: 'exact', head: true });

    const { count: activeMembers } = await supabase
      .from('members')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    const { count: expiringMembers } = await supabase
      .from('members')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'expiring')
      .gte('expiry_date', today)
      .lte('expiry_date', sevenDaysStr);

    const { count: expiredMembers } = await supabase
      .from('members')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'expired');

    const { data: revenueData } = await supabase
      .from('payments')
      .select('amount');

    const totalRevenue = (revenueData || []).reduce((sum, p) => sum + Number(p.amount), 0);

    const { count: todayAttendance } = await supabase
      .from('attendance')
      .select('*', { count: 'exact', head: true })
      .eq('date', today);

    const { count: totalGyms } = await supabase
      .from('gyms')
      .select('*', { count: 'exact', head: true });

    const { data: gyms } = await supabase
      .from('gyms')
      .select('id, gym_id, name, owner_name, status')
      .order('created_at', { ascending: true });

    const gymBreakdown = await Promise.all(
      (gyms || []).map(async (gym: { id: string; gym_id: string; name: string; owner_name: string | null; status: string }) => {
        const { count: memberCount } = await supabase
          .from('members')
          .select('*', { count: 'exact', head: true })
          .eq('gym_id', gym.gym_id);

        const { data: gymRevenue } = await supabase
          .from('payments')
          .select('amount')
          .eq('gym_id', gym.gym_id);

        const revenue = (gymRevenue || []).reduce((sum, p) => sum + Number(p.amount), 0);

        return {
          id: gym.id,
          gym_id: gym.gym_id,
          name: gym.name,
          owner_name: gym.owner_name,
          status: gym.status,
          member_count: memberCount || 0,
          revenue,
        };
      })
    );

    return NextResponse.json({
      stats: {
        totalGyms: totalGyms || 0,
        totalMembers: totalMembers || 0,
        activeMembers: activeMembers || 0,
        expiringMembers: expiringMembers || 0,
        expiredMembers: expiredMembers || 0,
        totalRevenue,
        todayAttendance: todayAttendance || 0,
      },
      gyms: gymBreakdown,
    });
  } catch (error) {
    console.error('Dashboard GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
