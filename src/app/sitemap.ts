import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

const publicRoutes = ["", "/about", "/apply", "/officers", "/sprint"];

export default function sitemap(): MetadataRoute.Sitemap {
  return publicRoutes.map((route, index) => ({
    url: `${SITE_URL}${route}`,
    changeFrequency: index === 0 ? "weekly" : "monthly",
    priority: index === 0 ? 1 : 0.8,
  }));
}
