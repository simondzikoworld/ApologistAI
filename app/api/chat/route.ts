import { NextRequest, NextResponse } from "next/server";
import { anthropic, buildSystemPrompt, MAX_TOKENS, MODEL_FOR_MODE } from "@/lib/claude";
import { fetchAndParseSources } from "@/lib/sources";
import type { ChatRequest } from "@/lib/types";

export const runtime = "nodejs";

// Per-IP rate limiter: 15 requests per minute
const rateLimiter = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 15;
const RATE_WINDOW_MS = 60_000;

export async function POST(req: NextRequest) {
  // Rate limiting
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  const now = Date.now();
  const entry = rateLimiter.get(ip) ?? { count: 0, resetAt: now + RATE_WINDOW_MS };
  if (now > entry.resetAt) { entry.count = 0; entry.resetAt = now + RATE_WINDOW_MS; }
  entry.count++;
  rateLimiter.set(ip, entry);
  if (entry.count > RATE_LIMIT) {
    return NextResponse.json({ error: "Too many requests. Please wait a moment." }, { status: 429 });
  }

  try {
    const body: ChatRequest = await req.json();
    const { messages, sources, mode = "simple", lang = "EN" } = body;

    if (!messages?.length) {
      return NextResponse.json({ error: "No messages provided" }, { status: 400 });
    }

    // Cap conversation history to last 10 messages to limit input tokens
    const trimmedMessages = messages.slice(-10);

    const lastUserMessage = trimmedMessages.filter((m) => m.role === "user").at(-1)?.content ?? "";
    const sourcesText = await fetchAndParseSources(sources ?? [], lastUserMessage);
    const systemPrompt = buildSystemPrompt(mode, sourcesText, lang);

    const stream = anthropic.messages.stream({
      model: MODEL_FOR_MODE[mode],
      max_tokens: MAX_TOKENS[mode],
      system: [{ type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } }],
      messages: trimmedMessages.map((m) => ({ role: m.role, content: m.content })),
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
