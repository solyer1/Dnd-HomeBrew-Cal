/**
 * GET  /api/admin/config  — Public read (app loads this on mount)
 * PUT  /api/admin/config  — Authenticated write (admin panel saves here)
 */

// Tell Next.js AND Vercel's Edge CDN: never cache this route
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

import { cookies } from 'next/headers';
import { verifyAdminToken, COOKIE_NAME } from '@/lib/auth';
import { getRedis, ADMIN_CONFIG_KEY } from '@/lib/redis';
import { DEFAULT_CRIT_TABLE } from '@/config/critTable';
import { DEFAULT_APP_SETTINGS } from '@/config/defaults';
import { DEFAULT_DAMAGE_TYPES } from '@/config/damageTypes';
import type { AdminConfig, DamageTypeConfig } from '@/types/config';

const DEFAULT_CONFIG: AdminConfig = {
  critTable: DEFAULT_CRIT_TABLE,
  settings: DEFAULT_APP_SETTINGS,
  statusTypes: [],
  damageTypes: DEFAULT_DAMAGE_TYPES,
};

// No-cache headers that work on Vercel's Edge CDN too
const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
  'Pragma': 'no-cache',
  'Expires': '0',
  // Vercel-specific CDN bypass headers
  'CDN-Cache-Control': 'no-store',
  'Vercel-CDN-Cache-Control': 'no-store',
};

async function getConfig(): Promise<AdminConfig> {
  const redis = getRedis();
  const stored = await redis.get(ADMIN_CONFIG_KEY);

  if (!stored) {
    console.log('[config] No stored config found — using defaults');
    return DEFAULT_CONFIG;
  }

  // @upstash/redis auto-parses JSON but handle string fallback
  const parsed = (typeof stored === 'string' ? JSON.parse(stored) : stored) as Partial<AdminConfig>;

  console.log('[config] Loaded from Redis — statusTypes:', parsed.statusTypes?.length ?? 0, 'damageTypes:', parsed.damageTypes?.length ?? 0);

  // Filter out any corrupted damage types (missing required id or label)
  const cleanDamageTypes: DamageTypeConfig[] = Array.isArray(parsed.damageTypes)
    ? parsed.damageTypes.filter(
        (dt): dt is DamageTypeConfig =>
          dt != null &&
          typeof dt === 'object' &&
          typeof (dt as DamageTypeConfig).id === 'string' &&
          (dt as DamageTypeConfig).id.length > 0 &&
          (dt as DamageTypeConfig).id !== 'true' &&
          typeof (dt as DamageTypeConfig).label === 'string' &&
          (dt as DamageTypeConfig).label.length > 0
      )
    : DEFAULT_DAMAGE_TYPES;

  // If all damage types got filtered out, use defaults
  const damageTypes = cleanDamageTypes.length > 0 ? cleanDamageTypes : DEFAULT_DAMAGE_TYPES;

  return {
    critTable: parsed.critTable ?? DEFAULT_CONFIG.critTable,
    settings: { ...DEFAULT_CONFIG.settings, ...(parsed.settings ?? {}) },
    statusTypes: Array.isArray(parsed.statusTypes) ? parsed.statusTypes : [],
    damageTypes,
  };
}

export async function GET() {
  try {
    const config = await getConfig();
    return Response.json(config, { headers: NO_CACHE_HEADERS });
  } catch (err) {
    console.error('[GET /api/admin/config]', err);
    return Response.json(DEFAULT_CONFIG, { headers: NO_CACHE_HEADERS });
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

    console.log('[config] Saved — statusTypes:', next.statusTypes?.length ?? 0, 'damageTypes:', next.damageTypes?.length ?? 0);

    return Response.json({ ok: true, config: next }, { headers: NO_CACHE_HEADERS });
  } catch (err) {
    console.error('[PUT /api/admin/config]', err);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}
