/**
 * POST /api/admin/auth
 * Validates admin password → issues a signed JWT session cookie.
 */

import { cookies } from 'next/headers';
import { signAdminToken, COOKIE_NAME } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { password } = await request.json();

    const secret = process.env.ADMIN_SECRET;
    if (!secret) {
      return Response.json({ error: 'Admin secret not configured.' }, { status: 500 });
    }

    if (password !== secret) {
      // Small delay to deter brute-force
      await new Promise((r) => setTimeout(r, 300));
      return Response.json({ error: 'Invalid password.' }, { status: 401 });
    }

    const token = await signAdminToken();
    const cookieStore = await cookies();

    cookieStore.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 8, // 8 hours
    });

    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: 'Bad request.' }, { status: 400 });
  }
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
  return Response.json({ ok: true });
}
