import Anthropic from "@anthropic-ai/sdk";
import type { ResponseMode } from "./types";

// ---------------------------------------------------------------------------
// Provider abstraction — swap LLMs without touching call sites.
//
// DeepSeek exposes an Anthropic-compatible endpoint, so the SDK and the message
// format are identical across providers. Only the base URL, key, model ID and
// pricing differ.
// ---------------------------------------------------------------------------

export type ProviderName = "deepseek" | "anthropic";

/** USD per 1M tokens. */
export interface Pricing {
  input: number;
  output: number;
  /** Rate for input tokens served from the provider's prompt cache. */
  cachedInput: number;
}

export interface Provider {
  name: ProviderName;
  client: Anthropic;
  models: Record<ResponseMode, string>;
  pricing: Record<ResponseMode, Pricing>;
  /**
   * Sent on every request. Undefined means "don't send the field at all" —
   * which is what we want for Anthropic, whose current behaviour we're matching.
   */
  thinking?: Anthropic.ThinkingConfigParam;
}

const DEEPSEEK_BASE_URL = "https://api.deepseek.com/anthropic";

// DeepSeek turns thinking ON by default and bills thinking tokens as output —
// and they count against max_tokens. Simple mode only has 500 to spend, so an
// unguarded thinking pass can truncate the answer. Default it off; set
// LLM_THINKING=on to A/B the quality difference.
function thinkingConfig(): Anthropic.ThinkingConfigParam {
  return process.env.LLM_THINKING === "on"
    // budget_tokens is ignored by DeepSeek but the SDK's type requires it.
    ? { type: "enabled", budget_tokens: 1024 }
    : { type: "disabled" };
}

function deepseekProvider(): Provider {
  const model = process.env.LLM_MODEL ?? "deepseek-v4-flash";
  const price: Pricing = { input: 0.14, output: 0.28, cachedInput: 0.0028 };

  return {
    name: "deepseek",
    client: new Anthropic({
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: process.env.LLM_BASE_URL ?? DEEPSEEK_BASE_URL,
    }),
    // One model for every mode — Flash is cheap enough that there's no reason
    // to split the way Haiku/Sonnet did on Claude.
    models: { simple: model, detailed: model, challenge: model },
    pricing: { simple: price, detailed: price, challenge: price },
    thinking: thinkingConfig(),
  };
}

// Kept intact as the fallback path — flip with LLM_PROVIDER=anthropic.
function anthropicProvider(): Provider {
  const HAIKU: Pricing = { input: 1, output: 5, cachedInput: 0.1 };
  const SONNET: Pricing = { input: 3, output: 15, cachedInput: 0.3 };

  return {
    name: "anthropic",
    client: new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
      defaultHeaders: { "anthropic-beta": "prompt-caching-2024-07-31" },
    }),
    models: {
      simple: "claude-haiku-4-5-20251001",
      detailed: "claude-sonnet-4-6",
      challenge: "claude-haiku-4-5-20251001",
    },
    pricing: { simple: HAIKU, detailed: SONNET, challenge: HAIKU },
    // Omitted deliberately: matches the pre-migration request shape exactly.
    thinking: undefined,
  };
}

export function getProvider(name?: ProviderName): Provider {
  const resolved = name ?? (process.env.LLM_PROVIDER as ProviderName) ?? "deepseek";
  return resolved === "anthropic" ? anthropicProvider() : deepseekProvider();
}

/** Cost in USD for one call, given a provider's rates for that mode. */
export function estimateCost(
  price: Pricing,
  usage: { input: number; output: number; cachedInput?: number },
): number {
  const fresh = usage.input / 1_000_000 * price.input;
  const cached = (usage.cachedInput ?? 0) / 1_000_000 * price.cachedInput;
  const out = usage.output / 1_000_000 * price.output;
  return fresh + cached + out;
}
