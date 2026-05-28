import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { listConversations, saveConversation } from "@/lib/conversations";
import type { Conversation } from "@/lib/types";

export const runtime = "nodejs";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const conversations = await listConversations(userId);
  return NextResponse.json(conversations);
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as Partial<Conversation>;

  if (!body.id || !body.messages || !body.mode || !body.lang) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const now = Date.now();
  const conv: Conversation = {
    id: body.id,
    userId,
    title: (body.title ?? "").trim().slice(0, 80) || "New conversation",
    createdAt: body.createdAt ?? now,
    updatedAt: now,
    mode: body.mode,
    lang: body.lang,
    messages: body.messages.slice(-40),
  };

  await saveConversation(conv);
  return NextResponse.json({ ok: true });
}
