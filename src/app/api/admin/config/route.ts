/**
 * GET  /api/admin/config  — Public read (app loads this on mount)
 * PUT  /api/admin/config  — Authenticated write (admin panel saves here)
 */

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

import { cookies } from 'next/headers';
import { verifyAdminToken, COOKIE_NAME } from '@/lib/auth';
import { getRedis, ADMIN_CONFIG_KEY } from '@/lib/redis';
import { getAdminConfig, DEFAULT_ADMIN_CONFIG } from '@/lib/getAdminConfig';
import type { AdminConfig } from '@/types/config';

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
  'Pragma': 'no-cache',
  'Expires': '0',
  'CDN-Cache-Control': 'no-store',
  'Vercel-CDN-Cache-Control': 'no-store',
};

export async function GET() {
  try {
    const config = await getAdminConfig();
    return Response.json(config, { headers: NO_CACHE_HEADERS });
  } catch (err) {
    console.error('[GET /api/admin/config]', err);
    return Response.json(DEFAULT_ADMIN_CONFIG, { headers: NO_CACHE_HEADERS });
  }
}

export async function PUT(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value ?? null;
    if (!token || !(await verifyAdminToken(token))) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: Partial<AdminConfig> = await request.json();
    const current = await getAdminConfig();
    const next: AdminConfig = { ...current, ...body };

    const redis = getRedis();
    await redis.set(ADMIN_CONFIG_KEY, JSON.stringify(next));

    console.log('[config] Saved — statusTypes:', next.statusTypes?.length ?? 0, 'damageTypes:', next.damageTypes?.length ?? 0);

    return Response.json({ ok: true, config: next }, { headers: NO_CACHE_HEADERS });
  } catch (err) {
    console.error('[PUT /api/admin/config]', err);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}
