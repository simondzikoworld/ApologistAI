import { NextRequest, NextResponse } from "next/server";
import { lookupVerseForDisplay } from "@/lib/scripture";

export const runtime = "nodejs";

/**
 * Verse text for the clickable scripture pills.
 *
 * Replaces the component's old direct call to bible-api.com, which was pinned
 * to English KJV regardless of the answer's language. Going through the server
 * means the pill shares lib/scripture.ts with the generation path, so both use
 * the same translations and the same chapter cache.
 */
export async function GET(req: NextRequest) {
  const reference = req.nextUrl.searchParams.get("ref")?.trim();
  const lang = req.nextUrl.searchParams.get("lang")?.trim() || "EN";

  if (!reference) {
    return NextResponse.json({ error: "missing ref" }, { status: 400 });
  }
  // Bounded so this can't be used to hammer the upstream API with junk.
  if (reference.length > 60) {
    return NextResponse.json({ error: "invalid ref" }, { status: 400 });
  }

  try {
    const verse = await lookupVerseForDisplay(lang, reference);
    if (!verse) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    return NextResponse.json(verse, {
      // Verses are immutable; let the CDN and browser hold them.
      headers: { "Cache-Control": "public, max-age=86400, s-maxage=604800" },
    });
  } catch (err) {
    console.error("Verse lookup error:", err);
    return NextResponse.json({ error: "lookup_failed" }, { status: 500 });
  }
}
