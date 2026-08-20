import { cookies } from 'next/headers';
import { verifySessionToken, TOKEN_COOKIE_NAME, TOKEN_COOKIE_MAX_AGE, type SessionUser } from './auth';
import { createServerClient } from './supabase-server';

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = cookies();
  const token = cookieStore.get(TOKEN_COOKIE_NAME)?.value;
  if (!token) return null;

  const session = await verifySessionToken(token);
  if (!session) return null;

  try {
    const supabase = createServerClient();
    const { data: currentUser } = await Promise.race([
      supabase
        .from('users')
        .select('id, username, role, gym_id, name, status')
        .eq('id', session.userId)
        .maybeSingle(),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('session lookup timeout')), 2500);
      }),
    ]);

    if (currentUser) {
      if (currentUser.status && currentUser.status !== 'active') {
        return null;
      }
      return {
        userId: currentUser.id,
        username: currentUser.username,
        role: currentUser.role as SessionUser['role'],
        gymId: currentUser.gym_id,
        name: currentUser.name,
      };
    }
  } catch {
    // Fall back to the signed token if the database is temporarily unavailable.
  }

  return session;
}

export function getTokenCookieName() {
  return TOKEN_COOKIE_NAME;
}

export function getTokenMaxAge() {
  return TOKEN_COOKIE_MAX_AGE;
}
