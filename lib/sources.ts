import type { Source } from "./types";
import { CATEGORISED_SOURCES, type SourceCategory } from "@/data/defaultSources";

const pageCache = new Map<string, { text: string; fetchedAt: number }>();
const siteCache = new Map<string, { content: string; fetchedAt: number }>();
const CACHE_TTL_MS = 30 * 60 * 1000;

const FETCH_HEADERS = {
  "User-Agent": "ChristianDebater/1.0 (educational apologetics tool)",
  "Accept": "text/html,application/xhtml+xml,text/xml,application/xml",
};

const MAX_PAGES_PER_SITE = 6;
const CHARS_PER_PAGE = 1500;
// Max sites fetched per request — keeps context tight and requests fast
const MAX_SITES_PER_REQUEST = 6;

// ---------------------------------------------------------------------------
// Category detection — picks the most relevant source categories for a query
// ---------------------------------------------------------------------------

const CATEGORY_PATTERNS: Array<{ pattern: RegExp; categories: SourceCategory[] }> = [
  {
    pattern: /islam|muslim|quran|muhammad|allah|debunk|contradict|refute|objection|prove christianity|other religion|atheist|atheism|mormon|jehovah/i,
    categories: ["apologetics"],
  },
  {
    pattern: /church father|patristic|clement|origen|tertullian|augustine|chrysostom|ignatius|polycarp|irenaeus|justin martyr|early church/i,
    categories: ["church_fathers"],
  },
  {
    pattern: /gnostic|apostolic father|noncanonical|apocrypha|didache|shepherd of hermas|epistle of barnabas|early christian writing/i,
    categories: ["early_christianity"],
  },
  {
    pattern: /trinity|salvation|grace|predestination|reformed|calvinist|arminian|doctrine|systematic theology|lutheran|protestant|catholic|denomination|baptism|atonement|sanctif/i,
    categories: ["theology"],
  },
  {
    pattern: /hebrew|greek|manuscript|textual criticism|septuagint|old testament|new testament|pentateuch|genesis|exodus|biblical text|canon|translation|interlinear/i,
    categories: ["academic_bible"],
  },
  {
    pattern: /archaeology|dead sea scroll|excavat|ancient israel|ancient near east|artifact|inscription|ossuary|qumran|biblical history|historical evidence/i,
    categories: ["archaeology"],
  },
];

function detectCategories(query: string): SourceCategory[] {
  const matched = new Set<SourceCategory>();

  for (const { pattern, categories } of CATEGORY_PATTERNS) {
    if (pattern.test(query)) {
      categories.forEach((c) => matched.add(c));
    }
  }

  // Default fallback — apologetics + theology covers most general questions
  if (matched.size === 0) {
    matched.add("apologetics");
    matched.add("theology");
  }

  return [...matched];
}

// ---------------------------------------------------------------------------
// HTML stripping
// ---------------------------------------------------------------------------

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/<header[\s\S]*?<\/header>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s{2,}/g, " ")
    .trim();
}

// ---------------------------------------------------------------------------
// Page + site fetching
// ---------------------------------------------------------------------------

async function fetchText(url: string): Promise<string> {
  const cached = pageCache.get(url);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.text;
  }
  try {
    const res = await fetch(url, {
      headers: FETCH_HEADERS,
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return "";
    const html = await res.text();
    const text = stripHtml(html);
    pageCache.set(url, { text, fetchedAt: Date.now() });
    return text;
  } catch {
    return "";
  }
}

function extractInternalLinks(html: string, origin: string): string[] {
  const links: string[] = [];
  const seen = new Set<string>();
  const hrefRe = /href=["']([^"'#?]+)["']/gi;
  let match: RegExpExecArray | null;

  while ((match = hrefRe.exec(html)) !== null) {
    const raw = match[1].trim();
    if (!raw || raw === "/" || raw.startsWith("mailto:") || raw.startsWith("javascript:")) continue;
    let full: string;
    try {
      full = new URL(raw, origin).href;
    } catch {
      continue;
    }
    if (!full.startsWith(origin)) continue;
    if (/\.(css|js|png|jpg|jpeg|gif|svg|ico|pdf|zip|xml|json)$/i.test(full)) continue;
    if (!seen.has(full)) {
      seen.add(full);
      links.push(full);
    }
  }
  return links;
}

async function fetchSitemapUrls(origin: string): Promise<string[]> {
  for (const path of ["/sitemap.xml", "/sitemap_index.xml", "/sitemap"]) {
    try {
      const res = await fetch(`${origin}${path}`, {
        headers: FETCH_HEADERS,
        signal: AbortSignal.timeout(6000),
      });
      if (!res.ok) continue;
      const xml = await res.text();
      if (!xml.includes("<loc>")) continue;
      const urls: string[] = [];
      const locRe = /<loc>\s*(https?:\/\/[^<\s]+)\s*<\/loc>/gi;
      let m: RegExpExecArray | null;
      while ((m = locRe.exec(xml)) !== null) {
        const url = m[1].trim();
        if (url.startsWith(origin) && !/\.(xml|css|js|png|jpg|gif)$/i.test(url)) {
          urls.push(url);
        }
      }
      if (urls.length > 0) return urls;
    } catch {
      continue;
    }
  }
  return [];
}

async function crawlSite(siteUrl: string): Promise<string> {
  const cached = siteCache.get(siteUrl);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.content;
  }

  let origin: string;
  try {
    origin = new URL(siteUrl).origin;
  } catch {
    return "";
  }

  const homepageHtml = await (async () => {
    try {
      const res = await fetch(siteUrl, { headers: FETCH_HEADERS, signal: AbortSignal.timeout(8000) });
      return res.ok ? await res.text() : "";
    } catch {
      return "";
    }
  })();

  const homepageText = stripHtml(homepageHtml).slice(0, CHARS_PER_PAGE);

  let subPageUrls = await fetchSitemapUrls(origin);
  if (subPageUrls.length === 0 && homepageHtml) {
    subPageUrls = extractInternalLinks(homepageHtml, origin);
  }

  const candidates = subPageUrls
    .filter((u) => u !== siteUrl && u !== origin + "/" && u !== origin)
    .slice(0, MAX_PAGES_PER_SITE - 1);

  const subTexts = await Promise.allSettled(
    candidates.map(async (url) => {
      const text = await fetchText(url);
      return text ? `[Page: ${url}]\n${text.slice(0, CHARS_PER_PAGE)}` : "";
    })
  );

  const parts: string[] = [];
  if (homepageText) parts.push(`[Homepage: ${siteUrl}]\n${homepageText}`);
  for (const r of subTexts) {
    if (r.status === "fulfilled" && r.value) parts.push(r.value);
  }

  const content = parts.join("\n\n");
  siteCache.set(siteUrl, { content, fetchedAt: Date.now() });
  return content;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fetches and parses sources relevant to the given query.
 * If a query is provided, only sources from matching categories are used
 * (up to MAX_SITES_PER_REQUEST). Falls back to using provided URLs directly.
 */
export async function fetchAndParseSources(urls: string[], query?: string, limit = MAX_SITES_PER_REQUEST): Promise<string> {
  if (limit <= 0) return "";

  let targetUrls: string[];

  if (query?.trim()) {
    const categories = detectCategories(query);
    // Gather URLs from matching categories (preserving category order)
    const categoryUrls = categories.flatMap((cat) => CATEGORISED_SOURCES[cat] ?? []);
    // Also include any custom URLs the user added that aren't in the defaults
    const defaultSet = new Set(Object.values(CATEGORISED_SOURCES).flat());
    const customUrls = urls.filter((u) => !defaultSet.has(u));
    // Deduplicate and cap
    targetUrls = [...new Set([...categoryUrls, ...customUrls])].slice(0, limit);
  } else {
    targetUrls = urls.slice(0, limit);
  }

  if (!targetUrls.length) return "";

  const results = await Promise.allSettled(targetUrls.map(crawlSite));

  const sections: string[] = [];
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    if (r.status === "fulfilled" && r.value) {
      sections.push(`=== SITE: ${targetUrls[i]} ===\n\n${r.value}`);
    }
  }

  return sections.join("\n\n" + "=".repeat(60) + "\n\n");
}

// Legacy single-URL export kept for compatibility
export async function fetchSource(url: string): Promise<Source> {
  const content = await crawlSite(url);
  return { url, content, fetchedAt: Date.now() };
}
