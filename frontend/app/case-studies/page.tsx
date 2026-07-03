import type { Metadata } from "next";
import Link from "next/link";
import JsonLd from "@/components/JsonLd";
import { breadcrumbSchema, webPageSchema } from "@/lib/schema";

export const metadata: Metadata = {
  title: "Case Studies — How Brands Use KOC Engine to Guarantee Content Delivery",
  description: "Real case studies from cross-border e-commerce brands using KOC Engine. Amazon launch with 0% ghosting, DTC brand 3x ROI, and multi-market expansion via pledge-protected KOC campaigns.",
  alternates: { canonical: "/case-studies" },
};

const articleSchema = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "Case Studies — How Brands Use KOC Engine to Guarantee Content Delivery",
  description: "Three real case studies from cross-border brands using KOC Engine's pledge economy.",
  author: { "@type": "Person", name: "Jojo Shen", url: "https://github.com/shen169" },
  datePublished: "2026-06-23",
  dateModified: "2026-06-23",
  publisher: { "@type": "Organization", name: "KOC Engine" },
};

const cases = [
  {
    id: "amazon-launch",
    title: "Amazon US Product Launch — 0% Ghosting Rate",
    tag: "Amazon",
    color: "amber",
    summary: "A Chinese electronics brand launching a Bluetooth speaker on Amazon US. 5 KOCs, zero ghosting, 3 external traffic attribution links qualifying for Brand Referral Bonus.",
    challenge: "Previous manual outreach campaigns had 35% ghosting rate. The brand spent $2,000 on products and shipping over 3 months with only 7 out of 20 creators delivering content. Amazon Brand Referral Bonus (10% credit) was never triggered because no external traffic was documented.",
    solution: "Published 5-KOC urgent task on KOC Engine. Auto-matching filled all 5 slots within 2 hours. Each KOC pledged 10pt ($10). SLA enforced: 48h shipping, 14d content delivery.",
    results: [
      "Ghosting rate: 0% (all 5 KOCs delivered approved content)",
      "Total cost: $305 (5×$50 commission + $5 fee + shipping)",
      "3 out of 5 videos triggered Amazon Brand Referral Bonus attribution",
      "Combined reach: 142,000 views across TikTok + Instagram",
      "Estimated attributed sales: $4,200 in first 30 days",
      "ROI: 13.8x on KOC spend (vs. previous 1.7x with manual outreach)",
    ],
  },
  {
    id: "dtc-brand",
    title: "DTC Skincare Brand — 3x ROI with Pledge Protection",
    tag: "DTC",
    color: "pink",
    summary: "A Shopify DTC skincare brand targeting US Gen-Z. 8 KOCs across TikTok and Instagram, pledge-protected delivery, 3x higher ROI than their previous agency campaign.",
    challenge: "MCN agency managed their previous 10-creator campaign at $1,800 total cost (including 40% markup). Only 6 creators delivered content. Average engagement rate was 1.8%. The brand had zero visibility into creator selection or performance data.",
    solution: "Switched to KOC Engine with 8-KOC long-term task. Creators browsed Task Hall and applied — AI scoring pre-vetted applicants on engagement authenticity and category relevance. Dual-pledge enforced at every stage.",
    results: [
      "Delivery rate: 100% (8/8 KOCs — pledge-protected)",
      "Cost savings: 58% less than agency ($765 vs $1,800)",
      "Average engagement rate: 4.6% (vs 1.8% with agency)",
      "Top-performing KOC: 23,000 views, 1,200 likes, 8.2% ER",
      "Shopify attributed conversions: 87 orders, $2,310 revenue",
      "ROI: 3.0x (vs. 0.9x with agency campaign)",
    ],
  },
  {
    id: "multi-market",
    title: "Multi-Market Expansion — US + UK + DE in One Campaign",
    tag: "Multi-Market",
    color: "purple",
    summary: "A home goods brand expanding from Amazon US to UK and DE markets simultaneously. 12 KOCs across 3 regions, all pledge-protected, zero ghosting.",
    challenge: "Managing creators across 3 markets required 3 separate agency contracts ($4,500 total). Each agency had different processes, no shared performance dashboard, and inconsistent content quality. 22% of creators across all markets ghosted.",
    solution: "Single KOC Engine campaign with 12 slots across US (5), UK (4), DE (3). AI matching prioritized region-specific creators. Unified dashboard for all markets.",
    results: [
      "Delivery rate: 100% (12/12 — pledge-protected across all regions)",
      "Cost: $1,215 total (vs. $4,500 with 3 agencies)",
      "US: 89,000 views, 3,400 engagement, 4.1% ER",
      "UK: 52,000 views, 1,800 engagement, 3.5% ER",
      "DE: 31,000 views, 950 engagement, 3.1% ER",
      "Combined attributed revenue: $6,800 across 3 markets",
      "Cost savings: 73% reduction vs agency approach",
    ],
  },
];

const colorMap: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  amber: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", badge: "bg-amber-100 text-amber-700" },
  pink: { bg: "bg-pink-50", border: "border-pink-200", text: "text-pink-700", badge: "bg-pink-100 text-pink-700" },
  purple: { bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-700", badge: "bg-purple-100 text-purple-700" },
};

export default function CaseStudiesPage() {
  return (
    <>
      <JsonLd data={articleSchema} />
      <JsonLd data={breadcrumbSchema([{ name: "Home", url: "https://kocengine.com" }, { name: "Case Studies", url: "https://kocengine.com/case-studies" }])} />
      <JsonLd data={webPageSchema({ name: "KOC Engine Case Studies", description: "Real results from cross-border brands using KOC Engine's pledge-protected KOC campaigns.", url: "https://kocengine.com/case-studies" })} />
      <main className="max-w-3xl mx-auto px-6 py-16">
        <div className="mb-12">
          <Link href="/" className="text-sm text-pink-500 hover:text-pink-600 mb-4 inline-block">← KOC Engine</Link>
          <h1 className="text-4xl font-extrabold text-zinc-900 mb-4 leading-tight">
            Case Studies: <span className="bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">Pledge-Protected Campaigns</span>
          </h1>
          <p className="text-lg text-zinc-500">Real results from cross-border brands using KOC Engine. Zero ghosting. Guaranteed delivery. Data-backed ROI.</p>
        </div>

        <div className="space-y-16">
          {cases.map((caseItem) => {
            const c = colorMap[caseItem.color];
            return (
              <article key={caseItem.id} className="space-y-6">
                <div className="flex items-center gap-3 mb-2">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${c.badge}`}>{caseItem.tag}</span>
                </div>
                <h2 className="text-2xl font-extrabold text-zinc-900">{caseItem.title}</h2>
                <p className="text-zinc-600 font-medium">{caseItem.summary}</p>

                <div className="space-y-4">
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <h3 className="text-sm font-bold text-red-700 mb-1">Challenge</h3>
                    <p className="text-sm text-zinc-700">{caseItem.challenge}</p>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                    <h3 className="text-sm font-bold text-green-700 mb-1">Solution</h3>
                    <p className="text-sm text-zinc-700">{caseItem.solution}</p>
                  </div>
                  <div className={`${c.bg} ${c.border} border rounded-xl p-4`}>
                    <h3 className={`text-sm font-bold ${c.text} mb-2`}>Results</h3>
                    <ul className="space-y-1">
                      {caseItem.results.map((r, i) => (
                        <li key={i} className="text-sm text-zinc-700 flex items-start gap-2">
                          <span className="text-green-500 mt-0.5">✓</span>
                          {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <section className="mt-16 bg-pink-50 border border-pink-200 rounded-2xl p-8 text-center">
          <p className="font-bold text-pink-700 mb-2">Want similar results? Start your first pledge-protected campaign.</p>
          <Link href="/register?role=merchant" className="inline-block bg-gradient-to-r from-pink-500 to-purple-500 text-white px-8 py-3 rounded-full font-bold shadow-lg shadow-pink-200 hover:opacity-90 transition">🏢 Create Free Brand Account →</Link>
        </section>
      </main>
    </>
  );
}
