/**
 * Regression check for the closing Catholic section title.
 *
 * An English answer was coming back headed "Perspektywa katolicka". This runs
 * every language in both modes that use the section and fails if a reply
 * carries any language's title other than its own.
 *
 *   npm run check:heading
 */
import { readFileSync } from "node:fs";

const TITLES: Record<string, string> = {
  EN: "Catholic Perspective",
  PL: "Perspektywa katolicka",
  DE: "Katholische Perspektive",
  ES: "Perspectiva católica",
  FR: "Perspective catholique",
  PT: "Perspetiva católica",
};

const PROMPTS: Record<string, string> = {
  EN: "Did Jesus rise from the dead?",
  PL: "Czy Jezus zmartwychwstał?",
  DE: "Ist Jesus auferstanden?",
  ES: "¿Resucitó Jesús?",
  FR: "Jésus est-il ressuscité ?",
  PT: "Jesus ressuscitou?",
};

function loadEnv(path = ".env.local") {
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
    if (m && !(m[1] in process.env)) {
      process.env[m[1]] = m[2].trim().replace(/^["'](.*)["']$/, "$1");
    }
  }
}

const norm = (s: string) => s.toLowerCase().normalize("NFC");

async function main() {
  loadEnv();
  const { streamText } = await import("@/lib/llm");
  const { buildSystemPrompt, MAX_TOKENS } = await import("@/lib/claude");
  const { isSupported } = await import("@/lib/scripture");

  let failures = 0;

  for (const mode of ["simple", "detailed"] as const) {
    for (const lang of Object.keys(TITLES)) {
      let answer = "";
      for await (const chunk of streamText((p) => ({
        model: p.models[mode],
        max_tokens: MAX_TOKENS[mode],
        ...(p.thinking ? { thinking: p.thinking } : {}),
        system: [{ type: "text" as const, text: buildSystemPrompt(mode, "", lang, isSupported(lang)) }],
        messages: [{ role: "user" as const, content: PROMPTS[lang] }],
      }))) {
        answer += chunk;
      }

      const body = norm(answer);
      const wrong = Object.entries(TITLES)
        .filter(([code, title]) => code !== lang && body.includes(norm(title)))
        .map(([code]) => code);
      const own = body.includes(norm(TITLES[lang]));

      // Another language's title is always wrong. In detailed mode the section
      // is mandatory, so a missing title is a failure too — that also catches
      // garbled hybrids ("Perspektive katolicka"), which match no title at all.
      // Simple mode may legitimately close with a plain sentence.
      const missing = mode === "detailed" && !own;
      const bad = wrong.length > 0 || missing;
      if (bad) failures++;

      console.log(
        `${bad ? "FAIL" : "ok  "} ${mode.padEnd(8)} ${lang}  own=${own ? "yes" : "no "}` +
          (wrong.length ? `  WRONG: ${wrong.join(",")}` : "") +
          (missing ? "  MISSING/GARBLED TITLE" : ""),
      );
    }
  }

  console.log(failures ? `\n${failures} failing.` : "\nAll clean.");
  if (failures) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
