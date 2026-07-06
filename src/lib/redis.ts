/**
 * Upstash Redis client (server-side only).
 * Falls back to an in-memory store when env vars are missing (local dev).
 */

import { Redis } from '@upstash/redis';

// Lazy singleton so we don't reconnect on every hot-reload
let _redis: Redis | null = null;

// ── In-memory fallback for local development ──────────────────────────────────
const memStore = new Map<string, unknown>();

const memFallback = {
  get: async (key: string) => memStore.get(key) ?? null,
  set: async (key: string, value: unknown) => { memStore.set(key, value); return 'OK'; },
};

export function getRedis(): Redis | typeof memFallback {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (
    !url || 
    !token || 
    url === 'https://your-instance.upstash.io' ||
    token === 'your-token-here'
  ) {
    // Local dev without Upstash (or using placeholders) — use memory store
    return memFallback as unknown as Redis;
  }

  if (!_redis) {
    _redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  }
  return _redis;
}

export const ADMIN_CONFIG_KEY = 'dnd:admin:config';
