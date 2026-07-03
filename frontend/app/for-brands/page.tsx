import type { Metadata } from "next";
import Link from "next/link";
import JsonLd from "@/components/JsonLd";
import { breadcrumbSchema, webPageSchema } from "@/lib/schema";

export const metadata: Metadata = {
  title: "KOC Engine for Brands — Find & Collaborate with Vetted Creators",
  description: "AI-powered KOC matching for Amazon sellers, DTC brands, and cross-border e-commerce. Dual-pledge escrow guarantees content delivery. No monthly fees — pay per result.",
  alternates: { canonical: "/for-brands" },
};

export default function ForBrandsPage() {
  return (
    <>
      <JsonLd data={breadcrumbSchema([{ name: "Home", url: "https://kocengine.com" }, { name: "For Brands", url: "https://kocengine.com/for-brands" }])} />
      <JsonLd data={webPageSchema({ name: "KOC Engine for Brands", description: "AI-powered KOC matching for cross-border e-commerce brands. Dual-pledge escrow guarantees content delivery.", url: "https://kocengine.com/for-brands" })} />
      <main className="max-w-3xl mx-auto px-6 py-16">
        <div className="mb-12">
          <Link href="/" className="text-sm text-pink-500 hover:text-pink-600 mb-4 inline-block">← KOC Engine</Link>
          <h1 className="text-4xl font-extrabold text-zinc-900 mb-4 leading-tight">
            Find Creators Who <span className="bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">Actually Deliver</span>
          </h1>
          <p className="text-lg text-zinc-500">
            Stop chasing creators in DMs. Post a task, set your commission, and let AI matching + pledge escrow do the rest.
          </p>
        </div>

        {/* Pain Points */}
        <section className="mb-16">
          <h2 className="text-2xl font-extrabold text-zinc-900 mb-6">The Hard Truth About KOC Marketing</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {[
              { emoji: "👻", title: "30-40% Ghosting Rate", desc: "Creators take free products and disappear. No content, no accountability, no refund. You lose product cost + shipping + weeks of waiting." },
              { emoji: "🔍", title: "Manual Outreach Doesn't Scale", desc: "Finding creators, DMing, negotiating, tracking — a single campaign can eat 20+ hours. CRM tools help you organize, but they don't guarantee delivery." },
              { emoji: "🌍", title: "Cross-Border Trust Gap", desc: "Different time zones, languages, and legal systems make enforcement nearly impossible. How do you hold a creator in another country accountable?" },
            ].map(({ emoji, title, desc }) => (
              <div key={title} className="bg-red-50 border border-red-100 rounded-xl p-5">
                <div className="text-2xl mb-2">{emoji}</div>
                <h3 className="font-bold text-red-800 text-sm mb-1">{title}</h3>
                <p className="text-xs text-red-700 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How KOC Engine Solves It */}
        <section className="mb-16">
          <h2 className="text-2xl font-extrabold text-zinc-900 mb-6">How KOC Engine Solves This</h2>
          <div className="space-y-4">
            {[
              { icon: "🤖", title: "AI Matching Across 7 Dimensions", desc: "Our matching engine scores creators by niche, tier, trust, region, content quality, history, and performance. Top matches ranked automatically. No manual searching." },
              { icon: "🔐", title: "Dual-Pledge Escrow", desc: "Both sides have skin in the game. You pre-pay the commission pool (held in escrow). KOC deposits a 10pt pledge. If KOC ghosts → you get your commission back. If you don't ship → KOC gets their pledge back." },
              { icon: "⚖️", title: "AI-Powered Dispute Resolution", desc: "If you and the KOC disagree on content quality, DeepSeek v4 judges impartially. No bias, no favoritism, no endless back-and-forth." },
              { icon: "📊", title: "Real-Time Performance Dashboard", desc: "Track every task: shipping status, content submission, SLA deadlines, commission breakdowns. Full transparency from post to payment." },
              { icon: "💸", title: "Pay Per Result, Not Per Month", desc: "No $299/mo subscription. $5 platform fee per task + 10% of commission on completion. Free trial: 100pt bonus (~2 test tasks)." },
              { icon: "🛡️", title: "Fraud Detection Built In", desc: "7 behavioral detection rules catch speed anomalies, repeat pairs, and IP correlation. Symmetric enforcement — same penalties apply to brands and KOCs." },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="flex gap-4 bg-white border border-zinc-200 rounded-xl p-5">
                <span className="text-2xl shrink-0">{icon}</span>
                <div>
                  <h3 className="font-bold text-zinc-900 mb-1">{title}</h3>
                  <p className="text-sm text-zinc-500 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Who Is This For */}
        <section className="mb-16">
          <h2 className="text-2xl font-extrabold text-zinc-900 mb-6">Built For</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { title: "Amazon Sellers", desc: "Need authentic product reviews and unboxing content. Tired of Amazon's closed influencer program." },
              { title: "DTC Brands", desc: "Want UGC content for ads, social proof, and product pages. Need creators who match your brand aesthetic." },
              { title: "Shopify Merchants", desc: "Looking for TikTok/Instagram creators to drive traffic. Want performance-based pricing, not upfront retainers." },
              { title: "Cross-Border Sellers", desc: "Selling from China to US/EU/SEA markets. Need local creators who understand the culture and audience." },
            ].map(({ title, desc }) => (
              <div key={title} className="bg-purple-50 border border-purple-100 rounded-xl p-5">
                <h3 className="font-bold text-purple-900 mb-1">{title}</h3>
                <p className="text-sm text-purple-700">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Comparison */}
        <section className="mb-16">
          <h2 className="text-2xl font-extrabold text-zinc-900 mb-6">KOC Engine vs. The Alternatives</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-200 p-3 text-left"></th>
                  <th className="border border-gray-200 p-3 text-left font-bold text-pink-600">KOC Engine</th>
                  <th className="border border-gray-200 p-3 text-left">Traditional Platforms</th>
                  <th className="border border-gray-200 p-3 text-left">Agencies / MCNs</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Pricing", "$5/task + 10% commission", "$299-$999/mo subscription", "$500-$2,000+ per campaign"],
                  ["Content Guarantee", "✅ Pledge escrow", "❌ No guarantee", "⚠️ Contract-dependent"],
                  ["Creator Discovery", "AI auto-matching", "Manual search + CRM", "Agency-curated"],
                  ["Fraud Protection", "✅ Automated detection", "❌ None", "⚠️ Manual review"],
                  ["Dispute Resolution", "AI judgment (impartial)", "Platform support ticket", "Agency mediation"],
                  ["Free Trial", "100pt bonus (~2 tasks)", "Usually 7-14 days", "None"],
                ].map(([label, koc, trad, agency]) => (
                  <tr key={label}>
                    <td className="border border-gray-200 p-3 font-medium text-zinc-700">{label}</td>
                    <td className="border border-gray-200 p-3 text-pink-700 font-medium">{koc}</td>
                    <td className="border border-gray-200 p-3 text-zinc-500">{trad}</td>
                    <td className="border border-gray-200 p-3 text-zinc-500">{agency}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-gradient-to-r from-pink-50 to-purple-50 border border-pink-200 rounded-2xl p-8 text-center">
          <p className="font-bold text-pink-700 mb-2">Stop paying for creators who ghost. Start paying for results.</p>
          <Link href="/register?role=merchant" className="inline-block bg-gradient-to-r from-pink-500 to-purple-500 text-white px-8 py-3 rounded-full font-bold shadow-lg shadow-pink-200 hover:opacity-90 transition">
            🏢 Create Free Brand Account — 100pt Trial →
          </Link>
          <p className="text-sm text-zinc-500 mt-3">
            No credit card required. <Link href="/pricing" className="text-pink-500 underline">See full pricing →</Link>
          </p>
        </section>

        <footer className="text-center text-sm text-zinc-400 pb-12 pt-8 border-t border-zinc-100 mt-12">
          <p>
            Questions? Contact admin:{" "}
            <a href="mailto:honghuishen24@gmail.com" className="text-pink-500 hover:text-pink-600 underline">honghuishen24@gmail.com</a>
          </p>
        </footer>
      </main>
    </>
  );
}
