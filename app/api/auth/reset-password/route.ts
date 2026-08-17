import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getSession } from '@/lib/session';
import { createServerClient } from '@/lib/supabase-server';
import { createSessionToken, TOKEN_COOKIE_NAME, TOKEN_COOKIE_MAX_AGE } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only a logged-in gym admin can reset their own password (self-service).
    // Super admins reset gym passwords via PUT /api/gyms/[id] with reset_password.
    if (session.role !== 'GYM_ADMIN') {
      return NextResponse.json({ error: 'Forbidden — gym admin only' }, { status: 403 });
    }

    const supabase = createServerClient();

    // Generate a random temporary password
    const newPassword =
      Math.random().toString(36).slice(2, 10).toUpperCase() +
      Math.random().toString(36).slice(2, 8) +
      '!1';

    const passwordHash = await bcrypt.hash(newPassword, 10);

    const { error } = await supabase
      .from('users')
      .update({ password_hash: passwordHash, password_plain: newPassword, password_temp: true, updated_at: new Date().toISOString() })
      .eq('id', session.userId);

    if (error) throw error;

    // Re-issue the session cookie so the JWT reflects the password_temp flag
    // (consumers can prompt "change password on first login" in the UI).
    const freshToken = await createSessionToken({
      userId: session.userId,
      username: session.username,
      role: session.role,
      gymId: session.gymId,
      name: session.name,
    });

    const response = NextResponse.json({
      data: {
        message: 'Password has been reset. Please use the new password to log in, then change it.',
        temporaryPassword: newPassword,
      },
    });

    response.cookies.set(TOKEN_COOKIE_NAME, freshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: TOKEN_COOKIE_MAX_AGE,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('[api/auth/reset-password] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}