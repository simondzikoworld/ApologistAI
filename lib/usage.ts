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

// ---------------------------------------------------------------------------
// Rewarded ads (mobile app): watching an ad adds one Simple question, at most
// twice a day. The app reports the reward itself rather than via AdMob's
// server-side verification — at 1 question × 2/day, the most a faked claim can
// win is two questions, which isn't worth the verification machinery. The cap
// is what's enforced here.
// ---------------------------------------------------------------------------

export const REWARD_QUESTIONS_PER_AD = 1;
export const REWARDED_ADS_PER_DAY = 2;

/** Who a bonus belongs to: the account, or the IP address for guests. */
export function bonusSubject(userId: string | null, ip: string): string {
  return userId ? `user:${userId}` : `ip:${ip}`;
}

function bonusKey(subject: string): string {
  return `bonus:${subject}:${todayUTC()}`;
}

/** Ads already rewarded today for this subject. */
export async function rewardedAdsToday(subject: string): Promise<number> {
  return Number((await redis.get<number>(bonusKey(subject))) ?? 0);
}

/** Records one watched ad. Returns false (and changes nothing) once the cap is reached. */
export async function claimRewardedAd(subject: string): Promise<boolean> {
  const key = bonusKey(subject);
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, TTL_SECONDS);
  if (count > REWARDED_ADS_PER_DAY) {
    await redis.decr(key);
    return false;
  }
  return true;
}

/** Extra Simple questions earned from ads today. */
export async function bonusQuestions(subject: string): Promise<number> {
  return (await rewardedAdsToday(subject)) * REWARD_QUESTIONS_PER_AD;
}

export function getLimit(tier: Tier, mode: ResponseMode): number {
  const limits = DAILY_LIMITS[tier] as Record<string, number>;
  return limits[mode] ?? 0;
}
