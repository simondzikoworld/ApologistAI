import { clerkClient } from "@clerk/nextjs/server";
import { redis } from "./redis";
import { stripe } from "./stripe";

// Full account deletion, as promised in the Privacy Policy and required by
// Google Play: subscriptions billed by us stop, stored data goes, the login
// goes. Order matters — billing is stopped first, so a failure part-way never
// leaves someone deleted-but-still-charged; the Clerk user is removed last,
// so a failed run can simply be retried while still signed in.

/** Cancels website (Stripe) subscriptions and deletes the Stripe customer. */
async function stopStripeBilling(userId: string): Promise<void> {
  const { data: customers } = await stripe.customers.search({
    query: `metadata['clerkUserId']:'${userId}'`,
  });
  for (const customer of customers) {
    // Deleting a customer cancels its active subscriptions immediately.
    // Stripe keeps its own invoice records, which tax law requires.
    await stripe.customers.del(customer.id);
  }
}

/** Saved conversations, usage counters and the Detailed-trial marker. */
async function deleteStoredData(userId: string): Promise<void> {
  const index = `convs:${userId}`;
  const ids = (await redis.zrange(index, 0, -1)) as string[];
  const keys = [index, `trial:detailed:${userId}`, ...ids.map((id) => `conv:${id}`)];

  let cursor = "0";
  do {
    const [next, found] = await redis.scan(cursor, { match: `usage:${userId}:*`, count: 200 });
    cursor = String(next);
    keys.push(...found);
  } while (cursor !== "0");

  // DEL takes many keys at once; chunk to keep requests small.
  for (let i = 0; i < keys.length; i += 100) {
    await redis.del(...keys.slice(i, i + 100));
  }
}

/**
 * Removes the RevenueCat customer record (purchase history tied to this user).
 * Optional: only runs when REVENUECAT_SECRET_API_KEY is configured. It does NOT
 * cancel a Google Play subscription — only the user (or Google) can do that.
 */
async function deleteRevenueCatCustomer(userId: string): Promise<void> {
  const key = process.env.REVENUECAT_SECRET_API_KEY;
  if (!key) return;
  const res = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${key}` },
  });
  if (!res.ok && res.status !== 404) {
    console.warn(`[account] RevenueCat delete failed for ${userId}: ${res.status}`);
  }
}

export async function deleteAccount(userId: string): Promise<void> {
  await stopStripeBilling(userId);
  await deleteStoredData(userId);
  await deleteRevenueCatCustomer(userId).catch((e) => console.warn("[account] RevenueCat:", e));
  const clerk = await clerkClient();
  await clerk.users.deleteUser(userId);
}
