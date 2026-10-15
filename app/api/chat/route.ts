import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { buildSystemPrompt, MAX_TOKENS } from "@/lib/claude";
import { streamText } from "@/lib/llm";
import { isSupported, lookupVerse, LOOKUP_TOOL } from "@/lib/scripture";
import { checkQuotes } from "@/lib/quoteCheck";
import { readIsPro } from "@/lib/pro";
import { fetchAndParseSources } from "@/lib/sources";
import {
  incrementUsage, getLimit, userUsageKey, ipUsageKey, type Tier,
  claimDetailedTrial, refundDetailedTrial, detailedTrialRetryAt,
} from "@/lib/usage";
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
    isPro = readIsPro(clerkUser.publicMetadata);
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

  // Gate Detailed mode — Pro, or a free account's periodic trial answer.
  // Refusals keep the `pro_required` code older clients (the mobile app)
  // already handle; `retryAt` / `signupForTrial` are extras for the web.
  let usingTrial = false;
  if (mode === "detailed" && !isPro) {
    if (!userId) {
      return NextResponse.json({ error: "pro_required", signupForTrial: true }, { status: 403 });
    }
    if (!(await claimDetailedTrial(userId))) {
      const retryAt = await detailedTrialRetryAt(userId);
      return NextResponse.json({ error: "pro_required", retryAt }, { status: 403 });
    }
    usingTrial = true;
  }

  // Daily limit check via Redis (the trial answer is its own allowance)
  const limit = getLimit(tier, mode);
  if (limit !== Infinity && !usingTrial) {
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
    const systemPrompt = buildSystemPrompt(mode, sourcesText, lang, isSupported(lang));

    const encoder = new TextEncoder();

    // Provider chosen by LLM_PROVIDER (DeepSeek by default, Claude as fallback).
    // cache_control is a no-op on DeepSeek — it caches identical prefixes
    // automatically — but is kept for the Claude path.
    // Verbatim quoting is only offered for languages with a public-domain text
    // (see lib/scripture.ts). Elsewhere the model cites without quoting.
    const canQuote = isSupported(lang);
    // Verse texts the tool returned this turn, used to validate quotes below.
    const verifiedTexts: string[] = [];

    const generator = streamText(
      (provider) => ({
        model: provider.models[mode],
        max_tokens: MAX_TOKENS[mode],
        ...(provider.thinking ? { thinking: provider.thinking } : {}),
        system: [{ type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } }],
        messages: trimmedMessages.map((m) => ({ role: m.role, content: m.content })),
      }),
      canQuote
        ? {
            tools: [LOOKUP_TOOL],
            runTool: async (name, input) => {
              if (name !== LOOKUP_TOOL.name) return "unknown_tool";
              const ref = (input as { reference?: string })?.reference ?? "";
              const found = await lookupVerse(lang, ref);
              if (!found) {
                return `not_found: no text available for "${ref}". Cite the reference without quoting it.`;
              }
              verifiedTexts.push(found.text);
              return `${found.reference} (${found.translation}): ${found.text}`;
            },
          }
        : {},
    );

    // Pull the first chunk before returning a Response so that a total failure
    // (all retries + fallback exhausted) surfaces as a 500 the client can show,
    // rather than an empty 200 stream.
    const first = await generator.next();

    const readable = new ReadableStream({
      async start(controller) {
        let answer = "";
        try {
          if (!first.done) {
            answer += first.value;
            controller.enqueue(encoder.encode(first.value));
          }
          for await (const text of generator) {
            answer += text;
            controller.enqueue(encoder.encode(text));
          }
          controller.close();
        } catch (err) {
          console.error("Chat stream error:", err);
          controller.close();
        }

        // Post-hoc only: the answer is already streamed, so this never adds
        // latency. Unmatched spans may be legitimate non-Scripture quotes
        // (Catechism, saints) — treat as a review signal, not a failure.
        if (canQuote) {
          const report = checkQuotes(answer, verifiedTexts);
          if (report.unmatched.length) {
            console.warn(
              `[quotes] ${report.unmatched.length}/${report.total} unverified (${lang}/${mode}):`,
              report.unmatched.map((q) => q.slice(0, 80)),
            );
          }
        }
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
    // Nothing was answered, so don't spend the user's trial on it.
    if (usingTrial && userId) await refundDetailedTrial(userId).catch(() => {});
    return NextResponse.json({ error: "Internal server error", detail: msg }, { status: 500 });
  }
}
