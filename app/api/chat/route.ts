import { NextRequest, NextResponse } from "next/server";
import { anthropic, buildSystemPrompt, MAX_TOKENS } from "@/lib/claude";
import { fetchAndParseSources } from "@/lib/sources";
import type { ChatRequest } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body: ChatRequest = await req.json();
    const { messages, sources, mode = "simple", lang = "EN" } = body;

    if (!messages?.length) {
      return NextResponse.json({ error: "No messages provided" }, { status: 400 });
    }

    const lastUserMessage = messages.filter((m) => m.role === "user").at(-1)?.content ?? "";
    const sourcesText = await fetchAndParseSources(sources ?? [], lastUserMessage);
    const systemPrompt = buildSystemPrompt(mode, sourcesText, lang);

    const stream = await anthropic.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: MAX_TOKENS[mode],
      system: systemPrompt,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          if (
            chunk.type === "content_block_delta" &&
            chunk.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(chunk.delta.text));
          }
        }
        controller.close();
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    console.error("Chat API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
