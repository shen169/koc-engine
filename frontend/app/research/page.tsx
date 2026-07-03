import type { Metadata } from "next";
import Link from "next/link";
import JsonLd from "@/components/JsonLd";
import { breadcrumbSchema, webPageSchema } from "@/lib/schema";

export const metadata: Metadata = {
  title: "Research — Trust in Creator Collaboration | KOC Engine",
  description: "KOC Engine Research Center. Data-driven insights on trust mechanisms, pledge economics, ghosting rates, and bilateral commitment in the creator economy.",
  alternates: { canonical: "/research" },
};

const researchTopics = [
  {
    title: "Trust & Ghosting in Creator Collaborations",
    status: "Coming Soon",
    description: "Industry analysis of ghosting rates (30-40%), root causes, and how bilateral escrow reduces breach rates to <1%. KOC Engine's unique pledge data will power this report.",
  },
  {
    title: "The Pledge Economy: Skin in the Game",
    status: "Coming Soon",
    description: "How bidirectional deposit mechanisms solve the commitment problem in two-sided marketplaces. Research on pledge amounts, forfeiture rates, and completion correlation.",
  },
  {
    title: "KOC Pricing & Commission Benchmarks",
    status: "Coming Soon",
    description: "What do brands actually pay for KOC content? Cross-category commission data from the KOC Engine platform: averages, ranges, and factors that drive higher pay.",
  },
  {
    title: "Nano Creator Economics",
    status: "Coming Soon",
    description: "How much do creators with 1K-10K followers actually earn? Earnings distribution, tier progression, and the path from first task to consistent income.",
  },
  {
    title: "Cross-Border Trust Mechanisms",
    status: "Coming Soon",
    description: "How do you enforce contracts across jurisdictions? Comparative analysis of escrow, smart contracts, reputation systems, and platform-mediated trust in international creator collaborations.",
  },
  {
    title: "AI vs. Human Dispute Resolution",
    status: "Coming Soon",
    description: "When brand and creator disagree on content quality, who should judge? Data on AI (DeepSeek v4) judgment outcomes, decision consistency, and user satisfaction vs. traditional support-mediated disputes.",
  },
];

export default function ResearchPage() {
  return (
    <>
      <JsonLd data={breadcrumbSchema([{ name: "Home", url: "https://kocengine.com" }, { name: "Research", url: "https://kocengine.com/research" }])} />
      <JsonLd data={webPageSchema({ name: "Research — Trust in Creator Collaboration", description: "KOC Engine Research Center. Data-driven insights on trust, pledge economics, and creator economy trends.", url: "https://kocengine.com/research" })} />
      <main className="max-w-3xl mx-auto px-6 py-16">
        <div className="mb-12">
          <Link href="/" className="text-sm text-pink-500 hover:text-pink-600 mb-4 inline-block">← KOC Engine</Link>
          <h1 className="text-4xl font-extrabold text-zinc-900 mb-4 leading-tight">
            <span className="bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">Research</span> Center
          </h1>
          <p className="text-lg text-zinc-500">
            Data-driven insights on trust mechanisms, pledge economics, ghosting rates, and bilateral commitment in the creator economy.
          </p>
        </div>

        {/* Mission Statement */}
        <section className="mb-12 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-2xl p-8">
          <h2 className="text-xl font-extrabold text-purple-900 mb-3">Why We Research Trust</h2>
          <p className="text-purple-800 leading-relaxed">
            The creator economy's biggest bottleneck isn't discovery — it's <strong>trust</strong>. Brands can find creators. Creators can find brands. But 30-40% of collaborations fail because neither side has skin in the game. KOC Engine was built to solve this, and our research center publishes the data to prove it.
          </p>
          <p className="text-sm text-purple-600 mt-3">
            Every report is powered by real platform data — anonymized and aggregated. No surveys, no estimates, no marketing fluff.
          </p>
        </section>

        {/* Research Topics */}
        <section className="mb-12">
          <h2 className="text-2xl font-extrabold text-zinc-900 mb-6">Research Reports</h2>
          <div className="space-y-4">
            {researchTopics.map(({ title, status, description }) => (
              <div key={title} className="bg-white border border-zinc-200 rounded-xl p-5 opacity-75">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-zinc-800 mb-1">{title}</h3>
                    <p className="text-sm text-zinc-500 leading-relaxed">{description}</p>
                  </div>
                  <span className="text-xs font-medium bg-amber-100 text-amber-700 px-3 py-1 rounded-full whitespace-nowrap shrink-0">{status}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Methodology */}
        <section className="mb-12">
          <h2 className="text-2xl font-extrabold text-zinc-900 mb-6">Our Research Standards</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { icon: "📊", title: "Real Platform Data", desc: "All statistics come from actual KOC Engine transactions — not surveys, not third-party estimates, not scraped data." },
              { icon: "🔒", title: "Anonymized & Aggregated", desc: "Individual user data is never exposed. All research uses aggregated statistics with minimum sample size thresholds." },
              { icon: "📅", title: "Regularly Updated", desc: "Reports are living documents. As the platform grows, data is refreshed monthly to reflect current trends." },
              { icon: "🔗", title: "Cited & Reproducible", desc: "Every data point includes collection date, sample size, and methodology. Other researchers can verify our findings." },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="bg-white border border-zinc-200 rounded-xl p-5">
                <div className="text-2xl mb-2">{icon}</div>
                <h3 className="font-bold text-zinc-900 mb-1">{title}</h3>
                <p className="text-sm text-zinc-500">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="bg-gradient-to-r from-pink-50 to-purple-50 border border-pink-200 rounded-2xl p-8 text-center">
          <p className="font-bold text-pink-700 mb-2">Want to be notified when our first report drops?</p>
          <p className="text-zinc-600 mb-4">We're collecting data now. The first report — "Trust & Ghosting in Creator Collaborations" — is coming soon.</p>
          <a href="mailto:honghuishen24@gmail.com?subject=Notify me about KOC Engine Research" className="inline-block bg-gradient-to-r from-pink-500 to-purple-500 text-white px-8 py-3 rounded-full font-bold shadow-lg shadow-pink-200 hover:opacity-90 transition">
            📬 Notify Me →
          </a>
        </section>

        <footer className="text-center text-sm text-zinc-400 pb-12 pt-8 border-t border-zinc-100 mt-12">
          <p>
            Have research ideas or want to collaborate? Contact:{" "}
            <a href="mailto:honghuishen24@gmail.com" className="text-pink-500 hover:text-pink-600 underline">honghuishen24@gmail.com</a>
          </p>
        </footer>
      </main>
    </>
  );
}
