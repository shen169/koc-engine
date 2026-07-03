import type { Metadata } from "next";
import Link from "next/link";
import JsonLd from "@/components/JsonLd";
import { faqSchema, breadcrumbSchema, webPageSchema } from "@/lib/schema";

export const metadata: Metadata = {
  title: "FAQ — KOC Engine Frequently Asked Questions",
  description: "Common questions about KOC Engine: how pledge escrow works, pricing, creator earnings, brand protection, withdrawal rules, and more.",
  alternates: { canonical: "/faq" },
};

const faqCategories = [
  {
    category: "General",
    faqs: [
      { q: "What is KOC Engine?", a: "KOC Engine is an AI-powered bilateral matching platform for cross-border e-commerce KOC (Key Opinion Consumer) marketing. Brands post collaboration tasks with built-in escrow protection. Creators browse the task hall, accept deals, and earn commission. Dual-pledge escrow ensures both sides deliver — no ghosting, no guesswork." },
      { q: "What does KOC mean?", a: "KOC stands for Key Opinion Consumer — everyday creators who make authentic product content (reviews, unboxings, tutorials). Unlike KOLs (Key Opinion Leaders) with massive followings, KOCs are nano/micro creators whose opinions carry trust because they feel like real people, not celebrities." },
      { q: "Who is KOC Engine for?", a: "For cross-border e-commerce brands (Amazon sellers, DTC brands, Shopify merchants) who need authentic creator content, and for small creators (TikTok, Instagram) who want to earn money making product reviews. We're built specifically for the cross-border trust gap — brands and creators in different countries." },
      { q: "Is KOC Engine free to join?", a: "Yes. Brands get 100pt free trial (~2 test tasks). Creators get 200pt free trial. No monthly subscription. You only pay when you publish a task ($5 platform fee + commission)." },
    ],
  },
  {
    category: "For Brands",
    faqs: [
      { q: "How do I find the right creators for my product?", a: "KOC Engine's AI matching engine scores creators across 7 dimensions: niche category, tier, trust score, region, content quality, collaboration history, and performance. Post a task and top matches are automatically ranked. You can also browse the anonymous KOC pool with filters." },
      { q: "How much does it cost to post a task?", a: "Each task costs a 5pt ($5) platform fee + the commission pool (20-50pt per KOC). Example: 1 KOC × 30pt = 35pt total. Commission is held in escrow and only released when the KOC delivers approved content. Platform takes 10% of commission (min 1pt) on completion." },
      { q: "What happens if a creator ghosts after receiving my product?", a: "The KOC's 10pt pledge is forfeited to the platform, your commission pool is fully refunded to your balance, and the KOC's Trust Score drops -15. This is why our ghosting rate is <1% vs. the industry average of 30-40%." },
      { q: "What if I don't like the content the creator submitted?", a: "You can request one revision within 4 days. If you reject again, our AI (DeepSeek v4) performs an impartial content judgment — analyzing the content against the task requirements. This prevents either side from acting in bad faith." },
      { q: "Can I choose which creator works on my task?", a: "For urgent tasks, AI auto-matches the best available creator. For long-term tasks, creators browse and apply — you can review their profile and approve before the task starts." },
    ],
  },
  {
    category: "For Creators",
    faqs: [
      { q: "Do I need a minimum number of followers?", a: "No. KOC Engine is built for nano and micro creators. There is no minimum follower count. Our AI evaluates content authenticity, niche fit, and engagement quality — not just follower numbers." },
      { q: "How much can I earn?", a: "Commission per task ranges from 20-50pt (set by the brand). You earn 90% of the commission as withdrawable cash — e.g., 30pt commission = 27pt ($27) withdrawable. Plus your 10pt pledge is returned as bonus. Top performers (L3 tier) get priority matching for higher-paying tasks." },
      { q: "How do I get paid?", a: "Once you have ≥3 completed tasks AND ≥100pt withdrawable balance, you can withdraw via PayPal or bank transfer at 1pt = $1 USD. Daily withdrawal cap is 500pt." },
      { q: "What is the 10pt pledge and do I get it back?", a: "The 10pt ($10) pledge is a deposit you make when accepting a task — it comes from your free bonus balance, not your cash. It proves you're serious about delivering. When you complete the task, the pledge is fully returned as bonus. The only way you lose it is if you ghost." },
      { q: "What if a brand doesn't ship the product?", a: "Brands have 48 hours to ship. If they miss the deadline, your pledge is refunded, the brand's commission pool is forfeited, and their Trust Score drops -20. You lose nothing." },
    ],
  },
  {
    category: "Trust & Safety",
    faqs: [
      { q: "How does KOC Engine prevent fraud?", a: "We have a Red Line Protection System with 7 behavioral detection rules monitoring every action in real time: speed anomalies, pattern anomalies (repeat pairs, 100% approval rates), IP correlation (same person operating both roles). When risk score crosses the threshold (60/100), automatic enforcement triggers — assets confiscated, tasks cancelled, innocent party refunded." },
      { q: "What is the Trust Score and Tier system?", a: "Every user has a behavioral reputation score. Brands: M1 (entry) → M2 (verified) → M3 (premium). Creators: L1 (entry) → L2 (proven) → L3 (elite). Trust Score affects matching priority, task visibility, and pledge requirements. Scores are earned through consistent delivery, not bought." },
      { q: "What happens in a dispute?", a: "If brand and KOC disagree on content quality: (1) Brand requests revision → KOC has 3 days to revise. (2) If brand rejects again → AI (DeepSeek v4) performs impartial judgment. (3) AI analyzes content against task requirements and decides. This is faster and fairer than human-mediated disputes." },
      { q: "Is my personal information safe?", a: "KOC contact information is anonymized until a task match is confirmed. Brands see creator profiles with content stats but not personal details. We don't share data with third parties. See our Privacy Policy for details." },
    ],
  },
];

export default function FAQPage() {
  const allFaqs = faqCategories.flatMap(c => c.faqs.map(f => ({ question: f.q, answer: f.a })));

  return (
    <>
      <JsonLd data={faqSchema(allFaqs)} />
      <JsonLd data={breadcrumbSchema([{ name: "Home", url: "https://kocengine.com" }, { name: "FAQ", url: "https://kocengine.com/faq" }])} />
      <JsonLd data={webPageSchema({ name: "KOC Engine FAQ", description: "Frequently asked questions about KOC Engine — pledge escrow, pricing, creator earnings, brand protection, and trust & safety.", url: "https://kocengine.com/faq" })} />
      <main className="max-w-3xl mx-auto px-6 py-16">
        <div className="mb-12">
          <Link href="/" className="text-sm text-pink-500 hover:text-pink-600 mb-4 inline-block">← KOC Engine</Link>
          <h1 className="text-4xl font-extrabold text-zinc-900 mb-4 leading-tight">
            Frequently Asked <span className="bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">Questions</span>
          </h1>
          <p className="text-lg text-zinc-500">Everything you need to know about how KOC Engine works, pricing, and trust & safety.</p>
        </div>

        {faqCategories.map(({ category, faqs }) => (
          <section key={category} className="mb-12">
            <h2 className="text-xl font-extrabold text-zinc-900 mb-4 pb-2 border-b border-zinc-200">{category}</h2>
            <div className="space-y-3">
              {faqs.map(({ q, a }) => (
                <details key={q} className="group bg-white border border-zinc-200 rounded-xl overflow-hidden">
                  <summary className="p-4 font-medium text-zinc-800 cursor-pointer hover:bg-gray-50 list-none flex justify-between items-center">
                    {q}
                    <span className="text-zinc-400 group-open:rotate-180 transition-transform text-lg ml-2 shrink-0">▾</span>
                  </summary>
                  <div className="px-4 pb-4 text-sm text-zinc-600 leading-relaxed">{a}</div>
                </details>
              ))}
            </div>
          </section>
        ))}

        {/* Still Have Questions */}
        <section className="bg-gradient-to-r from-pink-50 to-purple-50 border border-pink-200 rounded-2xl p-8 text-center">
          <p className="font-bold text-pink-700 mb-2">Still have questions?</p>
          <p className="text-zinc-600 mb-4">We're happy to help.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/contact" className="inline-block bg-gradient-to-r from-pink-500 to-purple-500 text-white px-8 py-3 rounded-full font-bold shadow-lg shadow-pink-200 hover:opacity-90 transition">
              📧 Contact Us →
            </Link>
            <a href="mailto:honghuishen24@gmail.com" className="inline-block bg-white text-zinc-900 border-2 border-zinc-200 hover:border-pink-300 px-8 py-3 rounded-full font-bold transition">
              ✉️ Email Directly
            </a>
          </div>
        </section>

        <footer className="text-center text-sm text-zinc-400 pb-12 pt-8 border-t border-zinc-100 mt-12">
          <p>
            Last updated: July 2026. <Link href="/terms" className="text-pink-500 hover:text-pink-600 underline">Terms of Service</Link> ·{" "}
            <Link href="/privacy" className="text-pink-500 hover:text-pink-600 underline">Privacy Policy</Link>
          </p>
        </footer>
      </main>
    </>
  );
}
