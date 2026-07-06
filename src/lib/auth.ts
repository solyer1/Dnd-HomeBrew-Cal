/**
 * JWT auth utilities (server-side only).
 * Uses `jose` which works in both Node.js and Edge runtimes.
 */

import { SignJWT, jwtVerify } from 'jose';

const SECRET_KEY = new TextEncoder().encode(
  process.env.ADMIN_JWT_SECRET ?? 'dev-only-secret-change-in-production'
);

const COOKIE_NAME = 'dnd_admin_session';
const EXPIRY = '8h';

export { COOKIE_NAME };

export async function signAdminToken(): Promise<string> {
  return new SignJWT({ role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(EXPIRY)
    .sign(SECRET_KEY);
}

export async function verifyAdminToken(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, SECRET_KEY);
    return true;
  } catch {
    return false;
  }
}

/** Read the session cookie from a Request headers string */
export function extractTokenFromCookies(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`));
  return match ? match[1] : null;
}
