import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

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

async function translateReadings(data: DailyReadingData): Promise<DailyReadingData> {
  const payload = JSON.stringify(data);
  const msg = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 4096,
    messages: [{
      role: "user",
      content: `Translate the following Catholic daily Mass readings JSON from English to Polish. Translate ALL text fields (date, title, reference, subtitle, text). Keep the exact same JSON structure. Return ONLY the JSON, no explanation.\n\n${payload}`,
    }],
  });
  const raw = (msg.content[0] as { type: string; text: string }).text.trim();
  const jsonStr = raw.startsWith("```") ? raw.replace(/^```[a-z]*\n?/, "").replace(/\n?```$/, "") : raw;
  return JSON.parse(jsonStr) as DailyReadingData;
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

      // Body paragraphs — <div class="p"> and <div class="pi">
      const paragraphs: string[] = [];
      const divRegex = /<div[^>]+class="p[^"]*"[^>]*>([\s\S]*?)<\/div>/gi;
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
    if (lang === "PL" && readings.length > 0) {
      const translated = await translateReadings(result);
      return NextResponse.json(translated);
    }
    return NextResponse.json(result satisfies DailyReadingData);
  } catch (err) {
    console.error("Daily reading error:", err);
    return NextResponse.json({ error: "Failed to load" }, { status: 500 });
  }
}
