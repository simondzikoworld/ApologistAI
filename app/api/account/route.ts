import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { deleteAccount } from "@/lib/accountDeletion";

export const runtime = "nodejs";

// Permanently deletes the signed-in user's account and data. Used by the
// mobile app (Bearer token) and by /delete-account on the website (cookie).
export async function DELETE() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await deleteAccount(userId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[account] deletion failed for", userId, err);
    return NextResponse.json({ error: "deletion_failed" }, { status: 500 });
  }
}
