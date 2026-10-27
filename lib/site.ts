// The one public address of the site. Everything Google reads — canonical
// tags, sitemap, robots.txt, structured data — must name this exact host, or
// Google files the real domain as a duplicate of whatever was named instead.
//
// Deliberately not NEXT_PUBLIC_APP_URL: that varies per environment (localhost,
// the vercel.app alias), which is right for redirects but wrong for SEO.
// apologistai.net redirects to www, so www is the canonical form.
export const SITE_URL = "https://www.apologistai.net";
