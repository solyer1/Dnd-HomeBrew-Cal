/**
 * GET  /api/admin/config  — Public read (app loads this on mount)
 * PUT  /api/admin/config  — Authenticated write (admin panel saves here)
 */

export const dynamic = 'force-dynamic';

import { cookies } from 'next/headers';
import { verifyAdminToken, COOKIE_NAME } from '@/lib/auth';
import { getRedis, ADMIN_CONFIG_KEY } from '@/lib/redis';
import { DEFAULT_CRIT_TABLE } from '@/config/critTable';
import { DEFAULT_APP_SETTINGS } from '@/config/defaults';
import { DEFAULT_DAMAGE_TYPES } from '@/config/damageTypes';
import type { AdminConfig } from '@/types/config';

const DEFAULT_CONFIG: AdminConfig = {
  critTable: DEFAULT_CRIT_TABLE,
  settings: DEFAULT_APP_SETTINGS,
  statusTypes: [],
  damageTypes: DEFAULT_DAMAGE_TYPES,
};

async function getConfig(): Promise<AdminConfig> {
  const redis = getRedis();
  const stored = await redis.get(ADMIN_CONFIG_KEY);
  if (!stored) return DEFAULT_CONFIG;
  // @upstash/redis auto-parses JSON
  const parsed = typeof stored === 'string' ? JSON.parse(stored) : stored;
  return { ...DEFAULT_CONFIG, ...parsed } as AdminConfig;
}

export async function GET() {
  try {
    const config = await getConfig();
    return Response.json(config);
  } catch (err) {
    console.error('[GET /api/admin/config]', err);
    return Response.json(DEFAULT_CONFIG);
  }
}

export async function PUT(request: Request) {
  try {
    // Auth check
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value ?? null;
    if (!token || !(await verifyAdminToken(token))) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: Partial<AdminConfig> = await request.json();
    const current = await getConfig();
    const next: AdminConfig = { ...current, ...body };

    const redis = getRedis();
    await redis.set(ADMIN_CONFIG_KEY, JSON.stringify(next));

    return Response.json({ ok: true, config: next });
  } catch (err) {
    console.error('[PUT /api/admin/config]', err);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}
