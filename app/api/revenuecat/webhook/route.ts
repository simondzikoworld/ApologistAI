import { NextRequest, NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";

export const runtime = "nodejs";

// RevenueCat event types that mean the user currently has (or regains) Pro.
const GRANT = new Set([
  "INITIAL_PURCHASE",
  "RENEWAL",
  "UNCANCELLATION",
  "NON_RENEWING_PURCHASE",
  "PRODUCT_CHANGE",
  "TRANSFER",
]);
// Types that mean access has actually ended. (CANCELLATION only turns off
// auto-renew — the user keeps Pro until EXPIRATION, so we don't revoke on it.)
const REVOKE = new Set(["EXPIRATION"]);

async function setPro(clerkUserId: string, isPro: boolean) {
  const client = await clerkClient();
  await client.users.updateUserMetadata(clerkUserId, {
    publicMetadata: { isPro },
  });
}

export async function POST(req: NextRequest) {
  // RevenueCat sends the exact Authorization header value you set in its
  // dashboard. Reject anything that doesn't match our shared secret.
  const auth = req.headers.get("authorization");
  const secret = process.env.REVENUECAT_WEBHOOK_SECRET;
  if (!secret || auth !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { event?: { type?: string; app_user_id?: string } };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad JSON" }, { status: 400 });
  }

  const type = body.event?.type ?? "";
  const appUserId = body.event?.app_user_id ?? "";

  // The mobile app calls Purchases.logIn(clerkUserId), so app_user_id is the
  // Clerk user id. Ignore anonymous RevenueCat ids ($RCAnonymousID:…).
  if (!appUserId.startsWith("user_")) {
    return NextResponse.json({ ok: true, ignored: "non-clerk-user" });
  }

  try {
    if (GRANT.has(type)) await setPro(appUserId, true);
    else if (REVOKE.has(type)) await setPro(appUserId, false);
    // CANCELLATION / BILLING_ISSUE / TEST etc. → no immediate change
  } catch (e) {
    console.error("[revenuecat] failed to update", appUserId, type, e);
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
