import Link from "next/link";
import Spark from "@/components/Spark";
import JsonLd from "@/components/JsonLd";
import { organizationSchema, webApplicationSchema, faqSchema } from "@/lib/schema";
import { HomeStats } from "./HomeStats";

const homeFaqs = [
  {
    question: "How to find TikTok creators that match my specific product niche?",
    answer:
      "KOC Engine's AI matching engine scores creators across 7 dimensions: niche category overlap, tier bonus, content quality score, regional market match, collaboration history, trust score, and content performance. Top matches are automatically ranked. Browse the KOC pool with filters by platform, niche tags, follower count, region, and trust tier.",
  },
  {
    question: "How many vetted creators are available for cross-border ecommerce brands?",
    answer:
      "All creators go through a 3-stage process: application → AI scoring (authenticity, niche fit, engagement) → admin review. Approved creators receive trust tiers (L1/L2/L3). The KOC pool is visible with full filtering while contact info stays anonymized until a task is matched.",
  },
  {
    question: "What targeting options exist for matching with KOC creators?",
    answer:
      "KOC Engine supports 7 targeting dimensions: product category matching, creator tier (L1-L3), trust score, region (US/UK/CA/AU/EU/JP/KR/SEA/CN), follower count range, content performance score, and past collaboration history. Urgent tasks auto-match immediately; long-term tasks stay in the task hall for organic browsing.",
  },
  {
    question: "How can small creators find brand deals and get free products to review?",
    answer:
      "KOC Engine has a task hall where creators browse all open collaboration opportunities — product details, commission amounts, merchant trust tier, required content type. Filter by category, commission minimum, task type, and region. No minimum follower count to get started.",
  },
  {
    question: "How much can creators earn from KOC brand collaborations?",
    answer:
      "Creators earn commission paid in platform points — brands set per-KOC commission when publishing tasks (e.g. 30pt = $30). KOC pays a small 10pt pledge fully refunded on completion. Platform takes 10% of commission (min 1pt) as service fee. Earned points are withdrawable at 1pt = $1 USD. Top performers (L3 tier) get priority matching.",
  },
  {
    question: "How to prevent creators from taking free samples without posting content?",
    answer:
      "KOC Engine uses a deposit + commission pool system. Brands pre-pay the commission pool (non-refundable), KOCs deposit a fixed 10pt pledge. Pledge (10pt) is fully returned + 90% of commission is released after content approval (platform takes 10%, min 1pt). AI judges disputes if brands reject twice. If KOC fails to submit, commission is returned to brand and KOC forfeits pledge.",
  },
  {
    question: "How does KOC Engine protect both brands and creators from fraud?",
    answer:
      "KOC Engine has a built-in Red Line Protection System — 7 behavioral detection rules monitor every action in real time. Speed anomalies (impossible ship/receive times), pattern anomalies (repeat pairs, 100% approval rates), and IP correlation (same person operating both roles) are automatically detected. When a user's risk score crosses the threshold (60/100), automatic enforcement triggers: all assets are confiscated, all tasks are cancelled, the innocent party is fully refunded, and the offender is frozen (1st offense, with one chance to rectify) or permanently banned (2nd offense). The same penalty applies to both merchants and KOCs — no double standards, no favoritism. This makes KOC Engine the only platform in the market with automated, symmetric fraud enforcement.",
  },
  {
    question: "What is the best platform for cross-border KOC influencer marketing?",
    answer:
      "The best KOC platform depends on needs: AI matching quality (niche + region accuracy), trust systems (pledge/deposit protection), content performance tracking, and transparent pricing. Look for escrow-based payment, creator vetting (AI + human review), and performance analytics.",
  },
];

export default function HomePage() {
  return (
    <>
      <JsonLd data={organizationSchema()} />
      <JsonLd data={webApplicationSchema()} />
      <JsonLd data={faqSchema(homeFaqs)} />

      {/* Hero */}
      <section
        className="min-h-[90vh] flex flex-col items-center justify-center text-center px-6"
        style={{ background: "linear-gradient(135deg, #FFF7ED 0%, #FDF2F8 50%, #F5F3FF 100%)" }}
      >
        <Spark size={64} animate className="mb-8" />
        <h1 className="text-5xl font-extrabold tracking-tight mb-4 max-w-3xl brand-gradient-text">
          Creator-Brand Collaboration, Made Accessible
        </h1>
        <p className="text-lg text-zinc-500 max-w-xl mb-2">
          Making creator-brand collaboration accessible for everyone, not just the biggest brands and influencers.
        </p>
        <p className="text-base text-zinc-400 max-w-xl mb-10">
          For Amazon sellers, DTC brands, and small creators — AI matching with dual-pledge escrow to ensure both sides deliver.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <Link href="/register?role=merchant" className="btn-brand px-8 py-4 text-lg font-bold rounded-full shadow-lg shadow-pink-200">
            🏢 Find Creators for My Brand
          </Link>
          <Link href="/register?role=koc" className="rounded-full px-8 py-4 text-lg font-bold bg-white text-zinc-900 border-2 border-zinc-200 hover:border-pink-300 transition shadow-sm">
            🎬 Become a Creator Partner
          </Link>
        </div>
        <p className="text-sm text-zinc-400">
          Already have an account?{" "}
          <Link href="/login" className="text-pink-500 font-semibold hover:underline">Sign in</Link>
        </p>
        <HomeStats />
      </section>

      {/* Value Props */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-extrabold text-zinc-900 mb-4">Why Brands &amp; Creators Choose KOC Engine</h2>
          <p className="text-zinc-500 max-w-2xl mx-auto">Built for cross-border e-commerce. AI matching, escrow protection, and real-time performance tracking — all in one platform.</p>
        </div>
        <div className="grid md:grid-cols-2 gap-5">
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-purple-600 uppercase tracking-wide mb-3">🏢 For Brands &amp; Sellers</h3>
            {[{ icon: "🤖", title: "AI Smart Matching", desc: "7-dimension scoring — niche, region, tier, trust, performance. Find the right creator in seconds, not weeks." }, { icon: "🛡️", title: "Pledge Protection", desc: "Creators deposit before receiving samples. No more ghosting after free products. Only pay for approved content." }, { icon: "📊", title: "Performance Analytics", desc: "Real-time dashboard — views, engagement, conversions, revenue per creator. Know your ROI on every collaboration." }].map((v) => (
              <div key={v.title} className="bg-white rounded-2xl p-6 border border-purple-100 shadow-sm"><div className="text-3xl mb-3">{v.icon}</div><h4 className="font-bold text-zinc-900 mb-1">{v.title}</h4><p className="text-sm text-zinc-500">{v.desc}</p></div>
            ))}
          </div>
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-pink-600 uppercase tracking-wide mb-3">🎬 For Creators</h3>
            {[{ icon: "🏪", title: "Task Hall", desc: "Browse all open brand deals. Filter by category, commission, and region. Accept up to 5 concurrent tasks." }, { icon: "💰", title: "Earn Commission + Free Products", desc: "Keep the products you review. Earn commission in platform points (1pt = $1). Withdraw earnings anytime. Top performers unlock L3 priority matching." }, { icon: "⭐", title: "Build Your Reputation", desc: "Trust tiers (L1→L2→L3) based on completed collaborations and ratings. Higher tiers = more brand deals + better matching priority." }].map((v) => (
              <div key={v.title} className="bg-white rounded-2xl p-6 border border-pink-100 shadow-sm"><div className="text-3xl mb-3">{v.icon}</div><h4 className="font-bold text-zinc-900 mb-1">{v.title}</h4><p className="text-sm text-zinc-500">{v.desc}</p></div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-orange-50 py-20">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-3xl font-extrabold text-center text-zinc-900 mb-14">How It Works</h2>
          <div className="grid md:grid-cols-4 gap-6">
            {[{ step: "1", title: "Brand Posts Task", desc: "Set product, commission, KOC count. Urgent tasks auto-match." }, { step: "2", title: "AI Matches Creators", desc: "7-dimension scoring finds best-fit KOCs by niche and region." }, { step: "3", title: "Commission Pool + Ship", desc: "Brand pre-pays commission pool. KOC pledges 10pt. Brand ships sample, KOC creates content." }, { step: "4", title: "Review + Track ROI", desc: "Brand approves content. Track views, engagement, conversions." }].map((item) => (
              <div key={item.step} className="text-center"><div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 brand-gradient"><span className="text-white text-xl font-extrabold">{item.step}</span></div><h4 className="font-bold text-zinc-900 mb-1">{item.title}</h4><p className="text-xs text-zinc-500">{item.desc}</p></div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust & Fairness — The Worry-Free Guarantee */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-extrabold text-zinc-900 mb-4">
            ⚖️ Fair for Both Sides. Zero Fraud. Zero Worry.
          </h2>
          <p className="text-zinc-500 max-w-3xl mx-auto text-lg leading-relaxed">
            KOC Engine is the <strong>only KOC platform</strong> with an automated anti-fraud enforcement system
            that protects both brands and creators equally. Every action is monitored. Every violation is penalized.
            The innocent party always gets fully refunded.
          </p>
        </div>

        {/* Three Trust Pillars */}
        <div className="grid md:grid-cols-3 gap-5 mb-10">
          <div className="bg-white rounded-2xl border border-purple-100 p-6 shadow-sm">
            <div className="text-3xl mb-3">🔒</div>
            <h4 className="font-bold text-zinc-900 mb-2">Dual-Pledge Escrow</h4>
            <p className="text-sm text-zinc-500 leading-relaxed">
              Brands pre-pay the commission pool. Creators deposit a 10pt pledge. Neither side can walk away
              without financial consequence. Funds are released only after content is approved.
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-pink-100 p-6 shadow-sm">
            <div className="text-3xl mb-3">🤖</div>
            <h4 className="font-bold text-zinc-900 mb-2">AI Vetting + Human Review</h4>
            <p className="text-sm text-zinc-500 leading-relaxed">
              Every creator passes 3-dimension AI scoring: authenticity, niche fit, engagement.
              Manual admin review for final approval. No fake accounts. No bots.
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-amber-100 p-6 shadow-sm">
            <div className="text-3xl mb-3">⭐</div>
            <h4 className="font-bold text-zinc-900 mb-2">Public Trust Tiers</h4>
            <p className="text-sm text-zinc-500 leading-relaxed">
              Merchants (M1–M3) and KOCs (L1–L3) display real trust scores based on completed
              collaborations and peer ratings. Higher tiers get priority matching.
            </p>
          </div>
        </div>

        {/* Red Line Enforcement — The Core Guarantee */}
        <div className="bg-gradient-to-br from-red-50 via-white to-amber-50 rounded-3xl border-2 border-red-100 p-8 md:p-10 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">🛡️</span>
            <h3 className="text-2xl font-extrabold text-zinc-900">
              Red Line Protection:{" "}
              <span className="text-red-600">Fraud Is a Red Line. Cross It, and You&apos;re Out.</span>
            </h3>
          </div>

          <p className="text-zinc-600 leading-relaxed mb-8 max-w-3xl">
            We monitor every action on the platform in real time with 7 behavioral detection rules.
            Speed anomalies, repeat collusion patterns, cross-account IP correlation — if you try to
            game the system, it catches you. And the penalty is the same whether you&apos;re a brand
            or a creator. No double standards.
          </p>

          {/* 7 Rules Compact */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-8">
            {[
              ["R1", "Accept → Ship &lt;30min", "bg-red-100 text-red-700"],
              ["R2", "Ship → Receive &lt;1hr", "bg-red-100 text-red-700"],
              ["R3", "Receive → Submit &lt;30min", "bg-orange-100 text-orange-700"],
              ["R4", "Submit → Approve &lt;5min", "bg-orange-100 text-orange-700"],
              ["R5", "Same Pair ≥3 Tasks", "bg-amber-100 text-amber-700"],
              ["R6", "100% Approval Rate ≥3", "bg-amber-100 text-amber-700"],
              ["R7", "Same IP Across Roles", "bg-yellow-100 text-yellow-700"],
            ].map(([id, label, cls]) => (
              <div key={id} className="bg-white rounded-xl p-3 border border-red-50 text-center">
                <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded-full mb-1 ${cls}`}>{id}</span>
                <div className="text-xs text-zinc-600 font-medium">{label}</div>
              </div>
            ))}
          </div>

          {/* Penalty Cards */}
          <div className="grid md:grid-cols-2 gap-5 mb-8">
            <div className="bg-amber-50 rounded-2xl p-6 border border-amber-200">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">⚠️</span>
                <h4 className="font-bold text-amber-900 text-lg">1st Offense — One Chance to Rectify</h4>
              </div>
              <ul className="text-sm text-amber-800 space-y-2 list-disc list-inside leading-relaxed">
                <li>All pledges &amp; commissions confiscated — held by platform</li>
                <li>All active tasks cancelled — <strong>innocent party refunded in full</strong></li>
                <li>Account frozen — admin reviews the case</li>
                <li>Genuine mistake? Rectify and restore your account</li>
              </ul>
            </div>
            <div className="bg-red-50 rounded-2xl p-6 border border-red-200">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">🚫</span>
                <h4 className="font-bold text-red-900 text-lg">2nd Offense — Permanent Ban</h4>
              </div>
              <ul className="text-sm text-red-800 space-y-2 list-disc list-inside leading-relaxed">
                <li>All assets confiscated permanently</li>
                <li><strong>Permanent ban</strong> — account blacklisted, no recovery</li>
                <li>Applies symmetrically to <strong>both merchants and KOCs</strong></li>
                <li>Zero tolerance for repeat offenders</li>
              </ul>
            </div>
          </div>

          {/* Symmetric Fairness Guarantee */}
          <div className="bg-white rounded-2xl p-6 border border-green-100 flex items-start gap-4">
            <span className="text-3xl flex-shrink-0">⚖️</span>
            <div>
              <h4 className="font-bold text-zinc-900 mb-1 text-lg">Symmetric Enforcement — Both Sides Protected Equally</h4>
              <p className="text-sm text-zinc-500 leading-relaxed">
                A merchant caught faking shipments faces the <strong>exact same penalty</strong> as a KOC caught
                submitting fake content. Assets are confiscated from the offender. The innocent party is always refunded.
                All affected users are notified. This is our fundamental commitment to fairness — there is no asymmetry,
                no favoritism, no double standard. The red line is drawn the same way for everyone.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-4xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-extrabold text-center text-zinc-900 mb-14">Frequently Asked Questions</h2>
        <div className="space-y-3">
          {homeFaqs.map((faq) => (
            <details key={faq.question} className="bg-white rounded-2xl border border-gray-100 p-5 group cursor-pointer">
              <summary className="font-semibold text-zinc-800 text-sm list-none flex items-center justify-between">{faq.question}<span className="text-zinc-300 group-open:rotate-45 transition-transform text-lg">+</span></summary>
              <p className="text-sm text-zinc-500 mt-3 leading-relaxed">{faq.answer}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-zinc-900 text-zinc-400 text-center py-8 text-sm">
        <div className="flex justify-center gap-4 mb-3 flex-wrap">
          <Link href="/login" className="hover:text-purple-400 underline">Sign In</Link>
          <Link href="/register" className="hover:text-purple-400 underline">Create Account</Link>
          <Link href="/pricing" className="hover:text-purple-400 underline">Pricing</Link>
          <Link href="/rules" className="hover:text-purple-400 underline">Platform Rules</Link>
          <Link href="/about" className="hover:text-purple-400 underline">About</Link>
          <Link href="/blog" className="hover:text-purple-400 underline">Blog</Link>
          <Link href="/case-studies" className="hover:text-purple-400 underline">Case Studies</Link>
          <Link href="/guide/koc-marketing-cross-border-ecommerce" className="hover:text-purple-400 underline">KOC Marketing Guide</Link>
        </div>
        <p className="text-zinc-500">KOC Engine — Making Creator-Brand Collaboration Accessible for Everyone</p>
        <p className="text-zinc-600 mt-2">
          Contact:{" "}
          <a href="mailto:honghuishen24@gmail.com" className="hover:text-purple-400 underline">honghuishen24@gmail.com</a>
        </p>
      </footer>
    </>
  );
}
