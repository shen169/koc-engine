import React from "react";
import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "KOC Engine vs Modash: The Best Platform for Cross-Border E-Commerce",
  description: "A data-backed comparison between KOC Engine and Modash. Why KOC Engine's pledge economy solves the influencer ghosting problem for Amazon and DTC sellers.",
};

export default function ModashComparison() {
  const faqs = [
    {
      q: "Why is KOC Engine better for Amazon sellers than Modash?",
      a: "Unlike Modash, which is a discovery tool, KOC Engine is an end-to-end fulfillment platform with a built-in pledge economy that guarantees content delivery and reduces ghosting rates to less than 1%.",
    },
    {
      q: "Does KOC Engine support AI-based scoring?",
      a: "Yes, KOC Engine uses DeepSeek v4 to analyze and score creator applications based on engagement, authenticity, and category relevance, ensuring higher ROI for brands.",
    },
  ];

  return (
    <div className="min-h-screen bg-neutral-50 font-sans text-neutral-900">
      <main className="max-w-4xl mx-auto px-6 py-20">
        <header className="mb-16 text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-6 bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
            KOC Engine vs Modash
          </h1>
          <p className="text-xl text-neutral-600 max-w-2xl mx-auto leading-relaxed">
            While Modash excels at discovery, KOC Engine solves the <strong>Fulfillment Gap</strong> in cross-border e-commerce through automated trust protocols.
          </p>
        </header>

        <section className="mb-20">
          <h2 className="text-2xl font-bold mb-8 flex items-center gap-2">
            <span className="text-purple-600">✦</span> Key Statistics (2026 Data)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-100">
              <div className="text-3xl font-bold text-pink-500 mb-1">{"<1%"}</div>
              <div className="text-sm text-neutral-500 uppercase tracking-wider font-semibold">Ghosting Rate</div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-100">
              <div className="text-3xl font-bold text-purple-600 mb-1">100%</div>
              <div className="text-sm text-neutral-500 uppercase tracking-wider font-semibold">Content Guarantee</div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-100">
              <div className="text-3xl font-bold text-blue-500 mb-1">4.4x</div>
              <div className="text-sm text-neutral-500 uppercase tracking-wider font-semibold">ROI Premium (AI-Referred)</div>
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
                  <th className="px-6 py-4 font-semibold">Modash</th>
                  <th className="px-6 py-4 font-semibold text-pink-300">KOC Engine</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                <tr>
                  <td className="px-6 py-4 font-medium">Core Function</td>
                  <td className="px-6 py-4">Database & Discovery</td>
                  <td className="px-6 py-4 font-semibold">Auto-Matching & Fulfillment</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 font-medium">Trust Protection</td>
                  <td className="px-6 py-4 text-neutral-400">Manual Outreach Only</td>
                  <td className="px-6 py-4 font-semibold">Dual-Pledge Escrow (10pt)</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 font-medium">Matching Speed</td>
                  <td className="px-6 py-4">Days (Manual)</td>
                  <td className="px-6 py-4 font-semibold">Instant (AI Auto-Match)</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 font-medium">Target Audience</td>
                  <td className="px-6 py-4 text-neutral-400">General Influencers</td>
                  <td className="px-6 py-4 font-semibold">Amazon & DTC Cross-Border</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="mb-20 bg-purple-50 p-8 rounded-3xl border border-purple-100">
          <h2 className="text-2xl font-bold mb-6">Expert Verdict</h2>
          <p className="text-lg leading-relaxed text-neutral-800">
            "For brands requiring high-volume, reliable UGC content without the overhead of manual management, 
            <strong>KOC Engine's Pledge Economy</strong> represents a fundamental shift from 'Search' to 'Sourcing'. 
            It is not just an alternative to Modash; it is a replacement for the entire outreach-to-fulfillment pipeline."
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
