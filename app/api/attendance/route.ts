import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { createServerClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId');
    const date = searchParams.get('date');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const gymIdFilter = searchParams.get('gymId');

    let query = supabase
      .from('attendance')
      .select(`
        id, gym_id, member_id, date, check_in_time, check_out_time, status, created_at,
        members!inner(member_id, name, phone)
      `)
      .order('date', { ascending: false })
      .order('check_in_time', { ascending: false });

    if (session.role === 'GYM_ADMIN') {
      if (!session.gymId) {
        return NextResponse.json({ error: 'No gym associated with account' }, { status: 403 });
      }
      query = query.eq('gym_id', session.gymId);
    } else {
      // SUPER_ADMIN
      if (gymIdFilter) {
        query = query.eq('gym_id', gymIdFilter);
      }
    }

    if (memberId) {
      query = query.eq('member_id', memberId);
    }

    if (date) {
      query = query.eq('date', date);
    }

    if (from) {
      query = query.gte('date', from);
    }

    if (to) {
      query = query.lte('date', to);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ data: data || [] });
  } catch (error) {
    console.error('Attendance GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerClient();
    const body = await request.json();

    if (!body.qr_token) {
      return NextResponse.json({ error: 'qr_token is required' }, { status: 400 });
    }

    // Look up member by qr_token
    const { data: member, error: memberError } = await supabase
      .from('members')
      .select('id, gym_id, member_id, name, phone, status, plan_id')
      .eq('qr_token', body.qr_token)
      .maybeSingle();

    if (memberError) throw memberError;

    if (!member) {
      return NextResponse.json({ error: 'Invalid QR token — member not found' }, { status: 404 });
    }

    // For GYM_ADMIN, verify the member belongs to their gym
    if (session.role === 'GYM_ADMIN') {
      if (!session.gymId) {
        return NextResponse.json({ error: 'No gym associated with account' }, { status: 403 });
      }
      if (member.gym_id !== session.gymId) {
        return NextResponse.json({ error: 'Member does not belong to your gym' }, { status: 403 });
      }
    }

    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();

    // Check if attendance already exists for today
    const { data: existingAttendance, error: checkError } = await supabase
      .from('attendance')
      .select('id, check_in_time, check_out_time')
      .eq('member_id', member.id)
      .eq('date', today)
      .maybeSingle();

    if (checkError) throw checkError;

    if (existingAttendance) {
      // Already checked in today
      return NextResponse.json({
        data: {
          member: {
            id: member.id,
            member_id: member.member_id,
            name: member.name,
            phone: member.phone,
            status: member.status,
          },
          attendance: existingAttendance,
          alreadyCheckedIn: true,
        },
        message: 'Member already checked in today',
      });
    }

    // Create attendance record
    const { data: attendance, error: insertError } = await supabase
      .from('attendance')
      .insert({
        gym_id: member.gym_id,
        member_id: member.id,
        date: today,
        check_in_time: now,
        status: 'present',
      })
      .select('id, gym_id, member_id, date, check_in_time, check_out_time, status, created_at')
      .maybeSingle();

    if (insertError) throw insertError;

    return NextResponse.json({
      data: {
        member: {
          id: member.id,
          member_id: member.member_id,
          name: member.name,
          phone: member.phone,
          status: member.status,
        },
        attendance,
        alreadyCheckedIn: false,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Attendance POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
