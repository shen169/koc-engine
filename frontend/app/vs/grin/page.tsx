import React from "react";
import Link from "next/link";
import { Metadata } from "next";
import RedLineGuarantee from "@/components/RedLineGuarantee";

export const metadata: Metadata = {
  title: "KOC Engine vs GRIN: Why Pledge Economy Beats Manual Creator Management",
  description: "KOC Engine vs GRIN comparison for e-commerce brands. GRIN requires manual outreach and Shopify dependency. KOC Engine auto-matches with pledge protection.",
  alternates: { canonical: "/vs/grin" },
};

export default function GrinComparison() {
  const faqs = [
    {
      q: "Is KOC Engine better than GRIN for Amazon sellers?",
      a: "Yes. GRIN is Shopify-centric and requires manual creator outreach. KOC Engine auto-matches vetted creators with AI scoring and guarantees delivery through the 10pt pledge economy.",
    },
    {
      q: "Does GRIN protect against creator ghosting?",
      a: "No. GRIN relies on relationship management — if a creator stops responding, you have no recourse. KOC Engine's dual-pledge escrow locks both parties financially, making ghosting economically irrational.",
    },
    {
      q: "Can I use KOC Engine without Shopify?",
      a: "Yes. KOC Engine is platform-agnostic. It works for Amazon, DTC stores, independent sites, and any cross-border e-commerce channel.",
    },
  ];

  return (
    <div className="min-h-screen bg-neutral-50 font-sans text-neutral-900">
      <main className="max-w-4xl mx-auto px-6 py-20">
        <header className="mb-16 text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-6 bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">
            KOC Engine vs GRIN
          </h1>
          <p className="text-xl text-neutral-600 max-w-2xl mx-auto leading-relaxed">
            GRIN is the Shopify-native incumbent. KOC Engine is the <strong>cross-border trust protocol</strong> that works everywhere.
          </p>
        </header>

        <section className="mb-20">
          <h2 className="text-2xl font-bold mb-8 flex items-center gap-2">
            <span className="text-emerald-500">✦</span> Key Statistics (2026)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-100">
              <div className="text-3xl font-bold text-emerald-500 mb-1">0</div>
              <div className="text-sm text-neutral-500 uppercase tracking-wider font-semibold">Shopify Dependency</div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-100">
              <div className="text-3xl font-bold text-teal-500 mb-1">{"<1%"}</div>
              <div className="text-sm text-neutral-500 uppercase tracking-wider font-semibold">Ghosting Rate</div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-100">
              <div className="text-3xl font-bold text-blue-500 mb-1">4.4x</div>
              <div className="text-sm text-neutral-500 uppercase tracking-wider font-semibold">AI-Referred ROI Premium</div>
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
                  <th className="px-6 py-4 font-semibold">GRIN</th>
                  <th className="px-6 py-4 font-semibold text-emerald-300">KOC Engine</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                <tr>
                  <td className="px-6 py-4 font-medium">Platform Dependency</td>
                  <td className="px-6 py-4">Shopify only</td>
                  <td className="px-6 py-4 font-semibold">Platform-agnostic</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 font-medium">Creator Discovery</td>
                  <td className="px-6 py-4">Manual search + import</td>
                  <td className="px-6 py-4 font-semibold">AI Auto-Match + Re-ranking</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 font-medium">Trust Protection</td>
                  <td className="px-6 py-4 text-neutral-400">Relationship-based</td>
                  <td className="px-6 py-4 font-semibold">Dual-Pledge Escrow (10pt)</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 font-medium">Target Market</td>
                  <td className="px-6 py-4 text-neutral-400">DTC / Shopify brands</td>
                  <td className="px-6 py-4 font-semibold">Amazon + Cross-Border</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 font-medium">Ghosting Risk</td>
                  <td className="px-6 py-4 text-neutral-400">No guarantee</td>
                  <td className="px-6 py-4 font-semibold">{"<1%"} (pledge enforced)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <RedLineGuarantee theme="emerald" />

        <section className="mb-20 bg-emerald-50 p-8 rounded-3xl border border-emerald-100">
          <h2 className="text-2xl font-bold mb-6">Expert Verdict</h2>
          <p className="text-lg leading-relaxed text-neutral-800">
            "GRIN's Shopify dependency limits it to a single channel. For brands operating across Amazon, independent sites, and cross-border markets, 
            <strong>KOC Engine's pledge economy</strong> provides a universal trust layer that GRIN simply cannot offer."
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
