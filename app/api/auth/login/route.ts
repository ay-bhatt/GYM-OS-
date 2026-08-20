import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { createServerClient } from '@/lib/supabase-server';
import { createSessionToken, TOKEN_COOKIE_NAME, TOKEN_COOKIE_MAX_AGE } from '@/lib/auth';

const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const LOGIN_WINDOW_MS = 10 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 8;

function clientKey(request: NextRequest) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
}

function tooManyAttempts(key: string) {
  const now = Date.now();
  const current = loginAttempts.get(key);
  if (!current || current.resetAt < now) {
    loginAttempts.set(key, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
    return false;
  }
  current.count += 1;
  return current.count > LOGIN_MAX_ATTEMPTS;
}

export async function POST(request: NextRequest) {
  try {
    if (tooManyAttempts(clientKey(request))) {
      return NextResponse.json({ error: 'Too many login attempts. Try again in a few minutes.' }, { status: 429 });
    }

    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    const loginName = String(username).trim();
    const { data: user, error } = await supabase
      .from('users')
      .select('id, username, password_hash, role, gym_id, name, status')
      .ilike('username', loginName)
      .maybeSingle();

    if (error || !user) {
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      );
    }

    if (user.status !== 'active') {
      return NextResponse.json(
        { error: 'This account has been disabled. Contact your administrator.' },
        { status: 403 }
      );
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      );
    }

    const token = await createSessionToken({
      userId: user.id,
      username: user.username,
      role: user.role,
      gymId: user.gym_id,
      name: user.name,
    });

    const response = NextResponse.json({
      role: user.role,
      redirect: user.role === 'SUPER_ADMIN' ? '/super-admin/dashboard' : '/gym/dashboard',
    });

    response.cookies.set(TOKEN_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: TOKEN_COOKIE_MAX_AGE,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('[auth/login]', error);
    return NextResponse.json(
      { error: 'An error occurred during login. Please try again.' },
      { status: 500 }
    );
  }
}
