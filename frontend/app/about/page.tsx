import type { Metadata } from "next";
import Link from "next/link";
import JsonLd from "@/components/JsonLd";

export const metadata: Metadata = {
  title: "About KOC Engine — Built by Cross-Border Sellers, for Cross-Border Sellers",
  description: "KOC Engine was founded by Jojo Shen, a cross-border e-commerce developer and operator. Learn about the team, mission, and the pledge economy that powers our platform.",
  alternates: { canonical: "/about" },
};

const personSchema = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: "Jojo Shen",
  url: "https://kocengine.com",
  sameAs: [
    "https://github.com/shen169",
    "https://reddit.com/user/shen169",
  ],
  jobTitle: "Founder & Product Lead",
  worksFor: {
    "@type": "Organization",
    name: "KOC Engine",
    url: "https://kocengine.com",
  },
  description: "Cross-border e-commerce developer and operator. Built TradeWise (agent API platform) and KOC Engine (KOC bilateral matching platform) to solve the trust gap in influencer marketing.",
};

const orgSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "KOC Engine",
  url: "https://kocengine.com",
  logo: "https://kocengine.com/favicon.ico",
  sameAs: [
    "https://github.com/shen169/koc-engine",
    "https://x.com/kocengine",
  ],
  foundingDate: "2026",
  description: "AI-powered bilateral matching platform for cross-border e-commerce KOC marketing. Dual-pledge escrow. Real-time performance tracking.",
};

export default function AboutPage() {
  return (
    <>
      <JsonLd data={personSchema} />
      <JsonLd data={orgSchema} />
      <main className="max-w-3xl mx-auto px-6 py-16">
        <div className="mb-12">
          <Link href="/" className="text-sm text-pink-500 hover:text-pink-600 mb-4 inline-block">← KOC Engine</Link>
          <h1 className="text-4xl font-extrabold text-zinc-900 mb-4 leading-tight">
            About <span className="bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">KOC Engine</span>
          </h1>
          <p className="text-lg text-zinc-500">Built by cross-border sellers who got tired of creators ghosting after receiving free products.</p>
        </div>

        <section className="mb-16">
          <h2 className="text-2xl font-extrabold text-zinc-900 mb-6">The Problem We Solved</h2>
          <div className="prose prose-zinc max-w-none space-y-4">
            <p>In cross-border e-commerce — Amazon, Shopify DTC, marketplace sellers — KOC (Key Opinion Consumer) marketing is the fastest-growing acquisition channel. But it has a fatal flaw:</p>
            <div className="bg-red-50 border border-red-200 rounded-2xl p-6 not-prose">
              <p className="text-lg font-bold text-red-700">30–40% of creators ghost after receiving free products.</p>
              <p className="text-sm text-red-600">No content, no accountability, no refund. The brand loses the product, shipping cost, and weeks of waiting time.</p>
            </div>
            <p>Existing platforms — Modash, Upfluence, GRIN — are discovery tools or CRM systems. They help you <em>find</em> creators, but they don't <em>guarantee delivery</em>. The trust gap between "outreach" and "fulfillment" remains unfilled.</p>
            <p>KOC Engine was built to close that gap.</p>
          </div>
        </section>

        <section className="mb-16">
          <h2 className="text-2xl font-extrabold text-zinc-900 mb-6">Our Solution: The Pledge Economy</h2>
          <div className="prose prose-zinc max-w-none space-y-4">
            <p>We introduced a <strong>bidirectional pledge (escrow) system</strong> that makes content delivery economically guaranteed:</p>
            <ul>
              <li><strong>KOC deposits 10pt ($10)</strong> on task acceptance — forfeited if they ghost</li>
              <li><strong>Merchant pre-pays commission pool</strong> — released to KOC only on approved delivery</li>
              <li><strong>SLA deadlines enforced by cron</strong> — 48h shipping, 14d content delivery, 4d review</li>
              <li><strong>AI content judgment</strong> — DeepSeek v4 resolves disputes when merchant and KOC disagree</li>
              <li><strong>Trust Score + Tier system</strong> — behavioral reputation that affects matching priority</li>
            </ul>
            <p>The result: ghosting rates drop from 30–40% to <strong>&lt;1%</strong>.</p>
          </div>
        </section>

        <section className="mb-16">
          <h2 className="text-2xl font-extrabold text-zinc-900 mb-6">Founder</h2>
          <div className="bg-gray-50 rounded-2xl p-6 not-prose">
            <div className="flex items-start gap-6">
              <div className="w-16 h-16 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-xl">JS</div>
              <div>
                <h3 className="text-xl font-bold text-zinc-900">Jojo Shen</h3>
                <p className="text-sm text-zinc-500 mb-2">Founder & Product Lead</p>
                <p className="text-zinc-700 mb-3">Cross-border e-commerce developer and operator. Previously built <strong>TradeWise</strong>, an agent API platform for Amazon sellers with 20+ independent AI agents for listing optimization, market analysis, and competitive intelligence.</p>
                <div className="flex gap-3 text-sm">
                  <a href="https://github.com/shen169" className="text-pink-500 hover:text-pink-600 font-semibold" target="_blank" rel="noopener">GitHub ↗</a>
                  <span className="text-zinc-300">|</span>
                  <a href="https://reddit.com/user/shen169" className="text-pink-500 hover:text-pink-600 font-semibold" target="_blank" rel="noopener">Reddit ↗</a>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mb-16">
          <h2 className="text-2xl font-extrabold text-zinc-900 mb-6">Tech Stack</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 not-prose">
            {[
              ["FastAPI + Python 3.12", "Backend"],
              ["Next.js 16 + React 19", "Frontend"],
              ["DeepSeek v4", "AI Scoring"],
              ["JSON + threading.Lock", "Storage"],
              ["bcrypt + PyJWT", "Auth"],
              ["Vercel + VPS", "Deploy"],
            ].map(([tech, label]) => (
              <div key={tech} className="bg-white border border-gray-100 rounded-xl p-4 text-center">
                <div className="text-sm font-bold text-zinc-900">{tech}</div>
                <div className="text-xs text-zinc-400">{label}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-extrabold text-zinc-900 mb-6">Open Source</h2>
          <div className="prose prose-zinc max-w-none">
            <p>KOC Engine is developed openly on GitHub. Our architecture, API design, and pledge economy logic are all documented in <a href="https://github.com/shen169/koc-engine" className="text-pink-500 hover:text-pink-600 font-semibold">shen169/koc-engine ↗</a>.</p>
            <p>We believe transparency builds trust — the same principle that powers our pledge economy.</p>
          </div>
        </section>

        <section className="bg-pink-50 border border-pink-200 rounded-2xl p-8 text-center">
          <p className="font-bold text-pink-700 mb-2">Want to learn more about how the pledge economy works?</p>
          <Link href="/guide/koc-marketing-cross-border-ecommerce" className="inline-block bg-gradient-to-r from-pink-500 to-purple-500 text-white px-8 py-3 rounded-full font-bold shadow-lg shadow-pink-200 hover:opacity-90 transition">Read the Complete Guide →</Link>
        </section>
      </main>
    </>
  );
}
