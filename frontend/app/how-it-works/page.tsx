import type { Metadata } from "next";
import Link from "next/link";
import JsonLd from "@/components/JsonLd";
import { howToSchema, breadcrumbSchema, webPageSchema } from "@/lib/schema";

export const metadata: Metadata = {
  title: "How KOC Engine Works — Dual-Pledge Escrow for Fair Creator Collaboration",
  description: "See how KOC Engine's 5-step workflow ensures both brands and creators deliver. AI matching + bidirectional pledge escrow + SLA enforcement. No ghosting, no guesswork.",
  alternates: { canonical: "/how-it-works" },
};

const steps = [
  {
    name: "Brand Publishes a Task",
    text: "Brand selects a product, sets commission (20-50pt per KOC), chooses task type (urgent or long-term), and pre-pays the full commission pool into escrow. A 5pt platform service fee is charged per task. The task goes live in the KOC task hall immediately.",
  },
  {
    name: "AI Matches or KOC Browses",
    text: "KOC Engine's AI matching engine scores creators across 7 dimensions: niche category, tier, trust score, region, content quality, collaboration history, and performance. Urgent tasks auto-match the top-ranked KOC. Long-term tasks stay in the task hall where KOCs can browse, filter, and apply.",
  },
  {
    name: "KOC Accepts & Pledges",
    text: "When a KOC accepts a task, they deposit a fixed 10pt ($10) pledge from their bonus balance. This pledge is the KOC's skin in the game — it proves they're serious about delivering. The pledge is fully returned as bonus on successful completion.",
  },
  {
    name: "Both Sides Deliver Under SLA",
    text: "Strict deadlines are enforced: Brand must ship the product within 48 hours. KOC must submit content within 14 days of receiving the product. Brand has 4 days to review. Every step is tracked and timestamped. Missed deadlines trigger automatic breach penalties.",
  },
  {
    name: "Content Approved & Paid",
    text: "Brand reviews submitted content. On approval: 90% of commission goes to KOC as withdrawable earnings, 10% goes to platform as service fee, KOC's 10pt pledge is returned as bonus. If brand rejects, KOC gets one revision chance. If brand rejects twice, AI (DeepSeek v4) judges the content impartially. If KOC ghosts, commission returns to brand and pledge is forfeited.",
  },
];

export default function HowItWorksPage() {
  return (
    <>
      <JsonLd data={howToSchema({ name: "How KOC Engine Works", description: "5-step dual-pledge workflow for fair creator-brand collaboration.", steps })} />
      <JsonLd data={breadcrumbSchema([{ name: "Home", url: "https://kocengine.com" }, { name: "How It Works", url: "https://kocengine.com/how-it-works" }])} />
      <JsonLd data={webPageSchema({ name: "How KOC Engine Works", description: "5-step dual-pledge workflow for fair creator-brand collaboration.", url: "https://kocengine.com/how-it-works" })} />
      <main className="max-w-3xl mx-auto px-6 py-16">
        <div className="mb-12">
          <Link href="/" className="text-sm text-pink-500 hover:text-pink-600 mb-4 inline-block">← KOC Engine</Link>
          <h1 className="text-4xl font-extrabold text-zinc-900 mb-4 leading-tight">
            How <span className="bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">KOC Engine</span> Works
          </h1>
          <p className="text-lg text-zinc-500">Five steps from task creation to content delivery — with economic guarantees at every step.</p>
        </div>

        {/* The Pledge Economy */}
        <section className="mb-16 bg-gradient-to-r from-pink-50 to-purple-50 border border-pink-200 rounded-2xl p-8">
          <h2 className="text-xl font-extrabold text-pink-900 mb-3">🔐 The Pledge Economy</h2>
          <p className="text-pink-800 mb-4">
            KOC Engine is the only platform with <strong>bidirectional pledge escrow</strong>. Both sides have skin in the game:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="bg-white rounded-xl p-4">
              <p className="font-bold text-purple-700 mb-1">Brand commits</p>
              <p className="text-zinc-600">Pre-pays the full commission pool into escrow — non-refundable once a KOC accepts. No backing out.</p>
            </div>
            <div className="bg-white rounded-xl p-4">
              <p className="font-bold text-pink-700 mb-1">KOC commits</p>
              <p className="text-zinc-600">Deposits 10pt ($10) pledge per task — forfeited if they ghost. Returned on successful completion.</p>
            </div>
          </div>
          <p className="text-sm text-pink-700 mt-4 font-medium">
            Result: ghosting drops from 30-40% (industry average) to &lt;1% on KOC Engine.
          </p>
        </section>

        {/* 5-Step Flow */}
        <section className="mb-16">
          <h2 className="text-2xl font-extrabold text-zinc-900 mb-8">The 5-Step Workflow</h2>
          <div className="space-y-6">
            {steps.map((step, i) => (
              <div key={i} className="flex gap-5">
                <div className="flex flex-col items-center shrink-0">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 text-white flex items-center justify-center font-extrabold text-sm">{i + 1}</div>
                  {i < steps.length - 1 && <div className="w-0.5 flex-1 bg-gradient-to-b from-pink-300 to-purple-300 mt-2" />}
                </div>
                <div className="pb-8 flex-1">
                  <h3 className="text-lg font-bold text-zinc-900 mb-2">{step.name}</h3>
                  <p className="text-zinc-600 text-sm leading-relaxed">{step.text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* SLA Timeline */}
        <section className="mb-16">
          <h2 className="text-2xl font-extrabold text-zinc-900 mb-6">⏱️ SLA Timeline</h2>
          <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
            {[
              { deadline: "48 hours", action: "Brand ships product", breach: "Commission forfeited to platform, KOC pledge refunded" },
              { deadline: "14 days", action: "KOC submits content (from delivery)", breach: "Commission refunded to brand, pledge forfeited" },
              { deadline: "4 days", action: "Brand reviews content", breach: "Auto-approved if no action taken" },
              { deadline: "3 days", action: "KOC revision (if rejected)", breach: "AI judgment triggered" },
            ].map(({ deadline, action, breach }) => (
              <div key={action} className="flex items-start gap-4 p-4 border-b border-zinc-100 last:border-0">
                <div className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-xs font-bold shrink-0 min-w-[90px] text-center">{deadline}</div>
                <div className="flex-1">
                  <p className="font-medium text-zinc-800 text-sm">{action}</p>
                  <p className="text-xs text-zinc-400 mt-0.5">Breach: {breach}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Trust Signals */}
        <section className="mb-12">
          <h2 className="text-2xl font-extrabold text-zinc-900 mb-6">🛡️ Built-in Trust Mechanisms</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { title: "Trust Score + Tier", desc: "Every user has a behavioral reputation score (M1-M3 for brands, L1-L3 for KOCs). Affects matching priority, task visibility, and pledge requirements." },
              { title: "AI Content Judgment", desc: "When brand and KOC disagree on content quality, DeepSeek v4 analyzes the content impartially. No human bias, no favoritism." },
              { title: "Red Line Protection", desc: "7 behavioral detection rules monitor for fraud patterns — speed anomalies, repeat pairs, IP correlation. Automated symmetric enforcement for both sides." },
              { title: "Transparent Economics", desc: "Every fee, every commission split, every forfeiture rule is published. No hidden costs. Full P&L breakdown available on the Pricing page." },
            ].map(({ title, desc }) => (
              <div key={title} className="bg-white border border-zinc-200 rounded-xl p-5">
                <h3 className="font-bold text-zinc-900 mb-2">{title}</h3>
                <p className="text-sm text-zinc-500">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="bg-gradient-to-r from-pink-50 to-purple-50 border border-pink-200 rounded-2xl p-8 text-center">
          <p className="font-bold text-pink-700 mb-2">Ready to experience fair creator collaboration?</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/register?role=merchant" className="inline-block bg-gradient-to-r from-pink-500 to-purple-500 text-white px-8 py-3 rounded-full font-bold shadow-lg shadow-pink-200 hover:opacity-90 transition">
              🏢 Create Brand Account →
            </Link>
            <Link href="/register?role=koc" className="inline-block bg-white text-zinc-900 border-2 border-zinc-200 hover:border-pink-300 px-8 py-3 rounded-full font-bold transition">
              🎬 Join as Creator →
            </Link>
          </div>
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
