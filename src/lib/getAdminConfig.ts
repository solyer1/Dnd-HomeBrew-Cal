/**
 * getAdminConfig — shared server-side helper
 * Fetches the admin config from Redis (or returns defaults).
 * Used by layout.tsx (server component) and the API route.
 */

import { getRedis, ADMIN_CONFIG_KEY } from '@/lib/redis';
import { DEFAULT_CRIT_TABLE } from '@/config/critTable';
import { DEFAULT_APP_SETTINGS } from '@/config/defaults';
import { DEFAULT_DAMAGE_TYPES } from '@/config/damageTypes';
import type { AdminConfig, DamageTypeConfig } from '@/types/config';

export const DEFAULT_ADMIN_CONFIG: AdminConfig = {
  critTable: DEFAULT_CRIT_TABLE,
  settings: DEFAULT_APP_SETTINGS,
  statusTypes: [],
  damageTypes: DEFAULT_DAMAGE_TYPES,
};

export async function getAdminConfig(): Promise<AdminConfig> {
  try {
    const redis = getRedis();
    const stored = await redis.get(ADMIN_CONFIG_KEY);

    if (!stored) {
      return DEFAULT_ADMIN_CONFIG;
    }

    const parsed = (
      typeof stored === 'string' ? JSON.parse(stored) : stored
    ) as Partial<AdminConfig>;

    // Clean out any corrupted damage types (missing id or label)
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

    return {
      critTable: parsed.critTable ?? DEFAULT_ADMIN_CONFIG.critTable,
      settings: { ...DEFAULT_ADMIN_CONFIG.settings, ...(parsed.settings ?? {}) },
      statusTypes: Array.isArray(parsed.statusTypes) ? parsed.statusTypes : [],
      damageTypes: cleanDamageTypes.length > 0 ? cleanDamageTypes : DEFAULT_DAMAGE_TYPES,
    };
  } catch (err) {
    console.error('[getAdminConfig] Failed to load from Redis:', err);
    return DEFAULT_ADMIN_CONFIG;
  }
}
