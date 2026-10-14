// ---------------------------------------------------------------------------
// Verbatim scripture lookup.
//
// A model cannot verify that a verse it recalls is word-for-word correct — it
// can only be confident. The only way to guarantee an exact quotation is to
// hand it the real text, which is what this module does.
//
// Source: our own static files under public/bibles/<code>/<OSIS>/<chapter>.json
// — public-domain Catholic Bibles (73 books) converted once and served from the
// CDN. The mobile app's Bible reader reads the same files, so a verse reads the
// same everywhere.
// ---------------------------------------------------------------------------

import { BOOKS_BY_LANG } from "@/data/bibleBooks";

// Static files are served by the site itself; functions can't read public/
// from disk on Vercel, so fetch them over HTTP.
const BIBLE_BASE = `${
  process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : process.env.NEXT_PUBLIC_APP_URL ?? "https://www.apologistai.net"
}/bibles`;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // chapters are immutable; cache hard

interface Translation {
  /** Folder under public/bibles */
  code: string;
  /** Human name used in the citation shown to the user */
  name: string;
  /** Vulgate-numbered Psalters (Douay, Wujek, …) are one behind the Hebrew from Ps 10 on. */
  psalms: "hebrew" | "vulgate";
  /** Books ("Rom") or single chapters ("Zech.14") whose text comes from a different Bible. */
  bookSources?: Record<string, string>;
}

// Allioli's digital text lacks these books; they're filled from the 1924
// Catholic Grünewald Bible (see public/bibles/allioli/index.json "sources").
const GRUENEWALD = "Grünewald-Bibel 1924";

/**
 * Catholic, public-domain translation per language. PT has no public-domain
 * Catholic text available, so it isn't listed: answers there cite without
 * quoting, and the verse pill falls back to English.
 */
export const SUPPORTED: Record<string, Translation> = {
  EN: { code: "drc", name: "Douay-Rheims", psalms: "vulgate" },
  // CC BY-SA 4.0 — the attribution travels with every citation via `name`.
  FR: { code: "neocrampon", name: "Néo-Crampon Libre", psalms: "hebrew" },
  ES: { code: "platense", name: "Biblia Platense (Straubinger)", psalms: "vulgate" },
  DE: {
    code: "allioli", name: "Allioli-Bibel", psalms: "vulgate",
    bookSources: {
      "1Kgs": GRUENEWALD, "2Kgs": GRUENEWALD, Ezra: GRUENEWALD, Rom: GRUENEWALD, Heb: GRUENEWALD,
      "Zech.14": GRUENEWALD,
    },
  },
  PL: { code: "wujek", name: "Biblia Jakuba Wujka", psalms: "vulgate" },
};

export function isSupported(lang: string): boolean {
  return lang in SUPPORTED;
}

// OSIS ids in the same order as BOOKS below (66 books, then the deuterocanon
// appended in data/bibleBooks.ts order) — the folder names in public/bibles.
const OSIS = [
  "Gen", "Exod", "Lev", "Num", "Deut", "Josh", "Judg", "Ruth", "1Sam", "2Sam",
  "1Kgs", "2Kgs", "1Chr", "2Chr", "Ezra", "Neh", "Esth", "Job", "Ps", "Prov",
  "Eccl", "Song", "Isa", "Jer", "Lam", "Ezek", "Dan", "Hos", "Joel", "Amos",
  "Obad", "Jonah", "Mic", "Nah", "Hab", "Zeph", "Hag", "Zech", "Mal", "Matt",
  "Mark", "Luke", "John", "Acts", "Rom", "1Cor", "2Cor", "Gal", "Eph", "Phil",
  "Col", "1Thess", "2Thess", "1Tim", "2Tim", "Titus", "Phlm", "Heb", "Jas",
  "1Pet", "2Pet", "1John", "2John", "3John", "Jude", "Rev",
  "Tob", "Jdt", "Wis", "Sir", "Bar", "1Macc", "2Macc",
];

/**
 * Hebrew (modern) Psalm number → Vulgate number. The model cites the numbering
 * everyone knows ("Psalm 23"); Vulgate Psalters call that Psalm 22. Split
 * psalms (Heb 116, 147) map by verse.
 */
function vulgatePsalm(chapter: number, verse: number): { chapter: number; verse: number } {
  if (chapter <= 8 || chapter >= 148) return { chapter, verse };
  if (chapter === 9) return { chapter: 9, verse };
  if (chapter === 10) return { chapter: 9, verse: verse + 21 };
  if (chapter <= 113) return { chapter: chapter - 1, verse };
  if (chapter === 114) return { chapter: 113, verse };
  if (chapter === 115) return { chapter: 113, verse: verse + 8 };
  if (chapter === 116) return verse <= 9 ? { chapter: 114, verse } : { chapter: 115, verse: verse - 9 };
  if (chapter <= 146) return { chapter: chapter - 1, verse };
  // chapter === 147
  return verse <= 11 ? { chapter: 146, verse } : { chapter: 147, verse: verse - 11 };
}

// Canonical English names, same order as OSIS.
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
  "Tobit", "Judith", "Wisdom", "Sirach", "Baruch", "1 Maccabees", "2 Maccabees",
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
  tob: "Tobit", tobias: "Tobit", jdt: "Judith", wis: "Wisdom", wisd: "Wisdom",
  wisdomofsolomon: "Wisdom", sir: "Sirach", ecclesiasticus: "Sirach", ecclus: "Sirach",
  bar: "Baruch", "1macc": "1 Maccabees", "2macc": "2 Maccabees",
  "1mac": "1 Maccabees", "2mac": "2 Maccabees",
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

/** public/bibles chapter file: [[verse, text], ...] */
interface Chapter {
  v: [number, string][];
}

const chapterCache = new Map<string, { data: Chapter; fetchedAt: number }>();

async function fetchChapter(code: string, bookNr: number, chapter: number): Promise<Chapter | null> {
  const key = `${code}/${OSIS[bookNr - 1]}/${chapter}`;
  const hit = chapterCache.get(key);
  if (hit && Date.now() - hit.fetchedAt < CACHE_TTL_MS) return hit.data;

  const res = await fetch(`${BIBLE_BASE}/${key}.json`);
  if (res.status === 404) return null; // chapter doesn't exist in this Bible
  if (!res.ok) throw new Error(`bible ${res.status} for ${key}`);
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

  // Vulgate-numbered Psalters: translate the familiar Hebrew number first.
  let { chapter: ch, from, to } = ref;
  const isVulgatePsalm = ref.bookName === "Psalms" && translation.psalms === "vulgate";
  if (isVulgatePsalm) {
    const start = vulgatePsalm(ref.chapter, ref.from);
    const end = vulgatePsalm(ref.chapter, ref.to);
    ch = start.chapter;
    from = start.verse;
    to = end.chapter === start.chapter ? end.verse : start.verse;
  }

  try {
    const chapter = await fetchChapter(translation.code, ref.bookNr, ch);
    if (!chapter) return null;
    const verses = chapter.v.filter(([n]) => n >= from && n <= to);
    if (!verses.length) return null;

    const span = from === to ? `${ch}:${from}` : `${ch}:${from}-${to}`;
    // Show the translation's own Psalm number, with the familiar one alongside.
    const label =
      isVulgatePsalm && ch !== ref.chapter
        ? `${ref.bookName} ${span} (${ref.chapter})`
        : `${ref.bookName} ${span}`;

    const text = verses
      .map(([, t]) => t.trim())
      .join(" ")
      .replace(/\s+/g, " ")
      // Verses often end mid-sentence, leaving a trailing comma or semicolon.
      // Models drop it when closing a quotation, which then reads as a
      // mismatch against the source; strip it so the two agree.
      .replace(/[,;]$/, "");

    const osis = OSIS[ref.bookNr - 1];
    const name =
      translation.bookSources?.[`${osis}.${ch}`] ?? translation.bookSources?.[osis] ?? translation.name;
    return { reference: label, translation: name, text };
  } catch (err) {
    console.error(`[scripture] lookup failed for "${reference}" (${lang}):`, err);
    return null;
  }
}

/**
 * Verse text for the clickable pill in the UI.
 *
 * Unlike lookupVerse, this never returns nothing just because the answer's
 * language has no Bible here (PT): it resolves the reference using the answer's
 * book names, then reads the verse in English. The caller shows the returned
 * `translation` label, so the reader sees "Douay-Rheims" and knows they are
 * being given the English text.
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
          "'1 Corinthians 15:3-5', 'Psalms 23:1', 'Sirach 2:1', '2 Maccabees 12:46'. " +
          "Always English regardless of the response language. Use the modern " +
          "(Hebrew) Psalm numbers; they are converted for Vulgate-numbered Bibles.",
      },
    },
    required: ["reference"],
  },
};
