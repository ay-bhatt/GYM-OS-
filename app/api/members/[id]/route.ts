import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { createServerClient } from '@/lib/supabase-server';

function calculateAge(dateOfBirth: string): number | null {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

function calculateStatus(expiryDate: string): string {
  if (!expiryDate) return 'active';
  const expiry = new Date(expiryDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const sevenDaysFromNow = new Date(today);
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

  if (expiry < today) return 'expired';
  if (expiry <= sevenDaysFromNow) return 'expiring';
  return 'active';
}

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

    // Fetch member
    let memberQuery = supabase
      .from('members')
      .select(`
        id, gym_id, member_id, name, photo_url, date_of_birth, age, gender, phone, address,
        emergency_contact, plan_id, start_date, expiry_date, amount_paid, status, qr_token,
        notes, created_at, updated_at
      `)
      .eq('id', memberId);

    if (session.role === 'GYM_ADMIN') {
      if (!session.gymId) {
        return NextResponse.json({ error: 'No gym associated with account' }, { status: 403 });
      }
      memberQuery = memberQuery.eq('gym_id', session.gymId);
    }

    const { data: member, error: memberError } = await memberQuery.maybeSingle();

    if (memberError) throw memberError;
    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Fetch plan info
    let planInfo = null;
    if (member.plan_id) {
      const { data: plan, error: planError } = await supabase
        .from('membership_plans')
        .select('id, name, duration_days, price, discount, final_price, description')
        .eq('id', member.plan_id)
        .maybeSingle();

      if (planError) throw planError;
      planInfo = plan;
    }

    // Fetch attendance count
    const { count: attendanceCount, error: attendanceError } = await supabase
      .from('attendance')
      .select('*', { count: 'exact', head: true })
      .eq('member_id', memberId);

    if (attendanceError) throw attendanceError;

    // Fetch payment history
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('id, amount, discount, payment_method, payment_date, notes, created_at')
      .eq('member_id', memberId)
      .order('created_at', { ascending: false });

    if (paymentsError) throw paymentsError;

    // Don't return qr_token in the main member response (use /qr endpoint for that)
    const { qr_token, ...memberWithoutToken } = member;

    return NextResponse.json({
      data: {
        ...memberWithoutToken,
        plan: planInfo,
        attendanceCount: attendanceCount || 0,
        payments: payments || [],
      },
    });
  } catch (error) {
    console.error('Member GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

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
    const memberId = params.id;
    const body = await request.json();

    // Fetch existing member to verify ownership
    let memberQuery = supabase
      .from('members')
      .select('id, gym_id, plan_id, start_date, date_of_birth')
      .eq('id', memberId);

    if (session.role === 'GYM_ADMIN') {
      if (!session.gymId) {
        return NextResponse.json({ error: 'No gym associated with account' }, { status: 403 });
      }
      memberQuery = memberQuery.eq('gym_id', session.gymId);
    }

    const { data: existingMember, error: fetchError } = await memberQuery.maybeSingle();

    if (fetchError) throw fetchError;
    if (!existingMember) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Build update object
    const updateData: Record<string, unknown> = {};

    const allowedFields = ['name', 'phone', 'address', 'date_of_birth', 'gender', 'emergency_contact', 'notes', 'status'];
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    // Handle plan_id and start_date changes — recalculate expiry_date, amount_paid, status
    const newPlanId = body.plan_id !== undefined ? body.plan_id : existingMember.plan_id;
    const newStartDate = body.start_date !== undefined ? body.start_date : existingMember.start_date;

    const planChanged = body.plan_id !== undefined && body.plan_id !== existingMember.plan_id;
    const startDateChanged = body.start_date !== undefined && body.start_date !== existingMember.start_date;

    if (planChanged || startDateChanged) {
      // Fetch new plan if plan changed
      let planData = null;
      if (newPlanId) {
        const { data: plan, error: planError } = await supabase
          .from('membership_plans')
          .select('id, duration_days, final_price, gym_id')
          .eq('id', newPlanId)
          .maybeSingle();

        if (planError) throw planError;

        if (!plan) {
          return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
        }

        if (plan.gym_id !== existingMember.gym_id) {
          return NextResponse.json({ error: 'Plan does not belong to this gym' }, { status: 403 });
        }

        planData = plan;
      }

      updateData.plan_id = newPlanId;

      if (newStartDate) {
        updateData.start_date = newStartDate;
      }

      // Recalculate expiry_date
      if (newStartDate && planData) {
        const startDate = new Date(newStartDate);
        const expiryDate = new Date(startDate);
        expiryDate.setDate(expiryDate.getDate() + planData.duration_days);
        const expiryDateStr = expiryDate.toISOString().split('T')[0];

        updateData.expiry_date = expiryDateStr;
        updateData.amount_paid = planData.final_price;
        updateData.status = calculateStatus(expiryDateStr);
      }
    }

    // Recalculate age if date_of_birth changed
    if (body.date_of_birth !== undefined) {
      updateData.age = body.date_of_birth ? calculateAge(body.date_of_birth) : null;
    }

    const { data: updatedMember, error: updateError } = await supabase
      .from('members')
      .update(updateData)
      .eq('id', memberId)
      .select('id, gym_id, member_id, name, photo_url, date_of_birth, age, gender, phone, address, emergency_contact, plan_id, start_date, expiry_date, amount_paid, status, notes, created_at, updated_at')
      .maybeSingle();

    if (updateError) throw updateError;

    return NextResponse.json({ data: updatedMember });
  } catch (error) {
    console.error('Member PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
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

    // Verify ownership before deleting
    let memberQuery = supabase
      .from('members')
      .select('id, gym_id')
      .eq('id', memberId);

    if (session.role === 'GYM_ADMIN') {
      if (!session.gymId) {
        return NextResponse.json({ error: 'No gym associated with account' }, { status: 403 });
      }
      memberQuery = memberQuery.eq('gym_id', session.gymId);
    }

    const { data: existingMember, error: fetchError } = await memberQuery.maybeSingle();

    if (fetchError) throw fetchError;
    if (!existingMember) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    const { error: deleteError } = await supabase
      .from('members')
      .delete()
      .eq('id', memberId);

    if (deleteError) throw deleteError;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Member DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
