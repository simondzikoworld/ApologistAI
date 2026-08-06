// ---------------------------------------------------------------------------
// Verbatim scripture lookup.
//
// A model cannot verify that a verse it recalls is word-for-word correct — it
// can only be confident. The only way to guarantee an exact quotation is to
// hand it the real text, which is what this module does.
//
// Source: getbible.net (v2), which serves public-domain translations with no
// key and no rate limit. Only languages with a public-domain edition of the
// translation the prompt names are supported; the rest need a commercial
// licence (see SUPPORTED below).
// ---------------------------------------------------------------------------

import { BOOKS_BY_LANG } from "@/data/bibleBooks";

const API_BASE = "https://api.getbible.net/v2";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // chapters are immutable; cache hard

interface Translation {
  /** getbible translation id */
  id: string;
  /** Human name used in the citation shown to the user */
  name: string;
}

/**
 * Languages we can quote verbatim. The prompt's named translation for EN (KJV)
 * and FR (Louis Segond 1910) are both public domain, so they're covered.
 *
 * PL (Biblia Tysiąclecia 5), DE (Lutherbibel 2017), ES (Reina-Valera 1960) and
 * PT (Almeida ARC) are still in copyright. Adding them means licensing a
 * commercial API — drop the translation in here once that's in place and the
 * tool turns on for that language automatically.
 */
export const SUPPORTED: Record<string, Translation> = {
  EN: { id: "kjv", name: "KJV" },
  FR: { id: "ls1910", name: "Louis Segond 1910" },
};

export function isSupported(lang: string): boolean {
  return lang in SUPPORTED;
}

// Canonical book order — index + 1 is getbible's book number.
const BOOKS = [
  "Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy", "Joshua",
  "Judges", "Ruth", "1 Samuel", "2 Samuel", "1 Kings", "2 Kings",
  "1 Chronicles", "2 Chronicles", "Ezra", "Nehemiah", "Esther", "Job",
  "Psalms", "Proverbs", "Ecclesiastes", "Song of Solomon", "Isaiah",
  "Jeremiah", "Lamentations", "Ezekiel", "Daniel", "Hosea", "Joel", "Amos",
  "Obadiah", "Jonah", "Micah", "Nahum", "Habakkuk", "Zephaniah", "Haggai",
  "Zechariah", "Malachi", "Matthew", "Mark", "Luke", "John", "Acts", "Romans",
  "1 Corinthians", "2 Corinthians", "Galatians", "Ephesians", "Philippians",
  "Colossians", "1 Thessalonians", "2 Thessalonians", "1 Timothy", "2 Timothy",
  "Titus", "Philemon", "Hebrews", "James", "1 Peter", "2 Peter", "1 John",
  "2 John", "3 John", "Jude", "Revelation",
];

// Common abbreviations and alternate spellings → canonical name.
const ALIASES: Record<string, string> = {
  gen: "Genesis", ex: "Exodus", exod: "Exodus", lev: "Leviticus",
  num: "Numbers", deut: "Deuteronomy", dt: "Deuteronomy", josh: "Joshua",
  judg: "Judges", "1sam": "1 Samuel", "2sam": "2 Samuel", "1kgs": "1 Kings",
  "2kgs": "2 Kings", "1chr": "1 Chronicles", "2chr": "2 Chronicles",
  neh: "Nehemiah", esth: "Esther", ps: "Psalms", psalm: "Psalms",
  prov: "Proverbs", eccl: "Ecclesiastes", song: "Song of Solomon",
  isa: "Isaiah", jer: "Jeremiah", lam: "Lamentations", ezek: "Ezekiel",
  dan: "Daniel", hos: "Hosea", obad: "Obadiah", jon: "Jonah", mic: "Micah",
  nah: "Nahum", hab: "Habakkuk", zeph: "Zephaniah", hag: "Haggai",
  zech: "Zechariah", mal: "Malachi", matt: "Matthew", mt: "Matthew",
  mk: "Mark", lk: "Luke", jn: "John", rom: "Romans",
  "1cor": "1 Corinthians", "2cor": "2 Corinthians", gal: "Galatians",
  eph: "Ephesians", phil: "Philippians", col: "Colossians",
  "1thess": "1 Thessalonians", "2thess": "2 Thessalonians",
  "1tim": "1 Timothy", "2tim": "2 Timothy", phlm: "Philemon",
  heb: "Hebrews", jas: "James", "1pet": "1 Peter", "2pet": "2 Peter",
  rev: "Revelation", apocalypse: "Revelation",
};

interface ParsedRef {
  bookNr: number;
  bookName: string;
  chapter: number;
  from: number;
  to: number;
}

const normalizeKey = (s: string) => s.toLowerCase().replace(/\./g, "").replace(/\s+/g, "");

/**
 * Resolves a book name in `lang` (or English) to its 1-based number.
 * Lets a Polish "Łk" or French "Jean" resolve as readily as "Luke".
 */
function resolveBook(name: string, lang: string): number | null {
  const key = normalizeKey(name);
  for (const source of [BOOKS_BY_LANG[lang], BOOKS_BY_LANG.EN]) {
    if (!source) continue;
    const idx = source.findIndex((variants) => variants.some((v) => normalizeKey(v) === key));
    if (idx !== -1) return idx + 1;
  }
  // Fall back to the English canonical list and its abbreviations.
  const canonical = BOOKS.find((b) => normalizeKey(b) === key) ?? ALIASES[key];
  return canonical ? BOOKS.indexOf(canonical) + 1 : null;
}

/** Parses "John 3:16", "1 Cor 15:3-5", "Łk 24,6". Returns null if unusable. */
export function parseReference(raw: string, lang = "EN"): ParsedRef | null {
  const cleaned = raw.trim().replace(/\.$/, "");
  // Book may contain a leading numeral and spaces; chapter:verse[-verse] tail.
  const m = /^(.+?)\s*\.?\s+(\d+)\s*[:,]\s*(\d+)(?:\s*[-–]\s*(\d+))?$/.exec(cleaned);
  if (!m) return null;

  const bookNr = resolveBook(m[1], lang);
  if (!bookNr) return null;
  const canonical = BOOKS[bookNr - 1];

  const from = Number(m[3]);
  const to = m[4] ? Number(m[4]) : from;
  if (to < from) return null;

  return {
    bookNr: BOOKS.indexOf(canonical) + 1,
    bookName: canonical,
    chapter: Number(m[2]),
    from,
    to,
  };
}

interface Chapter {
  verses: { verse: number; text: string }[];
}

const chapterCache = new Map<string, { data: Chapter; fetchedAt: number }>();

async function fetchChapter(translationId: string, bookNr: number, chapter: number) {
  const key = `${translationId}/${bookNr}/${chapter}`;
  const hit = chapterCache.get(key);
  if (hit && Date.now() - hit.fetchedAt < CACHE_TTL_MS) return hit.data;

  const res = await fetch(`${API_BASE}/${key}.json`);
  if (!res.ok) throw new Error(`getbible ${res.status} for ${key}`);
  const data = (await res.json()) as Chapter;

  chapterCache.set(key, { data, fetchedAt: Date.now() });
  return data;
}

export interface VerseLookup {
  reference: string;
  translation: string;
  text: string;
}

/**
 * Returns the exact text of a reference in the given language, or null when the
 * language is unsupported or the reference can't be resolved. Never throws for
 * a bad reference — the caller surfaces the miss to the model so it can cite
 * without quoting rather than invent wording.
 */
export async function lookupVerse(lang: string, reference: string): Promise<VerseLookup | null> {
  const translation = SUPPORTED[lang];
  if (!translation) return null;

  const ref = parseReference(reference, lang);
  if (!ref) return null;

  try {
    const chapter = await fetchChapter(translation.id, ref.bookNr, ref.chapter);
    const verses = chapter.verses.filter((v) => v.verse >= ref.from && v.verse <= ref.to);
    if (!verses.length) return null;

    const label =
      ref.from === ref.to
        ? `${ref.bookName} ${ref.chapter}:${ref.from}`
        : `${ref.bookName} ${ref.chapter}:${ref.from}-${ref.to}`;

    const text = verses
      .map((v) => v.text.trim())
      .join(" ")
      // Collapse the whitespace getbible embeds around verse numbers.
      .replace(/\s+/g, " ")
      // Verses often end mid-sentence, leaving a trailing comma or semicolon.
      // Models drop it when closing a quotation, which then reads as a
      // mismatch against the source; strip it so the two agree.
      .replace(/[,;]$/, "");

    return { reference: label, translation: translation.name, text };
  } catch (err) {
    console.error(`[scripture] lookup failed for "${reference}" (${lang}):`, err);
    return null;
  }
}

/**
 * Verse text for the clickable pill in the UI.
 *
 * Unlike lookupVerse, this never returns nothing just because the answer's
 * language has no licensed translation: it resolves the reference using the
 * answer's book names, then reads the verse in English. The caller shows the
 * returned `translation` label, so a Polish reader sees "KJV" and knows they
 * are being given the English text rather than Biblia Tysiąclecia.
 */
export async function lookupVerseForDisplay(
  lang: string,
  reference: string,
): Promise<VerseLookup | null> {
  const native = await lookupVerse(lang, reference);
  if (native) return native;

  const ref = parseReference(reference, lang);
  if (!ref) return null;

  const englishRef =
    ref.from === ref.to
      ? `${ref.bookName} ${ref.chapter}:${ref.from}`
      : `${ref.bookName} ${ref.chapter}:${ref.from}-${ref.to}`;

  return lookupVerse("EN", englishRef);
}

/** The tool exposed to the model for languages in SUPPORTED. */
export const LOOKUP_TOOL = {
  name: "lookup_scripture",
  description:
    "Fetch the exact, verbatim text of a Bible verse. Call this before quoting " +
    "any verse so the wording is guaranteed correct rather than recalled from " +
    "memory. Returns the verse text, or not_found if the reference is invalid.",
  input_schema: {
    type: "object" as const,
    properties: {
      reference: {
        type: "string",
        description:
          "Bible reference using the ENGLISH book name, e.g. 'John 3:16', " +
          "'1 Corinthians 15:3-5', 'Psalms 23:1'. Always English regardless of " +
          "the response language.",
      },
    },
    required: ["reference"],
  },
};
