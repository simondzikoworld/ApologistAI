import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getConversation, deleteConversation } from "@/lib/conversations";

export const runtime = "nodejs";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const conv = await getConversation(id);

  if (!conv) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (conv.userId !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await deleteConversation(userId, id);
  return NextResponse.json({ ok: true });
}
