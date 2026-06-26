import React from "react";
import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Amazon Influencer Program Alternatives: KOC Engine vs Amazon's Native Program",
  description: "Comparing Amazon Influencer Program with KOC Engine. Why KOC Engine's pledge economy and AI matching deliver higher ROI for cross-border Amazon sellers.",
};

export default function AmazonInfluencerAlternative() {
  const faqs = [
    {
      q: "Is KOC Engine better than the Amazon Influencer Program?",
      a: "The Amazon Influencer Program is invite-only, limited to Amazon storefronts, and offers no trust protection. KOC Engine provides open access, cross-platform content, and a 10pt pledge that guarantees delivery.",
    },
    {
      q: "Can Amazon sellers use KOC Engine alongside the Influencer Program?",
      a: "Yes. KOC Engine complements Amazon's native program by sourcing creators who produce off-platform UGC (TikTok, Instagram, YouTube) that drives external traffic — which also improves your Amazon search ranking via the External Traffic Attribution loop.",
    },
    {
      q: "How does KOC Engine prevent ghosting compared to Amazon Influencer?",
      a: "Amazon's program has no escrow — creators can post low-quality content or ghost with zero consequence. KOC Engine's dual-pledge locks both parties: creators forfeit 10pt if they fail to deliver, and brands get a full refund if content doesn't meet SLA.",
    },
  ];

  return (
    <div className="min-h-screen bg-neutral-50 font-sans text-neutral-900">
      <main className="max-w-4xl mx-auto px-6 py-20">
        <header className="mb-16 text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-6 bg-gradient-to-r from-amber-500 to-yellow-500 bg-clip-text text-transparent">
            Amazon Influencer Program Alternatives
          </h1>
          <p className="text-xl text-neutral-600 max-w-2xl mx-auto leading-relaxed">
            The Amazon Influencer Program is exclusive and limited. <strong>KOC Engine</strong> is open, cross-platform, and trust-guaranteed.
          </p>
        </header>

        <section className="mb-20">
          <h2 className="text-2xl font-bold mb-8 flex items-center gap-2">
            <span className="text-amber-500">✦</span> Why Sellers Look for Alternatives (2026 Data)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-100">
              <div className="text-3xl font-bold text-amber-500 mb-1">Invite-Only</div>
              <div className="text-sm text-neutral-500 uppercase tracking-wider font-semibold">Amazon Program Access</div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-100">
              <div className="text-3xl font-bold text-yellow-500 mb-1">30-40%</div>
              <div className="text-sm text-neutral-500 uppercase tracking-wider font-semibold">Typical Ghosting Rate</div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-100">
              <div className="text-3xl font-bold text-blue-500 mb-1">1 Platform</div>
              <div className="text-sm text-neutral-500 uppercase tracking-wider font-semibold">Content Channel Limit</div>
            </div>
          </div>
        </section>

        <section className="mb-20">
          <h2 className="text-2xl font-bold mb-8">Amazon Influencer Program vs KOC Engine</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse bg-white rounded-2xl overflow-hidden shadow-sm border border-neutral-100">
              <thead className="bg-neutral-900 text-white">
                <tr>
                  <th className="px-6 py-4 font-semibold">Feature</th>
                  <th className="px-6 py-4 font-semibold">Amazon Influencer</th>
                  <th className="px-6 py-4 font-semibold text-amber-300">KOC Engine</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                <tr>
                  <td className="px-6 py-4 font-medium">Access Model</td>
                  <td className="px-6 py-4">Invite-only (3,000+ followers)</td>
                  <td className="px-6 py-4 font-semibold">Open application + AI vetting</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 font-medium">Content Platform</td>
                  <td className="px-6 py-4">Amazon storefront only</td>
                  <td className="px-6 py-4 font-semibold">Multi-platform (TikTok, IG, YT)</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 font-medium">Trust Protection</td>
                  <td className="px-6 py-4 text-neutral-400">No escrow or guarantee</td>
                  <td className="px-6 py-4 font-semibold">Dual-Pledge Escrow (10pt)</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 font-medium">Creator Quality</td>
                  <td className="px-6 py-4 text-neutral-400">Self-reported</td>
                  <td className="px-6 py-4 font-semibold">AI 3D Scoring (DeepSeek v4)</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 font-medium">Ghosting Risk</td>
                  <td className="px-6 py-4 text-neutral-400">Industry average 30-40%</td>
                  <td className="px-6 py-4 font-semibold">{"<1%"} (pledge enforced)</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 font-medium">External Traffic Attribution</td>
                  <td className="px-6 py-4 text-neutral-400">Not designed for this</td>
                  <td className="px-6 py-4 font-semibold">Built for Amazon Brand Referral Bonus</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="mb-20 bg-amber-50 p-8 rounded-3xl border border-amber-100">
          <h2 className="text-2xl font-bold mb-6">Expert Verdict</h2>
          <p className="text-lg leading-relaxed text-neutral-800">
            "Amazon's Influencer Program is a walled garden. KOC Engine breaks that wall by sourcing <strong>cross-platform UGC</strong> that drives external traffic to Amazon — 
            which simultaneously qualifies you for Amazon's Brand Referral Bonus (10% commission credit). It's not an alternative; it's an upgrade."
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
            Start with KOC Engine
          </Link>
        </footer>
      </main>
    </div>
  );
}
