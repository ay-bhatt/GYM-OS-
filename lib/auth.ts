import { SignJWT, jwtVerify } from 'jose';

const AUTH_SECRET = process.env.AUTH_SECRET || process.env.JWT_SECRET || 'dev-secret-change-in-production';
const TOKEN_NAME = 'gym_session';
const TOKEN_MAX_AGE = 60 * 60 * 24; // 24 hours

const encoder = new TextEncoder();

export interface SessionUser {
  userId: string;
  username: string;
  role: 'SUPER_ADMIN' | 'GYM_ADMIN';
  gymId: string | null;
  name: string;
}

export async function createSessionToken(user: SessionUser): Promise<string> {
  return await new SignJWT({ ...user })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${TOKEN_MAX_AGE}s`)
    .sign(encoder.encode(AUTH_SECRET));
}

export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, encoder.encode(AUTH_SECRET));
    return {
      userId: payload.userId as string,
      username: payload.username as string,
      role: payload.role as 'SUPER_ADMIN' | 'GYM_ADMIN',
      gymId: payload.gymId as string | null,
      name: payload.name as string,
    };
  } catch {
    return null;
  }
}

export const TOKEN_COOKIE_NAME = TOKEN_NAME;
export const TOKEN_COOKIE_MAX_AGE = TOKEN_MAX_AGE;
