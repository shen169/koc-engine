import type { Metadata } from "next";
import Link from "next/link";
import JsonLd from "@/components/JsonLd";
import { breadcrumbSchema, webPageSchema } from "@/lib/schema";

export const metadata: Metadata = {
  title: "KOC Engine for Creators — Earn Money Making Authentic Content",
  description: "Small creators welcome. No minimum follower count. Browse brand deals, earn commission (1pt = $1 USD), and get paid on delivery. Pledge escrow protects your earnings.",
  alternates: { canonical: "/for-creators" },
};

export default function ForCreatorsPage() {
  return (
    <>
      <JsonLd data={breadcrumbSchema([{ name: "Home", url: "https://kocengine.com" }, { name: "For Creators", url: "https://kocengine.com/for-creators" }])} />
      <JsonLd data={webPageSchema({ name: "KOC Engine for Creators", description: "Small creators earn commission making authentic content. Browse brand deals with pledge-protected earnings.", url: "https://kocengine.com/for-creators" })} />
      <main className="max-w-3xl mx-auto px-6 py-16">
        <div className="mb-12">
          <Link href="/" className="text-sm text-pink-500 hover:text-pink-600 mb-4 inline-block">← KOC Engine</Link>
          <h1 className="text-4xl font-extrabold text-zinc-900 mb-4 leading-tight">
            Your Content, <span className="bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">Your Price</span>
          </h1>
          <p className="text-lg text-zinc-500">
            No minimum followers. No agency middlemen taking your cut. Browse brand deals, set your terms, and get paid when you deliver.
          </p>
        </div>

        {/* Pain Points */}
        <section className="mb-16">
          <h2 className="text-2xl font-extrabold text-zinc-900 mb-6">Creator Frustrations We Fix</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { emoji: "💸", title: "\"Will They Even Pay Me?\"", desc: "Brands ask for content, then disappear when it's time to pay. Manual DMs, no contract, no recourse. On KOC Engine, commission is locked in escrow before you even start." },
              { emoji: "📉", title: "\"They Want Top Creators Only\"", desc: "Most platforms favor mega-influencers with 100K+ followers. KOC Engine is built for nano and micro creators — L1 tier starts from your first accepted task." },
              { emoji: "🤷", title: "\"Deals Come By Luck\"", desc: "Finding brand deals means hoping a brand DMs you, or competing on crowded marketplaces. KOC Engine's task hall shows all open opportunities — browse, filter, and accept what fits you." },
            ].map(({ emoji, title, desc }) => (
              <div key={title} className="bg-amber-50 border border-amber-100 rounded-xl p-5">
                <div className="text-2xl mb-2">{emoji}</div>
                <h3 className="font-bold text-amber-800 text-sm mb-1">{title}</h3>
                <p className="text-xs text-amber-700 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How It Works for Creators */}
        <section className="mb-16">
          <h2 className="text-2xl font-extrabold text-zinc-900 mb-6">How It Works for Creators</h2>
          <div className="space-y-4">
            {[
              { step: "1", icon: "📝", title: "Apply & Get Verified", desc: "Submit your TikTok/Instagram profile. Our AI scores your content authenticity, niche fit, and engagement. Once approved, you get a trust tier (L1-L3) and 200pt free trial bonus." },
              { step: "2", icon: "🔍", title: "Browse the Task Hall", desc: "Open tasks from brands looking for creators like you. Filter by product category, commission range, task type (urgent/long-term), and region. See the merchant's trust tier before you accept." },
              { step: "3", icon: "🤝", title: "Accept & Pledge", desc: "When you find a task you want, accept it and deposit a 10pt ($10) pledge from your bonus balance. This pledge is fully returned when you complete the task — it just proves you're serious." },
              { step: "4", icon: "🎬", title: "Create & Submit Content", desc: "Receive the product, create authentic content (unboxing, review, tutorial — whatever the brand needs), and submit within 14 days. You get one revision chance if the brand requests changes." },
              { step: "5", icon: "💰", title: "Get Paid", desc: "Brand approves → 90% of commission is yours (withdrawable), 10pt pledge returned (bonus). Earn enough and unlock withdrawal: 1pt = $1 USD via PayPal or bank transfer." },
            ].map(({ step, icon, title, desc }) => (
              <div key={step} className="flex gap-4 bg-white border border-zinc-200 rounded-xl p-5">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 text-white flex items-center justify-center font-extrabold text-xs shrink-0 mt-0.5">{step}</div>
                <div className="flex-1">
                  <h3 className="font-bold text-zinc-900 mb-1">{icon} {title}</h3>
                  <p className="text-sm text-zinc-500 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Earnings */}
        <section className="mb-16">
          <h2 className="text-2xl font-extrabold text-zinc-900 mb-6">What You Can Earn</h2>
          <div className="bg-white border border-zinc-200 rounded-2xl p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
              <div className="bg-emerald-50 rounded-xl p-5">
                <p className="text-xs text-emerald-500 mb-1">Per Task (30pt)</p>
                <p className="text-3xl font-extrabold text-emerald-700">$27</p>
                <p className="text-xs text-emerald-600 mt-1">withdrawable cash</p>
              </div>
              <div className="bg-purple-50 rounded-xl p-5">
                <p className="text-xs text-purple-500 mb-1">Per Task (50pt)</p>
                <p className="text-3xl font-extrabold text-purple-700">$45</p>
                <p className="text-xs text-purple-600 mt-1">withdrawable cash</p>
              </div>
              <div className="bg-amber-50 rounded-xl p-5">
                <p className="text-xs text-amber-500 mb-1">Free Trial Bonus</p>
                <p className="text-3xl font-extrabold text-amber-700">200pt</p>
                <p className="text-xs text-amber-600 mt-1">for pledges & tasks</p>
              </div>
            </div>
            <div className="mt-4 p-4 bg-gray-50 rounded-xl text-sm text-zinc-600">
              <p><strong>Withdrawal requirements:</strong> ≥3 completed tasks AND ≥100pt withdrawable balance. At 30pt commission, that's 4 completions (108pt). Daily cap: 500pt.</p>
              <p className="mt-1"><strong>Top performers (L3 tier)</strong> get priority matching, higher task visibility, and access to premium brand deals.</p>
            </div>
          </div>
        </section>

        {/* Trust & Protection */}
        <section className="mb-16">
          <h2 className="text-2xl font-extrabold text-zinc-900 mb-6">🛡️ How We Protect Creators</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { title: "Commission Held in Escrow", desc: "Brand pre-pays the full commission pool before you accept a task. The money is already there. You don't have to chase anyone for payment." },
              { title: "Pledge Fully Returned", desc: "Your 10pt pledge comes from your free bonus balance. Complete the task → it's returned. The only way you lose it is if you ghost." },
              { title: "AI Dispute Resolution", desc: "If a brand unfairly rejects your content, an impartial AI (DeepSeek v4) judges it. Not a human support agent who might side with the paying customer." },
              { title: "Brand Breach Protection", desc: "If the brand fails to ship within 48 hours, your pledge is refunded and the brand's commission pool is forfeited. Their Trust Score drops -20." },
            ].map(({ title, desc }) => (
              <div key={title} className="bg-white border border-zinc-200 rounded-xl p-5">
                <h3 className="font-bold text-zinc-900 mb-2">{title}</h3>
                <p className="text-sm text-zinc-500">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Who Is This For */}
        <section className="mb-16">
          <h2 className="text-2xl font-extrabold text-zinc-900 mb-6">Built For Creators Like You</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { title: "Nano Creators (1K-10K)", desc: "Just starting out? No minimum follower count. Your content quality and authenticity matter more than your follower number." },
              { title: "Micro Creators (10K-50K)", desc: "Ready to monetize? Browse higher-commission tasks. Build your trust tier and unlock better brand deals." },
              { title: "TikTok Reviewers", desc: "Product reviewers, unboxers, and honest reviewers — brands need authentic voices, not polished ads." },
              { title: "Cross-Border Creators", desc: "Based in SEA, EU, or LATAM? Brands expanding internationally need local creators who speak the language and understand the culture." },
            ].map(({ title, desc }) => (
              <div key={title} className="bg-pink-50 border border-pink-100 rounded-xl p-5">
                <h3 className="font-bold text-pink-900 mb-1">{title}</h3>
                <p className="text-sm text-pink-700">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="bg-gradient-to-r from-pink-50 to-purple-50 border border-pink-200 rounded-2xl p-8 text-center">
          <p className="font-bold text-pink-700 mb-2">Ready to turn your content into income?</p>
          <Link href="/register?role=koc" className="inline-block bg-gradient-to-r from-pink-500 to-purple-500 text-white px-8 py-3 rounded-full font-bold shadow-lg shadow-pink-200 hover:opacity-90 transition">
            🎬 Apply as Creator — 200pt Free Trial →
          </Link>
          <p className="text-sm text-zinc-500 mt-3">
            No minimum followers. No application fee. <Link href="/how-it-works" className="text-pink-500 underline">See how it works →</Link>
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
