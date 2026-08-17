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
    const gymIdFilter = searchParams.get('gymId');

    let query = supabase
      .from('payments')
      .select(`
        id, gym_id, member_id, plan_id, amount, discount, payment_method, payment_date,
        notes, created_at,
        members!inner(member_id, name, phone),
        membership_plans(name)
      `)
      .order('payment_date', { ascending: false });

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

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ data: data || [] });
  } catch (error) {
    console.error('Payments GET error:', error);
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

    // Determine gymId
    let gymId: string;
    if (session.role === 'GYM_ADMIN') {
      if (!session.gymId) {
        return NextResponse.json({ error: 'No gym associated with account' }, { status: 403 });
      }
      gymId = session.gymId;
    } else {
      // SUPER_ADMIN
      if (!body.gymId) {
        return NextResponse.json({ error: 'gymId is required' }, { status: 400 });
      }
      gymId = body.gymId;
    }

    // Validate required fields
    if (!body.member_id) {
      return NextResponse.json({ error: 'member_id is required' }, { status: 400 });
    }
    if (body.amount === undefined || body.amount === null) {
      return NextResponse.json({ error: 'amount is required' }, { status: 400 });
    }

    // Verify member belongs to this gym
    const { data: member, error: memberError } = await supabase
      .from('members')
      .select('id, gym_id')
      .eq('id', body.member_id)
      .maybeSingle();

    if (memberError) throw memberError;

    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }
    if (member.gym_id !== gymId) {
      return NextResponse.json({ error: 'Member does not belong to this gym' }, { status: 403 });
    }

    // If plan_id provided, verify it belongs to this gym
    if (body.plan_id) {
      const { data: plan, error: planError } = await supabase
        .from('membership_plans')
        .select('id, gym_id')
        .eq('id', body.plan_id)
        .maybeSingle();

      if (planError) throw planError;

      if (!plan) {
        return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
      }
      if (plan.gym_id !== gymId) {
        return NextResponse.json({ error: 'Plan does not belong to this gym' }, { status: 403 });
      }
    }

    const insertData = {
      gym_id: gymId,
      member_id: body.member_id,
      plan_id: body.plan_id || null,
      amount: Number(body.amount),
      discount: Number(body.discount || 0),
      payment_method: body.payment_method || null,
      payment_date: new Date().toISOString(),
      notes: body.notes || null,
    };

    const { data: payment, error: insertError } = await supabase
      .from('payments')
      .insert(insertData)
      .select('id, gym_id, member_id, plan_id, amount, discount, payment_method, payment_date, notes, created_at')
      .maybeSingle();

    if (insertError) throw insertError;

    return NextResponse.json({ data: payment }, { status: 201 });
  } catch (error) {
    console.error('Payments POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
