import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { createServerClient } from '@/lib/supabase-server';
import crypto from 'crypto';

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

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim() || '';
    const status = searchParams.get('status')?.trim() || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = (page - 1) * limit;

    let query = supabase.from('members').select(
      'id, gym_id, member_id, name, photo_url, date_of_birth, age, gender, phone, address, emergency_contact, plan_id, start_date, expiry_date, amount_paid, status, notes, created_at, updated_at',
      { count: 'exact' }
    );

    if (session.role === 'GYM_ADMIN') {
      if (!session.gymId) {
        return NextResponse.json({ error: 'No gym associated with account' }, { status: 403 });
      }
      query = query.eq('gym_id', session.gymId);
    } else {
      // SUPER_ADMIN
      const gymIdFilter = searchParams.get('gymId');
      if (gymIdFilter) {
        query = query.eq('gym_id', gymIdFilter);
      }
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%,member_id.ilike.%${search}%`);
    }

    if (status) {
      query = query.eq('status', status);
    }

    query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

    const { data, count, error } = await query;

    if (error) throw error;

    return NextResponse.json({
      data: data || [],
      total: count || 0,
      page,
      limit,
    });
  } catch (error) {
    console.error('Members GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const supabase = createServerClient();

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
    if (!body.name || !body.name.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }
    if (!body.plan_id) {
      return NextResponse.json({ error: 'Plan is required' }, { status: 400 });
    }
    if (!body.start_date) {
      return NextResponse.json({ error: 'Start date is required' }, { status: 400 });
    }

    // Fetch plan to get duration and price
    const { data: plan, error: planError } = await supabase
      .from('membership_plans')
      .select('id, duration_days, final_price, gym_id')
      .eq('id', body.plan_id)
      .maybeSingle();

    if (planError) throw planError;
    if (!plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }
    if (plan.gym_id !== gymId) {
      return NextResponse.json({ error: 'Plan does not belong to this gym' }, { status: 403 });
    }

    // Auto-generate member_id: gym_id + sequential number
    const { count: existingCount, error: countError } = await supabase
      .from('members')
      .select('*', { count: 'exact', head: true })
      .eq('gym_id', gymId);

    if (countError) throw countError;

    const seqNumber = (existingCount || 0) + 1;
    const memberId = `${gymId}-${String(seqNumber).padStart(4, '0')}`;

    // Generate qr_token
    const qrToken = crypto.randomBytes(32).toString('hex');

    // Calculate expiry_date
    const startDate = new Date(body.start_date);
    const expiryDate = new Date(startDate);
    expiryDate.setDate(expiryDate.getDate() + plan.duration_days);
    const expiryDateStr = expiryDate.toISOString().split('T')[0];

    // Calculate status
    const status = calculateStatus(expiryDateStr);

    // Calculate age
    const age = body.date_of_birth ? calculateAge(body.date_of_birth) : null;

    // Create member
    const insertData: Record<string, unknown> = {
      gym_id: gymId,
      member_id: memberId,
      name: body.name.trim(),
      phone: body.phone || null,
      address: body.address || null,
      date_of_birth: body.date_of_birth || null,
      age,
      gender: body.gender || null,
      emergency_contact: body.emergency_contact || null,
      plan_id: body.plan_id,
      start_date: body.start_date,
      expiry_date: expiryDateStr,
      amount_paid: plan.final_price,
      status,
      qr_token: qrToken,
      notes: body.notes || null,
    };

    const { data: member, error: insertError } = await supabase
      .from('members')
      .insert(insertData)
      .select('id, gym_id, member_id, name, photo_url, date_of_birth, age, gender, phone, address, emergency_contact, plan_id, start_date, expiry_date, amount_paid, status, notes, created_at, updated_at')
      .maybeSingle();

    if (insertError) throw insertError;

    return NextResponse.json({ data: member }, { status: 201 });
  } catch (error) {
    console.error('Members POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
