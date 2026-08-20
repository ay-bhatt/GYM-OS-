import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getSession } from '@/lib/session';
import { createServerClient } from '@/lib/supabase-server';

function normalize(value: string) {
  return value.trim().toLowerCase();
}

async function writeAuditLog(
  supabase: ReturnType<typeof createServerClient>,
  payload: {
    actorId: string;
    action: string;
    targetType: string;
    targetId: string;
    details?: Record<string, unknown>;
  }
) {
  await supabase.from('audit_logs').insert({
    actor_id: payload.actorId,
    action: payload.action,
    target_type: payload.targetType,
    target_id: payload.targetId,
    details: payload.details ?? null,
  });
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

    if (session.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden — Super Admin only' }, { status: 403 });
    }

    const supabase = createServerClient();
    const gymId = params.id;

    // Fetch gym — id could be the UUID or the gym_id text
    let gymQuery = supabase
      .from('gyms')
      .select('id, gym_id, name, owner_name, phone, email, address, status, created_at, updated_at')
      .or(`id.eq.${gymId},gym_id.eq.${gymId}`);

    const { data: gym, error: gymError } = await gymQuery.maybeSingle();

    if (gymError) throw gymError;
    if (!gym) {
      return NextResponse.json({ error: 'Gym not found' }, { status: 404 });
    }

    // Fetch stats
    const { count: totalMembers } = await supabase
      .from('members')
      .select('*', { count: 'exact', head: true })
      .eq('gym_id', gym.gym_id);

    const { count: activeMembers } = await supabase
      .from('members')
      .select('*', { count: 'exact', head: true })
      .eq('gym_id', gym.gym_id)
      .eq('status', 'active');

    const { count: expiredMembers } = await supabase
      .from('members')
      .select('*', { count: 'exact', head: true })
      .eq('gym_id', gym.gym_id)
      .eq('status', 'expired');

    const today = new Date().toISOString().split('T')[0];
    const { count: todayAttendance } = await supabase
      .from('attendance')
      .select('*', { count: 'exact', head: true })
      .eq('gym_id', gym.gym_id)
      .eq('date', today);

    const { data: payments } = await supabase
      .from('payments')
      .select('amount')
      .eq('gym_id', gym.gym_id);

    const totalRevenue = (payments || []).reduce((sum, p) => sum + Number(p.amount), 0);

        const { count: planCount } = await supabase
      .from('membership_plans')
      .select('*', { count: 'exact', head: true })
      .eq('gym_id', gym.gym_id);

        // Fetch the gym admin's login username + the retrievable plaintext
    // password (display-only; auth still uses the bcrypt hash).
    const { data: adminUser } = await supabase
      .from('users')
      .select('username, password_plain')
      .eq('gym_id', gym.gym_id)
      .eq('role', 'GYM_ADMIN')
      .maybeSingle();

    return NextResponse.json({
      data: {
        ...gym,
        admin_username: adminUser?.username || null,
        admin_password: adminUser?.password_plain || null,
        stats: {
          totalMembers: totalMembers || 0,
          activeMembers: activeMembers || 0,
          expiredMembers: expiredMembers || 0,
          todayAttendance: todayAttendance || 0,
          totalRevenue,
          planCount: planCount || 0,
        },
      },
    });
  } catch (error) {
    console.error('Gym GET error:', error);
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

    if (session.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden — Super Admin only' }, { status: 403 });
    }

    const supabase = createServerClient();
    const lookupId = params.id;
    const body = await request.json();

    // Fetch existing gym (lookup by UUID id or gym_id text)
    const { data: existingGym, error: fetchError } = await supabase
      .from('gyms')
      .select('id, gym_id, name')
      .or(`id.eq.${lookupId},gym_id.eq.${lookupId}`)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!existingGym) {
      return NextResponse.json({ error: 'Gym not found' }, { status: 404 });
    }

    const oldGymId = existingGym.gym_id;
    let targetGymId = oldGymId;

    // ---- Rename the Gym ID (GYM-XXX) if requested ----
    const newGymId = body.gym_id ? String(body.gym_id).trim() : undefined;
    if (newGymId && newGymId !== oldGymId) {
      // Ensure the new ID is not already taken by another gym
      const { data: dup, error: dupErr } = await supabase
        .from('gyms')
        .select('id')
        .ilike('gym_id', newGymId)
        .neq('id', existingGym.id)
        .maybeSingle();
      if (dupErr) throw dupErr;
      if (dup) {
        return NextResponse.json(
          { error: 'Gym ID is already in use' },
          { status: 409 }
        );
      }

      // Cascade the ID change to every tenant-scoped table that stores gym_id
      const { error: usersCascade } = await supabase
        .from('users')
        .update({ gym_id: newGymId })
        .eq('gym_id', oldGymId);
      if (usersCascade) throw usersCascade;

      for (const table of ['members', 'membership_plans', 'attendance', 'payments']) {
        const { error: tErr } = await supabase
          .from(table)
          .update({ gym_id: newGymId })
          .eq('gym_id', oldGymId);
        if (tErr) throw tErr;
      }

      targetGymId = newGymId;
    }

    // ---- Update the gym admin's login username if requested ----
    const newAdminUsername =
      body.admin_username !== undefined && body.admin_username !== null
        ? String(body.admin_username).trim()
        : undefined;

    if (newAdminUsername !== undefined) {
      if (!newAdminUsername) {
        return NextResponse.json(
          { error: 'Login username cannot be empty' },
          { status: 400 }
        );
      }

      // Locate the gym's GYM_ADMIN user (uses the final gym_id after any rename)
      const { data: adminUser, error: adminErr } = await supabase
        .from('users')
        .select('id, username')
        .eq('gym_id', targetGymId)
        .eq('role', 'GYM_ADMIN')
        .maybeSingle();
      if (adminErr) throw adminErr;
      if (!adminUser) {
        return NextResponse.json(
          { error: 'No gym admin user found for this gym' },
          { status: 404 }
        );
      }

      // Only write when the value actually changes; enforce username uniqueness
      if (newAdminUsername !== adminUser.username) {
        const { data: userDup, error: userDupErr } = await supabase
          .from('users')
          .select('id')
          .ilike('username', newAdminUsername)
          .neq('id', adminUser.id)
          .maybeSingle();
        if (userDupErr) throw userDupErr;
        if (userDup) {
          return NextResponse.json(
            { error: 'This username is already in use.' },
            { status: 409 }
          );
        }

        const { error: usernameErr } = await supabase
          .from('users')
          .update({ username: newAdminUsername })
          .eq('id', adminUser.id);
        if (usernameErr) throw usernameErr;
      }
    }

    // ---- Build the gyms row update object ----
    const updateData: Record<string, unknown> = {};
    if (newGymId) updateData.gym_id = newGymId;
    for (const field of ['name', 'owner_name', 'phone', 'email', 'address', 'status']) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    const { data: updatedGym, error: updateError } = await supabase
      .from('gyms')
      .update(updateData)
      .eq('id', existingGym.id)
      .select('id, gym_id, name, owner_name, phone, email, address, status, created_at, updated_at')
      .maybeSingle();

    if (updateError) throw updateError;

        // Refresh the admin username for the response
    const { data: refreshedAdmin } = await supabase
      .from('users')
      .select('username')
      .ilike('gym_id', targetGymId)
      .eq('role', 'GYM_ADMIN')
      .maybeSingle();

        // ---- Set or reset the gym admin password if requested ----
    // Accepts an optional `password` (custom, known by the Super Admin) which
    // is hashed for auth and also stored in `password_plain` so it can be
    // retrieved later from the panel. Falls back to a random temporary
    // password when `reset_password === true` and no custom password is given.
    let newPassword: string | null = null;
    const customPassword =
      body.password !== undefined && body.password !== null ? String(body.password) : null;
    const shouldReset = body.reset_password === true || !!customPassword;

    if (shouldReset) {
      const { data: adminUser, error: adminErr } = await supabase
        .from('users')
        .select('id')
        .ilike('gym_id', targetGymId)
        .eq('role', 'GYM_ADMIN')
        .maybeSingle();
      if (adminErr) throw adminErr;
      if (!adminUser) {
        return NextResponse.json(
          { error: 'No gym admin user found for this gym' },
          { status: 404 }
        );
      }

      if (customPassword) {
        if (customPassword.length < 8) {
          return NextResponse.json(
            { error: 'Password must be at least 8 characters' },
            { status: 400 }
          );
        }
        // Use the Super Admin's chosen password verbatim.
        newPassword = customPassword;
      } else {
        // Generate a random temporary password.
        newPassword =
          Math.random().toString(36).slice(2, 10).toUpperCase() +
          Math.random().toString(36).slice(2, 8) +
          '!1';
      }

      const passwordHash = await bcrypt.hash(newPassword, 10);
      const { error: pwErr } = await supabase
        .from('users')
        .update({
          password_hash: passwordHash,
          password_plain: newPassword,
          password_temp: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', adminUser.id);
      if (pwErr) throw pwErr;

      void writeAuditLog(supabase, {
        actorId: session.userId,
        action: customPassword ? 'gym.admin_password_set' : 'gym.admin_password_reset',
        targetType: 'gym',
        targetId: existingGym.id,
        details: { gym_id: targetGymId, method: customPassword ? 'custom' : 'random' },
      });
    }

    void writeAuditLog(supabase, {
      actorId: session.userId,
      action: 'gym.updated',
      targetType: 'gym',
      targetId: existingGym.id,
      details: {
        gym_id: targetGymId,
        renamed: Boolean(newGymId && newGymId !== oldGymId),
        admin_username_changed: newAdminUsername !== undefined && refreshedAdmin?.username === newAdminUsername,
        password_reset: newPassword !== null,
      },
    });

    return NextResponse.json({
      data: {
        ...updatedGym,
        admin_username: refreshedAdmin?.username || null,
        ...(newPassword ? { admin_password: newPassword } : {}),
      },
    });
  } catch (error) {
    console.error('Gym PUT error:', error);
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

    if (session.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden — Super Admin only' }, { status: 403 });
    }

    const supabase = createServerClient();
    const lookupId = params.id;
    const body = await request.json().catch(() => ({}));

    // Fetch existing gym (lookup by UUID id or gym_id text)
    const { data: existingGym, error: fetchError } = await supabase
      .from('gyms')
      .select('id, gym_id, name')
      .or(`id.eq.${lookupId},gym_id.eq.${lookupId}`)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!existingGym) {
      return NextResponse.json({ error: 'Gym not found' }, { status: 404 });
    }

    const { gym_id: gymIdText, name, id } = existingGym;

    if (!body.confirmGymId || !String(body.confirmGymId).trim()) {
      return NextResponse.json(
        { error: 'Gym ID confirmation is required.' },
        { status: 400 }
      );
    }

    if (normalize(String(body.confirmGymId)) !== normalize(gymIdText)) {
      return NextResponse.json(
        { error: 'Type the exact Gym ID to confirm deletion.' },
        { status: 400 }
      );
    }

    // Hard-delete the gym and ALL of its tenant-scoped data.
    // The tenant tables have no FK back to gyms.gym_id, so each scope is
    // removed manually. Order respects the cross-table FKs that DO exist:
    //   attendance/payments -> members (ON DELETE CASCADE)
    //   members.plan_id -> membership_plans (ON DELETE SET NULL)
    const deleteByGymId = async (table: string) => {
      const { error } = await supabase.from(table).delete().eq('gym_id', gymIdText);
      if (error) throw error;
    };

    await deleteByGymId('attendance');
    await deleteByGymId('payments');
    await deleteByGymId('members');
    await deleteByGymId('membership_plans');
    await deleteByGymId('users');

    const { error: gymDeleteErr } = await supabase
      .from('gyms')
      .delete()
      .eq('id', id);
    if (gymDeleteErr) throw gymDeleteErr;

    void writeAuditLog(supabase, {
      actorId: session.userId,
      action: 'gym.deleted',
      targetType: 'gym',
      targetId: id,
      details: {
        gym_id: gymIdText,
        gym_name: name,
      },
    });

    return NextResponse.json({
      data: { id, gym_id: gymIdText, name },
      message: 'Gym and all associated data deleted permanently',
    });
  } catch (error) {
    console.error('Gym DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
