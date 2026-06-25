import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://kocengine.com";

  // Core static pages
  const staticPages = [
    "",
    "/login",
    "/register",
    "/koc/apply",
    "/pricing",
    "/about",
    "/case-studies",
    "/guide/koc-marketing-cross-border-ecommerce",
    "/blog/how-to-prevent-influencer-ghosting",
    "/blog/influencer-marketing-for-chinese-cross-border-sellers",
    "/blog/koc-marketing-southeast-asia-guide",
    "/vs/modash",
    "/vs/upfluence",
    "/vs/grin",
    "/alternatives/amazon-influencer",
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: route === "" ? 1 : 0.8,
  }));

  return [...staticPages];
}
