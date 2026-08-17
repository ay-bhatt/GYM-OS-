import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySessionToken, TOKEN_COOKIE_NAME } from './lib/auth';

const PROTECTED_ROUTES = ['/super-admin', '/gym'];
const LOGIN_ROUTE = '/login';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(TOKEN_COOKIE_NAME)?.value;

  const isProtected = PROTECTED_ROUTES.some((route) => pathname.startsWith(route));

  if (!isProtected) {
    return NextResponse.next();
  }

  if (!token) {
    return NextResponse.redirect(new URL(LOGIN_ROUTE, request.url));
  }

  const user = await verifySessionToken(token);

  if (!user) {
    const response = NextResponse.redirect(new URL(LOGIN_ROUTE, request.url));
    response.cookies.delete(TOKEN_COOKIE_NAME);
    return response;
  }

  // Role-based route protection
  if (pathname.startsWith('/super-admin') && user.role !== 'SUPER_ADMIN') {
    return NextResponse.redirect(new URL('/gym/dashboard', request.url));
  }

  if (pathname.startsWith('/gym') && user.role !== 'GYM_ADMIN') {
    return NextResponse.redirect(new URL('/super-admin/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/super-admin/:path*', '/gym/:path*'],
};
