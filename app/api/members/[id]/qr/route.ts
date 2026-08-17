import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { createServerClient } from '@/lib/supabase-server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerClient();
    const memberId = params.id;

    // Fetch member's qr_token, scoped to gym for GYM_ADMIN
    let query = supabase
      .from('members')
      .select('id, gym_id, qr_token, member_id, name')
      .eq('id', memberId);

    if (session.role === 'GYM_ADMIN') {
      if (!session.gymId) {
        return NextResponse.json({ error: 'No gym associated with account' }, { status: 403 });
      }
      query = query.eq('gym_id', session.gymId);
    }

    const { data: member, error } = await query.maybeSingle();

    if (error) throw error;
    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    return NextResponse.json({
      data: {
        qr_token: member.qr_token,
        member_id: member.member_id,
        name: member.name,
      },
    });
  } catch (error) {
    console.error('Member QR GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
