import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://kocengine.com";

  // Core static pages
  const staticPages = [
    { route: "", priority: 1 },
    { route: "/how-it-works", priority: 0.9 },
    { route: "/for-brands", priority: 0.9 },
    { route: "/for-creators", priority: 0.9 },
    { route: "/pricing", priority: 0.9 },
    { route: "/about", priority: 0.8 },
    { route: "/faq", priority: 0.8 },
    { route: "/contact", priority: 0.7 },
    { route: "/research", priority: 0.7 },
    { route: "/case-studies", priority: 0.7 },
    { route: "/login", priority: 0.5 },
    { route: "/register", priority: 0.5 },
    { route: "/koc/apply", priority: 0.5 },
    { route: "/privacy", priority: 0.3 },
    { route: "/terms", priority: 0.3 },
    { route: "/guide/koc-marketing-cross-border-ecommerce", priority: 0.8 },
    { route: "/blog/how-to-prevent-influencer-ghosting", priority: 0.7 },
    { route: "/blog/influencer-marketing-for-chinese-cross-border-sellers", priority: 0.7 },
    { route: "/blog/koc-marketing-southeast-asia-guide", priority: 0.7 },
    { route: "/vs/modash", priority: 0.7 },
    { route: "/vs/upfluence", priority: 0.7 },
    { route: "/vs/grin", priority: 0.7 },
    { route: "/alternatives/amazon-influencer", priority: 0.7 },
  ].map(({ route, priority }) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority,
  }));

  return [...staticPages];
}
