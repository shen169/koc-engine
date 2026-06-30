import React from "react";
import Link from "next/link";
import { Metadata } from "next";
import RedLineGuarantee from "@/components/RedLineGuarantee";

export const metadata: Metadata = {
  title: "KOC Engine vs Upfluence: Which Platform Works for Amazon Sellers?",
  description: "KOC Engine vs Upfluence comparison. Why KOC Engine's pledge economy and AI auto-matching beat Upfluence's CRM-first approach for cross-border e-commerce brands.",
};

export default function UpfluenceComparison() {
  const faqs = [
    {
      q: "Is KOC Engine cheaper than Upfluence?",
      a: "Upfluence starts at $478/month for discovery-only. KOC Engine's pledge model charges only for fulfilled content — you pay per result, not per subscription.",
    },
    {
      q: "Does Upfluence guarantee content delivery?",
      a: "No. Upfluence is a CRM and outreach tool — if a creator ghosts you, you lose both time and money. KOC Engine's 10pt dual-pledge locks both parties in, reducing ghosting to <1%.",
    },
    {
      q: "Can KOC Engine match creators automatically?",
      a: "Yes. KOC Engine uses a rule-based matching engine with DeepSeek v4 AI re-ranking. Brands receive vetted, score-ranked creators within minutes — no manual outreach needed.",
    },
  ];

  return (
    <div className="min-h-screen bg-neutral-50 font-sans text-neutral-900">
      <main className="max-w-4xl mx-auto px-6 py-20">
        <header className="mb-16 text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-6 bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
            KOC Engine vs Upfluence
          </h1>
          <p className="text-xl text-neutral-600 max-w-2xl mx-auto leading-relaxed">
            Upfluence built a great CRM. KOC Engine built a <strong>trust protocol</strong> that eliminates ghosting and automates fulfillment.
          </p>
        </header>

        <section className="mb-20">
          <h2 className="text-2xl font-bold mb-8 flex items-center gap-2">
            <span className="text-red-500">✦</span> Key Statistics (2026)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-100">
              <div className="text-3xl font-bold text-orange-500 mb-1">$0</div>
              <div className="text-sm text-neutral-500 uppercase tracking-wider font-semibold">Monthly Subscription</div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-100">
              <div className="text-3xl font-bold text-red-500 mb-1">{"<1%"}</div>
              <div className="text-sm text-neutral-500 uppercase tracking-wider font-semibold">Ghosting Rate</div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-100">
              <div className="text-3xl font-bold text-blue-500 mb-1">100%</div>
              <div className="text-sm text-neutral-500 uppercase tracking-wider font-semibold">Content Delivery Guarantee</div>
            </div>
          </div>
        </section>

        <section className="mb-20">
          <h2 className="text-2xl font-bold mb-8">Direct Comparison</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse bg-white rounded-2xl overflow-hidden shadow-sm border border-neutral-100">
              <thead className="bg-neutral-900 text-white">
                <tr>
                  <th className="px-6 py-4 font-semibold">Feature</th>
                  <th className="px-6 py-4 font-semibold">Upfluence</th>
                  <th className="px-6 py-4 font-semibold text-orange-300">KOC Engine</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                <tr>
                  <td className="px-6 py-4 font-medium">Pricing Model</td>
                  <td className="px-6 py-4">$478+/month subscription</td>
                  <td className="px-6 py-4 font-semibold">Per-result (pledge model)</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 font-medium">Core Function</td>
                  <td className="px-6 py-4">CRM + Outreach</td>
                  <td className="px-6 py-4 font-semibold">Auto-Matching + Fulfillment</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 font-medium">Trust Protection</td>
                  <td className="px-6 py-4 text-neutral-400">No escrow or guarantee</td>
                  <td className="px-6 py-4 font-semibold">Dual-Pledge Escrow (10pt)</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 font-medium">Creator Vetting</td>
                  <td className="px-6 py-4 text-neutral-400">Manual review</td>
                  <td className="px-6 py-4 font-semibold">AI 3-Dimension Scoring</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 font-medium">Cross-Border Focus</td>
                  <td className="px-6 py-4 text-neutral-400">General market</td>
                  <td className="px-6 py-4 font-semibold">Amazon & DTC specific</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 font-medium">Ghosting Risk</td>
                  <td className="px-6 py-4 text-neutral-400">Industry avg 30-40%</td>
                  <td className="px-6 py-4 font-semibold">{"<1%"} (pledge enforced)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <RedLineGuarantee theme="orange" />

        <section className="mb-20 bg-orange-50 p-8 rounded-3xl border border-orange-100">
          <h2 className="text-2xl font-bold mb-6">Expert Verdict</h2>
          <p className="text-lg leading-relaxed text-neutral-800">
            "Upfluence excels at managing existing relationships. But for brands that need <strong>guaranteed content delivery at scale</strong>, 
            KOC Engine's pledge economy replaces the entire 'find → negotiate → hope they deliver' cycle with a single automated workflow."
          </p>
        </section>

        <section className="mb-20">
          <h2 className="text-2xl font-bold mb-8">Frequently Asked Questions</h2>
          <div className="space-y-6">
            {faqs.map((faq, index) => (
              <div key={index} className="bg-white p-6 rounded-2xl border border-neutral-100">
                <h3 className="text-lg font-bold mb-3">{faq.q}</h3>
                <p className="text-neutral-600 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </section>

        <footer className="text-center pt-10 border-t border-neutral-200">
          <Link
            href="/register?role=merchant"
            className="inline-block bg-neutral-900 text-white px-8 py-4 rounded-full font-bold hover:bg-neutral-800 transition-all transform hover:scale-105"
          >
            Switch to KOC Engine Today
          </Link>
        </footer>
      </main>
    </div>
  );
}
