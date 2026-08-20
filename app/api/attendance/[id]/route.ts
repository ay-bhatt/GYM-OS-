import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { createServerClient } from '@/lib/supabase-server';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerClient();
    const attendanceId = params.id;
    const body = await request.json();

    // Fetch existing attendance to verify ownership
    let attendanceQuery = supabase
      .from('attendance')
      .select('id, gym_id, member_id, date, check_in_time, check_out_time, status')
      .eq('id', attendanceId);

    if (session.role === 'GYM_ADMIN') {
      if (!session.gymId) {
        return NextResponse.json({ error: 'No gym associated with account' }, { status: 403 });
      }
      attendanceQuery = attendanceQuery.eq('gym_id', session.gymId);
    }

    const { data: existingAttendance, error: fetchError } = await attendanceQuery.maybeSingle();

    if (fetchError) throw fetchError;
    if (!existingAttendance) {
      return NextResponse.json({ error: 'Attendance record not found' }, { status: 404 });
    }

    // Build update object
    const updateData: Record<string, unknown> = {};

    if (body.check_out_time !== undefined) {
      updateData.check_out_time = body.check_out_time;
    }
    if (body.status !== undefined) {
      updateData.status = body.status;
    }

    // If no check_out_time provided, default to now
    if (body.check_out_time === undefined && !existingAttendance.check_out_time) {
      updateData.check_out_time = new Date().toISOString();
    }

    const { data: updatedAttendance, error: updateError } = await supabase
      .from('attendance')
      .update(updateData)
      .eq('id', attendanceId)
      .select('id, gym_id, member_id, date, check_in_time, check_out_time, status, created_at')
      .maybeSingle();

    if (updateError) throw updateError;

    return NextResponse.json({ data: updatedAttendance });
  } catch (error) {
    console.error('Attendance PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
