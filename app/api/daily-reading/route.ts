import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { redis } from "@/lib/redis";

export const runtime = "nodejs";
export const revalidate = 86400;

export interface Reading {
  title: string;
  reference: string;
  subtitle: string;
  text: string;
}

export interface DailyReadingData {
  date: string;
  readings: Reading[];
}

function decodeEntities(str: string): string {
  return str
    .replace(/&nbsp;/g, " ")
    .replace(/&#160;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&ldquo;/g, "“")
    .replace(/&rdquo;/g, "”")
    .replace(/&lsquo;|&#8216;/g, "‘")
    .replace(/&rsquo;|&#8217;/g, "’")
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

function stripTags(html: string): string {
  return decodeEntities(html.replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();
}

// Only the meaningful Mass readings — skip Gospel Acclamation (just "Alleluia") and Sequence
const READING_TITLES = ["first reading", "second reading", "responsorial psalm", "gospel"];

// Titles that mark the start of a second / optional Mass set — stop before these
const SECOND_MASS_MARKERS = ["first reading", "second reading"];

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Translations are identical for every visitor on a given day, so cache them
// instead of paying for an LLM call (and a ~14s wait) on every request.
const TRANSLATION_TTL_SECONDS = 36 * 60 * 60;

async function translateOnce(data: DailyReadingData, targetLang: string): Promise<DailyReadingData> {
  const payload = JSON.stringify(data);
  const msg = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    // German/Polish run noticeably longer than the English source; 4096 could
    // truncate the JSON mid-string.
    max_tokens: 8192,
    messages: [{
      role: "user",
      content: `Translate the following Catholic daily Mass readings JSON from English to ${targetLang}. Translate ALL text fields (date, title, reference, subtitle, text). Keep the exact same JSON structure. The output must be valid JSON: escape any double quote inside a string as \\", or use typographic quotes instead. Return ONLY the JSON, no explanation.\n\n${payload}`,
    }],
  });
  if (msg.stop_reason === "max_tokens") throw new Error("translation truncated");
  const raw = (msg.content[0] as { type: string; text: string }).text;
  // Tolerate code fences or stray prose around the object.
  const jsonStr = raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1);
  const parsed = JSON.parse(jsonStr) as DailyReadingData;
  if (!parsed.readings?.length) throw new Error("translation missing readings");
  return parsed;
}

async function translateReadings(data: DailyReadingData, lang: string): Promise<DailyReadingData> {
  const targetLang = lang === "PL" ? "Polish" : lang === "ES" ? "Spanish" : lang === "FR" ? "French" : "German";
  const cacheKey = `daily-reading:${lang}:${new Date().toISOString().slice(0, 10)}`;

  try {
    const cached = await redis.get<DailyReadingData>(cacheKey);
    if (cached?.readings?.length) return cached;
  } catch (err) {
    console.warn("Daily reading cache read failed:", err);
  }

  // The model occasionally returns malformed JSON (unescaped quotes are common
  // in German „…“ text), so give it a second attempt before failing.
  let lastErr: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const translated = await translateOnce(data, targetLang);
      redis.set(cacheKey, translated, { ex: TRANSLATION_TTL_SECONDS }).catch((err) => {
        console.warn("Daily reading cache write failed:", err);
      });
      return translated;
    } catch (err) {
      lastErr = err;
      console.warn(`Daily reading translation (${lang}) attempt ${attempt + 1} failed:`, err);
    }
  }
  throw lastErr;
}

export async function GET(req: NextRequest) {
  const lang = req.nextUrl.searchParams.get("lang") ?? "EN";
  try {
    const res = await fetch("https://universalis.com/mass.htm", {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
      next: { revalidate: 86400 },
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();

    // Date from <title>
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const date = titleMatch
      ? decodeEntities(titleMatch[1].split("|")[0].split("-")[0].trim())
      : new Date().toLocaleDateString("en-GB", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        });

    const readings: Reading[] = [];

    // Split the document on each <table class="each" — gives one chunk per reading section
    const chunks = html.split(/<table[^>]+class="each"[^>]*>/i);
    let seenGospel = false;

    for (let i = 1; i < chunks.length; i++) {
      const chunk = chunks[i];

      // Title — first <th align="left">
      const titleMatch = chunk.match(/<th[^>]*align="left"[^>]*>([\s\S]*?)<\/th>/i);
      if (!titleMatch) continue;
      const title = stripTags(titleMatch[1]);
      const titleLower = title.toLowerCase();

      // Skip if not a reading we want
      if (!READING_TITLES.some((r) => titleLower.includes(r))) continue;

      // Stop if we've seen the Gospel and now hit another First/Second Reading
      // (that means a second Mass set has started — saint's feast etc.)
      if (seenGospel && SECOND_MASS_MARKERS.some((r) => titleLower.includes(r))) break;

      if (titleLower.includes("gospel")) seenGospel = true;

      // Reference — first <th align="right">
      const refMatch = chunk.match(/<th[^>]*align="right"[^>]*>([\s\S]*?)<\/th>/i);
      const reference = refMatch ? stripTags(refMatch[1]) : "";

      // Everything after </table>
      const afterTable = chunk.slice(chunk.indexOf("</table>") + 8);

      // Subtitle — first <h4>
      const h4Match = afterTable.match(/<h4[^>]*>([\s\S]*?)<\/h4>/i);
      const subtitle = h4Match ? stripTags(h4Match[1]) : "";

      // Body paragraphs — <div class="p/pi"> (prose) and <div class="v/vi"> (psalm verse)
      const paragraphs: string[] = [];
      const divRegex = /<div[^>]+class="[pv][^"]*"[^>]*>([\s\S]*?)<\/div>/gi;
      let m: RegExpExecArray | null;
      while ((m = divRegex.exec(afterTable)) !== null) {
        const text = stripTags(m[1]).replace(/^\s+/, "");
        if (text) paragraphs.push(text);
      }

      const text = paragraphs.join("\n\n");
      // Skip readings with no body text (e.g. bare Alleluia verses)
      if (!text) continue;

      readings.push({ title, reference, subtitle, text });
    }

    const result: DailyReadingData = { date, readings };
    if (lang !== "EN" && readings.length > 0) {
      const translated = await translateReadings(result, lang);
      return NextResponse.json(translated);
    }
    return NextResponse.json(result satisfies DailyReadingData);
  } catch (err) {
    console.error("Daily reading error:", err);
    return NextResponse.json({ error: "Failed to load" }, { status: 500 });
  }
}
