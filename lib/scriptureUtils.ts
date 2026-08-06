import { BOOKS_BY_LANG } from "@/data/bibleBooks";

// ---------------------------------------------------------------------------
// Detection of Bible references in an answer, so they can be rendered as
// clickable pills.
//
// This is language-aware: a Polish answer cites "Łk 24,6" and a French one
// "Jean 3:16", neither of which matches English book names or a ":" separator.
// Before this, pills only ever appeared in English answers.
// ---------------------------------------------------------------------------

function escape(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Book variants for a language, longest first so "Song of Solomon" beats "Song". */
function variantsFor(lang: string): string[] {
  const books = BOOKS_BY_LANG[lang] ?? BOOKS_BY_LANG.EN;
  // Always allow English too — models mix in English book names.
  const all = [...books.flat(), ...BOOKS_BY_LANG.EN.flat()];
  return [...new Set(all)].sort((a, b) => b.length - a.length);
}

const reCache = new Map<string, RegExp>();

/**
 * Matches "John 3:16", "1 Cor 15:3-5", "Łk 24,6", "Röm 8,28".
 * Chapter/verse may be separated by ":" or "," (continental style).
 *
 * Group 1 is the character before the reference, group 2 the reference itself.
 * `\b` can't open this pattern: it is ASCII-only, so it never fires before a
 * non-ASCII initial like "Ł" and Polish references went undetected. Matching an
 * explicit boundary character avoids lookbehind, which older Safari rejects at
 * parse time — that would throw as this module loads and blank the page.
 */
export function scriptureRegex(lang = "EN"): RegExp {
  const cached = reCache.get(lang);
  if (cached) return cached;

  const books = variantsFor(lang).map(escape).join("|");
  const ref = `(?:${books})\\.?\\s*\\d{1,3}\\s*[:,]\\s*\\d{1,3}(?:\\s*[–-]\\s*\\d{1,3})?`;
  const re = new RegExp(`(^|[^\\p{L}\\p{N}])(${ref})(?![\\p{L}\\p{N}])`, "gu");

  reCache.set(lang, re);
  return re;
}

/** Kept for callers that don't know the language. */
export const SCRIPTURE_RE = scriptureRegex("EN");

/**
 * Preprocess markdown so Bible references get wrapped in a special backtick
 * syntax: `BIB:John 3:16`. The ReactMarkdown `code` renderer then detects the
 * BIB: prefix and renders a ScripturePill instead of a <code> block.
 */
export function wrapScriptureRefs(text: string, lang = "EN"): string {
  // The leading boundary character is part of the match, so put it back.
  return text.replace(scriptureRegex(lang), (_m, before: string, ref: string) => `${before}\`BIB:${ref}\``);
}

/** Strip the BIB: prefix to get the plain reference string */
export function parseBibCode(code: string): string | null {
  if (code.startsWith("BIB:")) return code.slice(4);
  return null;
}
