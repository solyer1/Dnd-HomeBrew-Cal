/**
 * Next.js Middleware
 * Protects /admin pages and /api/admin/* routes (except /api/admin/auth).
 * Runs on the Edge runtime — uses jose which is Edge-compatible.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken, COOKIE_NAME } from '@/lib/auth';

export const config = {
  matcher: ['/admin/:path*', '/api/admin/((?!auth).*)'],
};

export async function proxy(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value ?? null;
  const isValid = token ? await verifyAdminToken(token) : false;

  if (!isValid) {
    const url = request.nextUrl;

    // API routes → return 401 JSON
    if (url.pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Admin pages → redirect to login page if they try to access a subpage
    if (url.pathname === '/admin') {
      return NextResponse.next();
    }
    const loginUrl = new URL('/admin', request.url);
    loginUrl.searchParams.set('unauthorized', '1');
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}
