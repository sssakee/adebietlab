import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  // Everything behind a login stays out of search results.
  return { rules: { userAgent: "*", allow: ["/kiru", "/qupiyalyq"], disallow: ["/oqushy", "/mugalim", "/api"] }, sitemap: `${SITE_URL}/sitemap.xml` };
}
