export type SourceCategory =
  | "apologetics"
  | "church_fathers"
  | "early_christianity"
  | "theology"
  | "academic_bible"
  | "archaeology";

export const CATEGORISED_SOURCES: Record<SourceCategory, string[]> = {
  apologetics: [
    "https://carm.org",
    "https://www.reasonablefaith.org",
    "https://www.crossexamined.org",
    "https://answering-islam.org/",
    "http://www.answeringmuslims.com/",
    "http://debate.org.uk/",
    "https://the-good-way.com/eng",
    "https://truthunites.org/",
  ],
  church_fathers: [
    "https://www.newadvent.org/fathers/",
    "https://www.ccel.org/",
  ],
  early_christianity: [
    "https://www.earlychristianwritings.com/",
  ],
  theology: [
    "https://www.gotquestions.org",
    "https://www.desiringgod.org",
    "https://www.ligonier.org/learn/",
    "https://www.monergism.com/",
    "https://www.apologeticspress.org",
  ],
  academic_bible: [
    "https://www.bibleodyssey.org/",
    "https://www.thetorah.com/",
    "https://www.tyndalehouse.com/",
  ],
  archaeology: [
    "https://www.biblicalarchaeology.org/",
  ],
};

// Flat deduplicated list — used by the UI Sources Panel
export const DEFAULT_SOURCES: string[] = [
  ...new Set(Object.values(CATEGORISED_SOURCES).flat()),
];
