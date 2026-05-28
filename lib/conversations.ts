import { redis } from "./redis";
import type { Conversation } from "./types";

const MAX_CONVS = 50;
const TTL_SECONDS = 90 * 24 * 60 * 60; // 90 days

function indexKey(userId: string) {
  return `convs:${userId}`;
}

function dataKey(id: string) {
  return `conv:${id}`;
}

export async function saveConversation(conv: Conversation): Promise<void> {
  const idx = indexKey(conv.userId);
  const dk = dataKey(conv.id);

  await Promise.all([
    redis.zadd(idx, { score: conv.updatedAt, member: conv.id }),
    redis.set(dk, JSON.stringify(conv), { ex: TTL_SECONDS }),
  ]);

  // Trim to newest MAX_CONVS — ZREMRANGEBYRANK removes lowest scores first
  await redis.zremrangebyrank(idx, 0, -(MAX_CONVS + 1));
}

export async function listConversations(userId: string): Promise<Conversation[]> {
  const idx = indexKey(userId);
  // Newest first (highest score = most recent updatedAt)
  const ids = await redis.zrange(idx, 0, MAX_CONVS - 1, { rev: true });
  if (!ids || ids.length === 0) return [];

  const keys = (ids as string[]).map(dataKey);
  const raw = await redis.mget<string[]>(...keys);

  return (raw as (string | null)[])
    .map((r) => {
      if (!r) return null;
      try {
        return JSON.parse(r) as Conversation;
      } catch {
        return null;
      }
    })
    .filter((c): c is Conversation => c !== null);
}

export async function getConversation(id: string): Promise<Conversation | null> {
  const raw = await redis.get<string>(dataKey(id));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Conversation;
  } catch {
    return null;
  }
}

export async function deleteConversation(userId: string, id: string): Promise<void> {
  await Promise.all([
    redis.zrem(indexKey(userId), id),
    redis.del(dataKey(id)),
  ]);
}
