import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { createServerClient } from '@/lib/supabase-server';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

function normalize(value: string) {
  return value.trim().toLowerCase();
}

async function isGymIdTaken(supabase: ReturnType<typeof createServerClient>, gymId: string, excludeId?: string) {
  let query = supabase.from('gyms').select('id').ilike('gym_id', gymId);
  if (excludeId) query = query.neq('id', excludeId);
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

async function isUsernameTaken(supabase: ReturnType<typeof createServerClient>, username: string, excludeId?: string) {
  let query = supabase.from('users').select('id').ilike('username', username);
  if (excludeId) query = query.neq('id', excludeId);
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden — Super Admin only' }, { status: 403 });
    }

    const supabase = createServerClient();

    // Fetch all gyms
    const { data: gyms, error: gymsError } = await supabase
      .from('gyms')
      .select('id, gym_id, name, owner_name, phone, email, address, status, created_at, updated_at')
      .order('created_at', { ascending: true });

    if (gymsError) throw gymsError;

    // Enrich with member counts and revenue
    const gymsWithStats = await Promise.all(
            (gyms || []).map(async (gym) => {
        const { count: memberCount } = await supabase
          .from('members')
          .select('*', { count: 'exact', head: true })
          .eq('gym_id', gym.gym_id);

        const { data: payments } = await supabase
          .from('payments')
          .select('amount')
          .eq('gym_id', gym.gym_id);

        const revenue = (payments || []).reduce((sum, p) => sum + Number(p.amount), 0);

        // Fetch the gym admin's login username
        const { data: adminUser } = await supabase
          .from('users')
          .select('username, password_plain')
          .eq('gym_id', gym.gym_id)
          .eq('role', 'GYM_ADMIN')
          .maybeSingle();

        return {
          ...gym,
          admin_username: adminUser?.username || null,
          admin_password: adminUser?.password_plain || null,
          memberCount: memberCount || 0,
          revenue,
        };
      })
    );

    return NextResponse.json({ data: gymsWithStats });
  } catch (error) {
    console.error('Gyms GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden — Super Admin only' }, { status: 403 });
    }

    const supabase = createServerClient();
    const body = await request.json();

    // Validate required fields
    if (!body.name || !body.name.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // Auto-generate gym_id: GYM-XXX sequential, but verify against a
    // case-insensitive uniqueness check before saving.
    const { data: existingGyms, error: countError } = await supabase
      .from('gyms')
      .select('gym_id')
      .order('created_at', { ascending: false })
      .limit(25);

    if (countError) throw countError;

    let nextNum = 1;
    for (const row of existingGyms || []) {
      const match = String(row.gym_id || '').match(/GYM-(\d+)/i);
      if (match) nextNum = Math.max(nextNum, parseInt(match[1], 10) + 1);
    }

    let gymId = `GYM-${String(nextNum).padStart(3, '0')}`;
    while (await isGymIdTaken(supabase, gymId)) {
      nextNum += 1;
      gymId = `GYM-${String(nextNum).padStart(3, '0')}`;
    }

    // Create gym
    const { data: gym, error: gymError } = await supabase
      .from('gyms')
      .insert({
        gym_id: gymId,
        name: body.name.trim(),
        owner_name: body.owner_name || null,
        phone: body.phone || null,
        email: body.email || null,
        address: body.address || null,
        status: 'active',
      })
      .select('id, gym_id, name, owner_name, phone, email, address, status, created_at, updated_at')
      .maybeSingle();

    if (gymError) throw gymError;

    // Create gym admin user
    let adminUsername = `${normalize(gymId).replace(/[^a-z0-9]/g, '')}_admin`;
    let suffix = 1;
    while (await isUsernameTaken(supabase, adminUsername)) {
      adminUsername = `${normalize(gymId).replace(/[^a-z0-9]/g, '')}_admin_${suffix}`;
      suffix += 1;
    }
        // Determine the gym admin password. A Super Admin may supply a known
    // `password` (stored for display); otherwise a random temporary one is
    // generated and shown once.
    let defaultPassword: string;
    if (body.password) {
      const pw = String(body.password);
      if (pw.length < 8) {
        return NextResponse.json(
          { error: 'Password must be at least 8 characters' },
          { status: 400 }
        );
      }
      defaultPassword = pw;
    } else {
      defaultPassword = crypto.randomBytes(12).toString('base64url');
    }
    const passwordHash = await bcrypt.hash(defaultPassword, 10);

    const { data: adminUser, error: adminError } = await supabase
      .from('users')
      .insert({
        username: adminUsername,
        password_hash: passwordHash,
        password_plain: defaultPassword,
        role: 'GYM_ADMIN',
        gym_id: gymId,
        name: body.owner_name || body.name.trim(),
        status: 'active',
      })
      .select('id, username, role, gym_id, name, status, created_at')
      .maybeSingle();

    if (adminError) throw adminError;

    return NextResponse.json({
      data: {
        gym,
        adminUser: {
          ...adminUser,
          // Include the temporary password so the super admin can share it
          temporaryPassword: defaultPassword,
        },
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Gyms POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
