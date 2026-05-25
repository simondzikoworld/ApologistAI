import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { anthropic, buildSystemPrompt, MAX_TOKENS, MODEL_FOR_MODE } from "@/lib/claude";
import { gemini, GEMINI_MODEL } from "@/lib/gemini";
import { fetchAndParseSources } from "@/lib/sources";
import { incrementUsage, getLimit, userUsageKey, ipUsageKey, type Tier } from "@/lib/usage";
import type { ChatRequest, ResponseMode } from "@/lib/types";

export const runtime = "nodejs";

// Per-minute burst protection — in-memory is fine for this
const rateLimiter = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 15;
const RATE_WINDOW_MS = 60_000;

// Source limit by mode
const SOURCE_LIMIT: Record<ResponseMode, number> = {
  simple: 3,
  challenge: 0,
  detailed: 6,
};

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  const now = Date.now();

  // Per-minute rate limit
  const rateEntry = rateLimiter.get(ip) ?? { count: 0, resetAt: now + RATE_WINDOW_MS };
  if (now > rateEntry.resetAt) { rateEntry.count = 0; rateEntry.resetAt = now + RATE_WINDOW_MS; }
  rateEntry.count++;
  rateLimiter.set(ip, rateEntry);
  if (rateEntry.count > RATE_LIMIT) {
    return NextResponse.json({ error: "Too many requests. Please wait a moment." }, { status: 429 });
  }

  // Auth — anonymous users still work, just at lower limits
  // Read isPro from Clerk backend (not JWT sessionClaims) so it's always fresh
  const { userId } = await auth();
  let isPro = false;
  let tier: Tier = "anon";
  if (userId) {
    const clerk = await clerkClient();
    const clerkUser = await clerk.users.getUser(userId);
    isPro = (clerkUser.publicMetadata as { isPro?: boolean })?.isPro === true;
    tier = isPro ? "pro" : "free";
  }

  // Parse body
  let body: ChatRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { messages, sources, mode = "simple", lang = "EN" } = body;

  if (!messages?.length) {
    return NextResponse.json({ error: "No messages provided" }, { status: 400 });
  }

  // Gate Detailed mode — Pro only
  if (mode === "detailed" && !isPro) {
    return NextResponse.json({ error: "pro_required" }, { status: 403 });
  }

  // Daily limit check via Redis
  const limit = getLimit(tier, mode);
  if (limit !== Infinity) {
    const key = userId ? userUsageKey(userId, mode) : ipUsageKey(ip);
    const newCount = await incrementUsage(key);
    if (newCount > limit) {
      return NextResponse.json({ error: "daily_limit" }, { status: 429 });
    }
  }

  try {
    const trimmedMessages = messages.slice(-10);
    const lastUserMessage = trimmedMessages.filter((m) => m.role === "user").at(-1)?.content ?? "";
    const sourceLimit = SOURCE_LIMIT[mode];
    const sourcesText = await fetchAndParseSources(sources ?? [], lastUserMessage, sourceLimit);
    const systemPrompt = buildSystemPrompt(mode, sourcesText, lang);

    const encoder = new TextEncoder();

    // Simple + Challenge → Gemini Flash (free tier) if key is set, else Claude Haiku
    if (mode === "simple" || mode === "challenge") {
      if (process.env.GEMINI_API_KEY?.trim()) {
        const model = gemini.getGenerativeModel({ model: GEMINI_MODEL });
        const history = trimmedMessages.slice(0, -1).map((m) => ({
          role: m.role === "user" ? "user" as const : "model" as const,
          parts: [{ text: m.content }],
        }));
        const chat = model.startChat({ history, systemInstruction: systemPrompt });
        const lastMsg = trimmedMessages[trimmedMessages.length - 1].content;
        const result = await chat.sendMessageStream(lastMsg);

        const readable = new ReadableStream({
          async start(controller) {
            for await (const chunk of result.stream) {
              const text = chunk.text();
              if (text) controller.enqueue(encoder.encode(text));
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
      }
      // Fall through to Claude below if no Gemini key
    }

    // Detailed → Claude Sonnet
    const stream = anthropic.messages.stream({
      model: MODEL_FOR_MODE[mode],
      max_tokens: MAX_TOKENS[mode],
      system: [{ type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } }],
      messages: trimmedMessages.map((m) => ({ role: m.role, content: m.content })),
    });

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
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Chat API error:", msg);
    return NextResponse.json({ error: "Internal server error", detail: msg }, { status: 500 });
  }
}
