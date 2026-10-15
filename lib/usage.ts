import { redis } from "./redis";
import type { ResponseMode } from "./types";

const TTL_SECONDS = 25 * 60 * 60; // 25 hours — outlives midnight

export const DAILY_LIMITS = {
  anon: { simple: 3,  detailed: 0,  challenge: Infinity },
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

// Free accounts get one Detailed answer per window, as a taste of Pro.
export const DETAILED_TRIAL_DAYS = 3;
const TRIAL_SECONDS = DETAILED_TRIAL_DAYS * 24 * 60 * 60;

function detailedTrialKey(userId: string): string {
  return `trial:detailed:${userId}`;
}

/** Claims the trial if it's free. SET NX makes two parallel requests unable to both win. */
export async function claimDetailedTrial(userId: string): Promise<boolean> {
  const result = await redis.set(detailedTrialKey(userId), Date.now(), { nx: true, ex: TRIAL_SECONDS });
  return result === "OK";
}

/** Gives the trial back, for when the answer it paid for never arrived. */
export async function refundDetailedTrial(userId: string): Promise<void> {
  await redis.del(detailedTrialKey(userId));
}

/** When the trial can next be used (ms epoch), or null if it's available now. */
export async function detailedTrialRetryAt(userId: string): Promise<number | null> {
  const ttl = await redis.ttl(detailedTrialKey(userId));
  return ttl > 0 ? Date.now() + ttl * 1000 : null;
}

export function getLimit(tier: Tier, mode: ResponseMode): number {
  const limits = DAILY_LIMITS[tier] as Record<string, number>;
  return limits[mode] ?? 0;
}
