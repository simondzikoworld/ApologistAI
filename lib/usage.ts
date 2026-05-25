import { redis } from "./redis";
import type { ResponseMode } from "./types";

const TTL_SECONDS = 25 * 60 * 60; // 25 hours — outlives midnight

export const DAILY_LIMITS = {
  anon: { simple: 12, detailed: 0,  challenge: Infinity },
  free: { simple: 12, detailed: 0,  challenge: Infinity },
  pro:  { simple: 30, detailed: 15, challenge: Infinity },
} as const;

export type Tier = keyof typeof DAILY_LIMITS;

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

export function userUsageKey(userId: string, mode: ResponseMode): string {
  return `usage:${userId}:${todayUTC()}:${mode}`;
}

export function ipUsageKey(ip: string): string {
  return `usage:ip:${ip}:${todayUTC()}:simple`;
}

export async function incrementUsage(key: string): Promise<number> {
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, TTL_SECONDS);
  }
  return count;
}

export function getLimit(tier: Tier, mode: ResponseMode): number {
  const limits = DAILY_LIMITS[tier] as Record<string, number>;
  return limits[mode] ?? 0;
}
