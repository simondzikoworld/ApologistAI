// Bible book names — full and common abbreviations
const BOOK_NAMES = [
  "Genesis", "Gen",
  "Exodus", "Exod", "Ex",
  "Leviticus", "Lev",
  "Numbers", "Num",
  "Deuteronomy", "Deut",
  "Joshua", "Josh",
  "Judges", "Judg",
  "Ruth",
  "1 Samuel", "1Sam", "1 Sam",
  "2 Samuel", "2Sam", "2 Sam",
  "1 Kings", "1Kgs", "1 Kgs",
  "2 Kings", "2Kgs", "2 Kgs",
  "1 Chronicles", "1Chr", "1 Chr",
  "2 Chronicles", "2Chr", "2 Chr",
  "Ezra",
  "Nehemiah", "Neh",
  "Esther", "Esth",
  "Job",
  "Psalms", "Psalm", "Ps",
  "Proverbs", "Prov",
  "Ecclesiastes", "Eccl",
  "Song of Solomon", "Song",
  "Isaiah", "Isa",
  "Jeremiah", "Jer",
  "Lamentations", "Lam",
  "Ezekiel", "Ezek",
  "Daniel", "Dan",
  "Hosea", "Hos",
  "Joel",
  "Amos",
  "Obadiah", "Obad",
  "Jonah", "Jon",
  "Micah", "Mic",
  "Nahum", "Nah",
  "Habakkuk", "Hab",
  "Zephaniah", "Zeph",
  "Haggai", "Hag",
  "Zechariah", "Zech",
  "Malachi", "Mal",
  "Matthew", "Matt",
  "Mark",
  "Luke",
  "John",
  "Acts",
  "Romans", "Rom",
  "1 Corinthians", "1Cor", "1 Cor",
  "2 Corinthians", "2Cor", "2 Cor",
  "Galatians", "Gal",
  "Ephesians", "Eph",
  "Philippians", "Phil",
  "Colossians", "Col",
  "1 Thessalonians", "1Thess", "1 Thess",
  "2 Thessalonians", "2Thess", "2 Thess",
  "1 Timothy", "1Tim", "1 Tim",
  "2 Timothy", "2Tim", "2 Tim",
  "Titus",
  "Philemon", "Phlm",
  "Hebrews", "Heb",
  "James", "Jas",
  "1 Peter", "1Pet", "1 Pet",
  "2 Peter", "2Pet", "2 Pet",
  "1 John", "1John",
  "2 John", "2John",
  "3 John", "3John",
  "Jude",
  "Revelation", "Rev",
].sort((a, b) => b.length - a.length); // longest first so "Song of Solomon" matches before "Song"

// Build a regex that matches e.g. "John 3:16", "1 Cor 15:3-5", "Ps. 23:1"
const bookPattern = BOOK_NAMES.map((b) =>
  b.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
).join("|");

export const SCRIPTURE_RE = new RegExp(
  `\\b(${bookPattern})\\.?\\s+(\\d+):(\\d+)(?:[–\\-](\\d+))?\\b`,
  "g"
);

/**
 * Preprocess markdown so that Bible references get wrapped in a special
 * backtick syntax: `BIB:John 3:16`
 * The ReactMarkdown `code` renderer then detects the BIB: prefix and renders
 * a ScripturePill instead of a <code> block.
 */
export function wrapScriptureRefs(text: string): string {
  return text.replace(SCRIPTURE_RE, (match) => `\`BIB:${match}\``);
}

/** Strip the BIB: prefix to get the plain reference string */
export function parseBibCode(code: string): string | null {
  if (code.startsWith("BIB:")) return code.slice(4);
  return null;
}
