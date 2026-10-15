import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { detailedTrialRetryAt } from "@/lib/usage";

export const runtime = "nodejs";

// Whether the signed-in user's free Detailed answer is available, so the
// mode picker can say so before they try. The chat route is what enforces it.
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ signedIn: false, available: false, retryAt: null });

  const retryAt = await detailedTrialRetryAt(userId);
  return NextResponse.json({ signedIn: true, available: retryAt === null, retryAt });
}
