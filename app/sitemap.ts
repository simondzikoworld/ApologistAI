import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Only pages Google can actually index. Section anchors (/#pricing) are the
// same page to Google, /chat needs an account, and the sign-in pages are
// blocked in robots.txt.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${SITE_URL}/`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
  ];
}
