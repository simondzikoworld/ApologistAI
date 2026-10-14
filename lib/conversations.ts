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

// The Upstash client deserializes JSON on read, so stored conversations come
// back as objects, not strings. Calling JSON.parse on them threw, and every
// conversation was silently dropped — history was always empty.
function decode(raw: unknown): Conversation | null {
  if (!raw) return null;
  if (typeof raw === "object") return raw as Conversation;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as Conversation;
    } catch {
      return null;
    }
  }
  return null;
}

export async function listConversations(userId: string): Promise<Conversation[]> {
  const idx = indexKey(userId);
  // Newest first (highest score = most recent updatedAt)
  const ids = (await redis.zrange(idx, 0, MAX_CONVS - 1, { rev: true })) as string[];
  if (!ids || ids.length === 0) return [];

  const raw = await redis.mget<unknown[]>(...ids.map(dataKey));
  const convs = raw.map(decode);

  // Index entries whose data has expired (90-day TTL) point at nothing; drop
  // them so they don't keep costing a lookup on every list.
  const dangling = ids.filter((_, i) => convs[i] === null);
  if (dangling.length) {
    try {
      await redis.zrem(idx, ...dangling);
    } catch (err) {
      console.warn("Conversation index cleanup failed:", err);
    }
  }

  return convs.filter((c): c is Conversation => c !== null);
}

/** List without message bodies — what the mobile history screens need. */
export type ConversationSummary = Omit<Conversation, "messages"> & { messageCount: number };

export async function listConversationSummaries(userId: string): Promise<ConversationSummary[]> {
  const convs = await listConversations(userId);
  return convs.map(({ messages, ...rest }) => ({ ...rest, messageCount: messages?.length ?? 0 }));
}

export async function getConversation(id: string): Promise<Conversation | null> {
  return decode(await redis.get(dataKey(id)));
}

export async function deleteConversation(userId: string, id: string): Promise<void> {
  await Promise.all([
    redis.zrem(indexKey(userId), id),
    redis.del(dataKey(id)),
  ]);
}
