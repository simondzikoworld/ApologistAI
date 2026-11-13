import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { readIsPro } from "@/lib/pro";
import {
  bonusSubject, claimRewardedAd, rewardedAdsToday, REWARDED_ADS_PER_DAY,
} from "@/lib/usage";

export const runtime = "nodejs";

// Rewarded ads in the mobile app: one watched ad = one extra Simple question,
// at most REWARDED_ADS_PER_DAY times a day (see lib/usage.ts for why the claim
// isn't verified with AdMob). Signed-in users are counted per account,
// guests per IP — the same identities the daily limit uses.

async function subjectFor(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  const { userId } = await auth();
  return { userId, subject: bonusSubject(userId, ip) };
}

/** How many rewarded ads are still available today. */
export async function GET(req: NextRequest) {
  const { subject } = await subjectFor(req);
  const used = await rewardedAdsToday(subject);
  return NextResponse.json({ remaining: Math.max(0, REWARDED_ADS_PER_DAY - used) });
}

/** Called by the app after the ad's reward callback fires. */
export async function POST(req: NextRequest) {
  const { userId, subject } = await subjectFor(req);

  // Pro has no daily Simple cap to extend, and never sees ads.
  if (userId) {
    const clerk = await clerkClient();
    const user = await clerk.users.getUser(userId);
    if (readIsPro(user.publicMetadata)) {
      return NextResponse.json({ ok: false, error: "pro" }, { status: 400 });
    }
  }

  const ok = await claimRewardedAd(subject);
  const used = await rewardedAdsToday(subject);
  const remaining = Math.max(0, REWARDED_ADS_PER_DAY - used);
  if (!ok) return NextResponse.json({ ok: false, error: "cap_reached", remaining }, { status: 429 });
  return NextResponse.json({ ok: true, remaining });
}
