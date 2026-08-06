// ---------------------------------------------------------------------------
// Quote validation.
//
// The scripture tool guarantees correct text only when the model actually calls
// it. Testing showed 4/4 compliance, but that's a sample, not a proof — so this
// checks after the fact: every long quoted span in an answer should match text
// the tool returned.
//
// Caveat: the app also quotes non-Scripture (Catechism, councils, saints), and
// those legitimately have no tool result behind them. Unmatched spans are
// therefore a review signal, not a verdict. Used at runtime for logging and in
// scripts/check-quotes.ts for regression testing.
// ---------------------------------------------------------------------------

/** Below this length, a quoted span is a phrase, not a verse. */
const MIN_QUOTE_CHARS = 25;

// Straight, curly, guillemet, and low-9 (Polish/German) quotation pairs.
const QUOTE_PATTERNS: RegExp[] = [
  /"([^"]{25,})"/g,
  /“([^”]{25,})”/g,
  /«\s*([^»]{25,})\s*»/g,
  /„([^“”]{25,})[“”]/g,
];

/** Strips typography that models routinely normalise, so comparison is fair. */
export function normalizeQuote(s: string): string {
  return s
    .replace(/[‘’ʼ]/g, "'")    // curly / modifier apostrophes
    .replace(/[“”„]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .replace(/^[\s"'«»]+|[\s"'«»]+$/g, "")
    .replace(/[.,;:!?]+$/, "")
    .toLowerCase()
    .trim();
}

// Matches a citation in any of the app's languages: "John 3:16",
// "1 Corinthiens 15:17", "Jean 3,16", "1 Kor 15,17", "Mt 28,6".
const REFERENCE_RE = /\b\d?\s?[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ.]{1,20}\.?\s+\d{1,3}\s*[:,]\s*\d{1,3}/;

/** How far from a quote we look for a reference before assuming it isn't Scripture. */
const REFERENCE_WINDOW = 90;

interface FoundQuote {
  text: string;
  /** True when a verse reference sits close enough to imply this is Scripture. */
  nearReference: boolean;
}

/** Every quoted span of verse length found in an answer. */
export function extractQuotes(answer: string): FoundQuote[] {
  const found = new Map<string, FoundQuote>();

  for (const re of QUOTE_PATTERNS) {
    for (const m of answer.matchAll(re)) {
      const inner = m[1].trim();
      if (inner.length < MIN_QUOTE_CHARS) continue;

      const at = m.index ?? 0;
      const context =
        answer.slice(Math.max(0, at - REFERENCE_WINDOW), at) +
        answer.slice(at + m[0].length, at + m[0].length + REFERENCE_WINDOW);

      const existing = found.get(inner);
      const nearReference = REFERENCE_RE.test(context) || (existing?.nearReference ?? false);
      found.set(inner, { text: inner, nearReference });
    }
  }

  return [...found.values()];
}

export interface QuoteReport {
  /** Scripture-looking quotes considered (those sitting near a reference). */
  total: number;
  matched: string[];
  unmatched: string[];
  /** Long quotes with no nearby reference — Catechism, saints, rhetoric. */
  ignored: string[];
}

/**
 * Compares quoted spans against the verse texts the tool returned this turn.
 * A quote counts as matched when the verified text contains it (models often
 * quote a clause rather than the whole verse).
 *
 * Only quotes adjacent to a verse reference are judged; the app legitimately
 * quotes non-Scripture, and those have no tool result to match against.
 */
export function checkQuotes(answer: string, verifiedTexts: string[]): QuoteReport {
  const haystack = verifiedTexts.map(normalizeQuote);
  const matched: string[] = [];
  const unmatched: string[] = [];
  const ignored: string[] = [];

  for (const quote of extractQuotes(answer)) {
    if (!quote.nearReference) {
      ignored.push(quote.text);
      continue;
    }
    // An ellipsis is legitimate elision, so match each segment separately
    // rather than requiring one contiguous span.
    const segments = quote.text
      .split(/\s*(?:…|\.\.\.)\s*/)
      .map(normalizeQuote)
      .filter((s) => s.length >= 8);
    if (!segments.length) {
      ignored.push(quote.text);
      continue;
    }

    const ok = haystack.some(
      (h) =>
        segments.every((s) => h.includes(s)) ||
        (segments.length === 1 && segments[0].includes(h)),
    );
    (ok ? matched : unmatched).push(quote.text);
  }

  return { total: matched.length + unmatched.length, matched, unmatched, ignored };
}
