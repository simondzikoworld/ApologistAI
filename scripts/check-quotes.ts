/**
 * Regression check for scripture quoting.
 *
 * Runs prompts that explicitly ask for a verse and reports, per answer:
 *   - whether the lookup tool was called
 *   - whether every quoted span traces back to real verse text
 *
 * Run after changing the model, the provider, or the quotation prompt:
 *   npm run check:quotes
 *
 * Exits non-zero if any answer quotes text the tool never returned, so it can
 * gate a deploy.
 */
import { readFileSync } from "node:fs";

interface Case {
  lang: string;
  prompt: string;
}

const CASES: Case[] = [
  { lang: "EN", prompt: "Quote 1 Corinthians 15:17 and explain it briefly." },
  { lang: "EN", prompt: "Quote John 3:16." },
  { lang: "EN", prompt: "Why do Christians believe in the resurrection? Quote a verse." },
  { lang: "EN", prompt: "What does the Bible say about grace? Quote a verse." },
  { lang: "FR", prompt: "Cite 1 Corinthiens 15:17 et explique-le brievement." },
  { lang: "FR", prompt: "Cite un verset sur l'amour de Dieu." },
  { lang: "FR", prompt: "Que dit la Bible sur le pardon ? Cite un verset." },
];

function loadEnv(path = ".env.local") {
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
    if (m && !(m[1] in process.env)) {
      process.env[m[1]] = m[2].trim().replace(/^["'](.*)["']$/, "$1");
    }
  }
}

async function main() {
  loadEnv();
  const { streamText } = await import("@/lib/llm");
  const { buildSystemPrompt, MAX_TOKENS } = await import("@/lib/claude");
  const { isSupported, lookupVerse, LOOKUP_TOOL } = await import("@/lib/scripture");
  const { checkQuotes } = await import("@/lib/quoteCheck");

  let failures = 0;

  for (const [i, c] of CASES.entries()) {
    const canQuote = isSupported(c.lang);
    const verified: string[] = [];
    const calls: string[] = [];
    let answer = "";

    for await (const chunk of streamText(
      (p) => ({
        model: p.models.simple,
        max_tokens: MAX_TOKENS.simple,
        ...(p.thinking ? { thinking: p.thinking } : {}),
        system: [{ type: "text" as const, text: buildSystemPrompt("simple", "", c.lang, canQuote) }],
        messages: [{ role: "user" as const, content: c.prompt }],
      }),
      canQuote
        ? {
            tools: [LOOKUP_TOOL],
            runTool: async (_name, input) => {
              const ref = (input as { reference?: string })?.reference ?? "";
              calls.push(ref);
              const found = await lookupVerse(c.lang, ref);
              if (!found) return `not_found: "${ref}"`;
              verified.push(found.text);
              return `${found.reference} (${found.translation}): ${found.text}`;
            },
          }
        : {},
    )) {
      answer += chunk;
    }

    const report = checkQuotes(answer, verified);
    const bad = report.unmatched.length > 0;
    if (bad) failures++;

    console.log(
      `${bad ? "FAIL" : "ok  "} [${i + 1}/${CASES.length}] ${c.lang}  ` +
        `tool=${calls.length ? calls.join(",") : "none"}  ` +
        `quotes=${report.matched.length}/${report.total}`,
    );
    for (const q of report.unmatched) {
      console.log(`       unverified: ${q.slice(0, 100)}`);
    }
  }

  console.log(`\n${CASES.length - failures}/${CASES.length} answers clean.`);
  if (failures) {
    console.log("Unverified quotes may be non-Scripture (Catechism, saints) — review before treating as a regression.");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
