/**
 * Side-by-side comparison of the current Claude setup vs DeepSeek V4 Flash,
 * running the FULL pipeline (source fetching + prompt building + generation)
 * so the answers reflect what the app actually produces.
 *
 *   npm run compare                          # uses scripts/questions.txt
 *   npm run compare -- my-questions.txt out.md
 *
 * Note: uses non-streaming messages.create so token usage is reported directly.
 * The generation itself is identical to the streamed path in app/api/chat.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { buildSystemPrompt, MAX_TOKENS } from "@/lib/claude";
import { getProvider, estimateCost, type Provider, type ProviderName } from "@/lib/llm";
import { fetchAndParseSources } from "@/lib/sources";
import { DEFAULT_SOURCES } from "@/data/defaultSources";
import type { ResponseMode } from "@/lib/types";

// Standalone scripts don't get Next's automatic .env.local loading.
function loadEnv(path = ".env.local") {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
    if (!match) continue;
    const value = match[2].trim().replace(/^["'](.*)["']$/, "$1");
    if (!(match[1] in process.env)) process.env[match[1]] = value;
  }
}

// Mirrors SOURCE_LIMIT in app/api/chat/route.ts — keep in sync.
const SOURCE_LIMIT: Record<ResponseMode, number> = { simple: 3, challenge: 0, detailed: 6 };

interface Question {
  text: string;
  mode: ResponseMode;
  lang: string;
}

function parseQuestions(path: string): Question[] {
  return readFileSync(path, "utf8")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"))
    .map((line) => {
      const [text, ...opts] = line.split("||").map((p) => p.trim());
      const q: Question = { text, mode: "simple", lang: "EN" };
      for (const opt of opts) {
        const [k, v] = opt.split("=").map((p) => p.trim());
        if (k === "mode") q.mode = v as ResponseMode;
        if (k === "lang") q.lang = v;
      }
      return q;
    });
}

interface Result {
  answer: string;
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  cost: number;
  model: string;
  ms: number;
  error?: string;
}

async function run(provider: Provider, q: Question, systemPrompt: string): Promise<Result> {
  const model = provider.models[q.mode];
  const started = Date.now();
  const empty = {
    answer: "", inputTokens: 0, cachedInputTokens: 0, outputTokens: 0,
    cost: 0, model, ms: 0,
  };

  try {
    const msg = await provider.client.messages.create({
      model,
      max_tokens: MAX_TOKENS[q.mode],
      ...(provider.thinking ? { thinking: provider.thinking } : {}),
      system: [{ type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: q.text }],
    });

    const answer = msg.content
      .filter((b): b is { type: "text"; text: string; citations: never } => b.type === "text")
      .map((b) => b.text)
      .join("");

    const cachedInputTokens = msg.usage.cache_read_input_tokens ?? 0;
    // Anthropic reports fresh vs cached separately; treat input_tokens as fresh.
    const inputTokens = msg.usage.input_tokens + (msg.usage.cache_creation_input_tokens ?? 0);
    const outputTokens = msg.usage.output_tokens;

    return {
      answer,
      inputTokens,
      cachedInputTokens,
      outputTokens,
      cost: estimateCost(provider.pricing[q.mode], {
        input: inputTokens, output: outputTokens, cachedInput: cachedInputTokens,
      }),
      model,
      ms: Date.now() - started,
    };
  } catch (err) {
    return { ...empty, ms: Date.now() - started, error: err instanceof Error ? err.message : String(err) };
  }
}

function usd(n: number): string {
  return `$${n.toFixed(6)}`;
}

async function main() {
  loadEnv();

  const questionsPath = resolve(process.argv[2] ?? "scripts/questions.txt");
  const outPath = resolve(process.argv[3] ?? "scripts/model-comparison.md");
  const questions = parseQuestions(questionsPath);

  const providers: ProviderName[] = ["anthropic", "deepseek"];
  const totals: Record<string, number> = { anthropic: 0, deepseek: 0 };
  const out: string[] = [
    "# Model comparison — Claude vs DeepSeek V4 Flash",
    "",
    `Questions: \`${questionsPath}\` (${questions.length})`,
    "",
  ];

  for (const [i, q] of questions.entries()) {
    console.log(`[${i + 1}/${questions.length}] ${q.mode}/${q.lang} — ${q.text.slice(0, 60)}`);

    // Fetch sources ONCE per question so both providers see identical context.
    const sourcesText = await fetchAndParseSources(DEFAULT_SOURCES, q.text, SOURCE_LIMIT[q.mode]);
    const systemPrompt = buildSystemPrompt(q.mode, sourcesText, q.lang);

    const results: Record<string, Result> = {};
    for (const name of providers) {
      const provider = getProvider(name);
      results[name] = await run(provider, q, systemPrompt);
      totals[name] += results[name].cost;
    }

    out.push(
      `## ${i + 1}. ${q.text}`,
      "",
      `\`mode=${q.mode}\` · \`lang=${q.lang}\` · system prompt ${systemPrompt.length} chars`,
      "",
      "| | Claude | DeepSeek |",
      "|---|---|---|",
      `| Model | ${results.anthropic.model} | ${results.deepseek.model} |`,
      `| Input tokens | ${results.anthropic.inputTokens} | ${results.deepseek.inputTokens} |`,
      `| Cached input | ${results.anthropic.cachedInputTokens} | ${results.deepseek.cachedInputTokens} |`,
      `| Output tokens | ${results.anthropic.outputTokens} | ${results.deepseek.outputTokens} |`,
      `| Latency | ${results.anthropic.ms} ms | ${results.deepseek.ms} ms |`,
      `| **Cost** | **${usd(results.anthropic.cost)}** | **${usd(results.deepseek.cost)}** |`,
      "",
    );

    for (const name of providers) {
      const r = results[name];
      out.push(`### ${name === "anthropic" ? "Claude" : "DeepSeek"}`, "");
      out.push(r.error ? `> **ERROR:** ${r.error}` : r.answer || "> _(empty response)_", "");
    }
  }

  const saving = totals.anthropic > 0
    ? ((1 - totals.deepseek / totals.anthropic) * 100).toFixed(1)
    : "n/a";

  out.push(
    "---",
    "",
    "## Totals",
    "",
    "| Provider | Total cost |",
    "|---|---|",
    `| Claude | ${usd(totals.anthropic)} |`,
    `| DeepSeek | ${usd(totals.deepseek)} |`,
    "",
    `DeepSeek is **${saving}%** cheaper across this run.`,
    "",
  );

  writeFileSync(outPath, out.join("\n"), "utf8");

  console.log(`\nClaude:   ${usd(totals.anthropic)}`);
  console.log(`DeepSeek: ${usd(totals.deepseek)}`);
  console.log(`Saving:   ${saving}%`);
  console.log(`\nWrote ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
