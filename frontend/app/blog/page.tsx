import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Blog — KOC Marketing Insights for Cross-Border Brands",
  description:
    "Guides, comparisons, and data-driven insights on KOC marketing, influencer platforms, creator vetting, and cross-border e-commerce growth strategies.",
  alternates: { canonical: "/blog" },
};

const posts = [
  {
    href: "/blog/how-to-prevent-influencer-ghosting",
    title: "How to Prevent Influencer Ghosting: 5 Proven Strategies for E-Commerce Brands (2026)",
    desc: "Influencer ghosting costs brands 30–40% of their campaign budget. Learn 5 proven strategies including escrow protection, SLA deadlines, AI vetting, trust scores, and automated matching.",
    date: "2026-06-23",
    category: "Guide",
  },
  {
    href: "/blog/influencer-marketing-for-chinese-cross-border-sellers",
    title: "Influencer Marketing for Chinese Cross-Border Sellers: The Complete 2026 Playbook",
    desc: "How Chinese cross-border sellers (Amazon, Shopify, Temu) can use KOC marketing to build trust in foreign markets. Covers creator sourcing, pledge protection, external traffic attribution, and ROI optimization.",
    date: "2026-06-23",
    category: "Guide",
  },
  {
    href: "/blog/koc-marketing-southeast-asia-guide",
    title: "KOC Marketing Southeast Asia Guide: TikTok, Shopee, and Local Creator Strategies (2026)",
    desc: "Complete guide to KOC marketing in Thailand, Vietnam, Philippines, Malaysia, Indonesia. Covers platform selection, creator sourcing, Shopee/Lazada integration, pledge protection, and ROI benchmarks.",
    date: "2026-06-23",
    category: "Guide",
  },
  {
    href: "/alternatives/amazon-influencer",
    title: "Amazon Influencer Program Alternatives: KOC Engine vs Amazon's Native Program",
    desc: "Comparing Amazon Influencer Program with KOC Engine. Why KOC Engine's pledge economy and AI matching deliver higher ROI for cross-border Amazon sellers.",
    date: "2026-06-22",
    category: "Comparison",
  },
  {
    href: "/vs/upfluence",
    title: "KOC Engine vs Upfluence: Which Platform Works for Amazon Sellers?",
    desc: "KOC Engine vs Upfluence comparison. Why KOC Engine's pledge economy and AI auto-matching beat Upfluence's CRM-first approach for cross-border e-commerce brands.",
    date: "2026-06-22",
    category: "Comparison",
  },
  {
    href: "/vs/grin",
    title: "KOC Engine vs GRIN: Why Pledge Economy Beats Manual Creator Management",
    desc: "GRIN dominates Shopify DTC influencer management. KOC Engine adds cross-border escrow, AI matching, and platform-agnostic support for Amazon and DTC brands.",
    date: "2026-06-22",
    category: "Comparison",
  },
  {
    href: "/vs/modash",
    title: "KOC Engine vs Modash: The Best Platform for Cross-Border E-Commerce",
    desc: "While Modash excels at discovery, KOC Engine solves the Fulfillment Gap in cross-border e-commerce through automated trust protocols and pledge-protected delivery.",
    date: "2026-06-22",
    category: "Comparison",
  },
  {
    href: "/guide/koc-marketing-cross-border-ecommerce",
    title: "Complete Guide to KOC Marketing for Cross-Border E-Commerce (2026)",
    desc: "The definitive 8-chapter guide: finding creators, KOC vs KOL, sample logistics, preventing ghosting, ROI tracking, and cost comparison.",
    date: "2026-06-20",
    category: "Guide",
  },
  {
    href: "/pricing",
    title: "KOC Engine Pricing — Pay Per Result, Not Per Subscription",
    desc: "No monthly fees. No hidden markups. Pay only when a KOC delivers approved content — guaranteed by our pledge economy. 1pt = $1 USD.",
    date: "2026-06-23",
    category: "Pricing",
  },
  {
    href: "/case-studies",
    title: "Case Studies: Pledge-Protected Campaigns with Zero Ghosting",
    desc: "Real results from cross-border brands using KOC Engine. Amazon launch with 0% ghosting, DTC brand 3x ROI, and multi-market expansion via pledge-protected KOC campaigns.",
    date: "2026-06-23",
    category: "Case Study",
  },
  {
    href: "/about",
    title: "About KOC Engine — Built by Cross-Border Sellers, for Cross-Border Sellers",
    desc: "Founded by Jojo Shen. Learn about the pledge economy, AI scoring, and the trust protocol that powers our platform.",
    date: "2026-06-23",
    category: "About",
  },
];

export default function BlogPage() {
  return (
    <main className="max-w-4xl mx-auto px-6 py-16">
      <h1 className="text-4xl font-extrabold text-zinc-900 mb-2">Blog</h1>
      <p className="text-zinc-500 mb-10">KOC marketing insights, platform comparisons, and cross-border e-commerce growth strategies.</p>

      <div className="space-y-5">
        {posts.map((post) => (
          <Link key={post.href} href={post.href} className="block bg-white rounded-2xl border border-zinc-100 p-6 hover:border-pink-200 hover:shadow-md transition">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-xs font-semibold bg-pink-50 text-pink-600 px-2 py-0.5 rounded-full">{post.category}</span>
              <span className="text-xs text-zinc-400">{post.date}</span>
            </div>
            <h2 className="text-lg font-bold text-zinc-900 mb-1">{post.title}</h2>
            <p className="text-sm text-zinc-500">{post.desc}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
