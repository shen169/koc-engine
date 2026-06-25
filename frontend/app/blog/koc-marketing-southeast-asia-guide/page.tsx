import type { Metadata } from "next";
import Link from "next/link";
import JsonLd from "@/components/JsonLd";

export const metadata: Metadata = {
  title: "KOC Marketing Southeast Asia Guide: TikTok, Shopee, and Local Creator Strategies (2026)",
  description: "Complete guide to KOC marketing in Southeast Asia (Thailand, Vietnam, Philippines, Malaysia, Indonesia). Covers platform selection, creator sourcing, Shopee/Lazada integration, pledge protection, and ROI benchmarks.",
  alternates: { canonical: "/blog/koc-marketing-southeast-asia-guide" },
};

const articleSchema = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "KOC Marketing Southeast Asia Guide: TikTok, Shopee, and Local Creator Strategies (2026)",
  description: "Complete guide to KOC marketing in Southeast Asia for cross-border e-commerce brands.",
  author: { "@type": "Person", name: "Jojo Shen", url: "https://github.com/shen169" },
  datePublished: "2026-06-23",
  dateModified: "2026-06-23",
  publisher: { "@type": "Organization", name: "KOC Engine" },
};

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id}>
      <h2 className="text-2xl font-extrabold text-zinc-900 mb-4">{title}</h2>
      {children}
    </section>
  );
}

export default function SeAsiaGuidePage() {
  const faqs = [
    { q: "Is TikTok the best platform for KOC marketing in Southeast Asia?", a: "TikTok dominates in Thailand, Vietnam, and Philippines (3–8% engagement rates). In Indonesia and Malaysia, Instagram is still significant. For e-commerce attribution, TikTok Shop integration (available in TH, VN, PH) enables direct in-app checkout — the most efficient conversion path." },
    { q: "How much does a KOC campaign in SEA cost compared to the US?", a: "SEA creator commissions are 40–60% lower than US equivalents. Average commission per KOC: $20–$30 in SEA vs. $50–$80 in US. Shipping costs are also lower for intra-Asia routes ($8–$15 per sample). A 5-KOC SEA campaign costs ~$125–$175 total vs. $300+ for the US equivalent." },
    { q: "Can I use KOC Engine for Shopee/Lazada products?", a: "Yes. KOC Engine is platform-agnostic — you can list any product regardless of where it's sold. KOCs create content on TikTok/Instagram/YouTube that drives traffic to your Shopee/Lazada listing. Some creators also produce Shopee Live content for additional attribution." },
    { q: "What's the biggest challenge for Chinese brands entering SEA markets?", a: "Cultural localization. Direct translations of US-market content don't work in SEA. Each country has distinct humor styles, language preferences, and shopping behaviors. KOC Engine's AI matching prioritizes local creators who understand their audience's culture." },
  ];

  return (
    <>
      <JsonLd data={articleSchema} />
      <article className="max-w-3xl mx-auto px-6 py-16">
        <div className="mb-12">
          <Link href="/" className="text-sm text-pink-500 hover:text-pink-600 mb-4 inline-block">← KOC Engine</Link>
          <h1 className="text-4xl font-extrabold text-zinc-900 mb-4 leading-tight">KOC Marketing Southeast Asia Guide (2026)</h1>
          <p className="text-lg text-zinc-500">TikTok, Shopee, and local creator strategies for Thailand, Vietnam, Philippines, Malaysia, and Indonesia.</p>
          <div className="flex items-center gap-3 mt-6 text-sm text-zinc-400"><span>June 2026</span><span>·</span><span>14 min read</span></div>
        </div>

        <nav className="bg-gray-50 rounded-2xl p-6 mb-12">
          <h2 className="font-bold text-zinc-800 mb-3">Table of Contents</h2>
          <ol className="space-y-1 text-sm text-zinc-600 list-decimal list-inside">
            <li><a href="#sea-opportunity">Why Southeast Asia Is the Fastest-Growing KOC Market</a></li>
            <li><a href="#platforms">Platform Landscape: TikTok, Instagram, Shopee Live</a></li>
            <li><a href="#country-guide">Country-Specific Strategies</a></li>
            <li><a href="#cost">Cost Benchmarks: SEA vs US vs UK</a></li>
            <li><a href="#sourcing">Finding Local KOCs in SEA Markets</a></li>
            <li><a href="#logistics">Intra-Asia Shipping & Logistics</a></li>
            <li><a href="#tiktok-shop">TikTok Shop Integration for Direct Conversion</a></li>
            <li><a href="#faq">Frequently Asked Questions</a></li>
          </ol>
        </nav>

        <div className="prose prose-zinc max-w-none space-y-12">
          <Section id="sea-opportunity" title="1. Why Southeast Asia Is the Fastest-Growing KOC Market">
            <p>Southeast Asia's social commerce market reached <strong>$6.8 billion in 2025</strong>, growing 35% year-over-year. Three structural factors drive this:</p>
            <ul>
              <li><strong>Mobile-first population</strong>: 400M+ smartphone users, 90%+ social media penetration</li>
              <li><strong>TikTok Shop integration</strong>: Available in Thailand, Vietnam, Philippines — enabling in-app checkout</li>
              <li><strong>Young demographics</strong>: Median age 30, 70% under 35 — the core KOC audience</li>
            </ul>
            <p>For Chinese cross-border brands, SEA offers <strong>40–60% lower creator costs</strong> and <strong>intra-Asia shipping savings</strong> (8–15 per sample vs. 25–40 for China → US). The ROI math is compelling.</p>
          </Section>

          <Section id="platforms" title="2. Platform Landscape: TikTok, Instagram, Shopee Live">
            <div className="overflow-x-auto not-prose">
              <table className="w-full text-sm border-collapse">
                <thead><tr className="bg-gray-50"><th className="border border-gray-200 p-3 text-left">Platform</th><th className="border border-gray-200 p-3 text-left">Dominant Markets</th><th className="border border-gray-200 p-3 text-left">Avg ER</th><th className="border border-gray-200 p-3 text-left">E-Commerce Integration</th></tr></thead>
                <tbody>
                  {[["TikTok","TH, VN, PH","3–8%","TikTok Shop (in-app checkout)"],["Instagram","MY, ID, TH","2–5%","IG Shopping (limited)"],["Shopee Live","TH, VN, PH, ID","N/A","Direct (in-app live selling)"],["YouTube","VN, TH","1–3%","Affiliate links only"]].map(([p,m,er,ecom])=>(
                    <tr key={p}><td className="border border-gray-200 p-3 font-medium">{p}</td><td className="border border-gray-200 p-3">{m}</td><td className="border border-gray-200 p-3">{er}</td><td className="border border-gray-200 p-3">{ecom}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p><strong>TikTok Shop</strong> is the game-changer: creators can add your product to their video, and viewers purchase directly within the TikTok app — zero friction from discovery to checkout. Available in Thailand, Vietnam, and Philippines (2026).</p>
          </Section>

          <Section id="country-guide" title="3. Country-Specific Strategies">
            <h3 className="text-lg font-bold text-zinc-800 mt-4 mb-2">Thailand 🇹🇭</h3>
            <p>TikTok-dominant. Thai consumers prefer entertaining, personality-driven content. Best KOC format: <strong>short comedy/lifestyle clips</strong> with product integration. Commission range: $20–$35 per KOC. Shopee Thailand is the primary marketplace.</p>
            <h3 className="text-lg font-bold text-zinc-800 mt-4 mb-2">Vietnam 🇻🇳</h3>
            <p>TikTok + YouTube dual-platform. Vietnamese consumers are <strong>research-oriented</strong> — they prefer detailed review videos before purchasing. Best KOC format: <strong>10–15 min review + comparison videos</strong>. Commission range: $15–$30 per KOC.</p>
            <h3 className="text-lg font-bold text-zinc-800 mt-4 mb-2">Philippines 🇵🇭</h3>
            <p>TikTok + Facebook. Filipino consumers are highly <strong>social and community-driven</strong>. Best KOC format: <strong>group unboxing + referral-based content</strong>. Commission range: $15–$25 per KOC. Shopee Philippines is dominant.</p>
            <h3 className="text-lg font-bold text-zinc-800 mt-4 mb-2">Indonesia 🇮🇩</h3>
            <p>Instagram + TikTok. Indonesian consumers prefer <strong>authentic, unfiltered content</strong>. Best KOC format: <strong>day-in-my-life style content</strong> with natural product placement. Commission range: $20–$40 per KOC. Shopee + Tokopedia duopoly.</p>
            <h3 className="text-lg font-bold text-zinc-800 mt-4 mb-2">Malaysia 🇲🇾</h3>
            <p>Instagram + TikTok, bilingual audience (English + Malay). Malaysian consumers are <strong>price-sensitive and comparison-focused</strong>. Best KOC format: <strong>value-for-money review + deal spotlight</strong>. Commission range: $20–$35 per KOC.</p>
          </Section>

          <Section id="cost" title="4. Cost Benchmarks: SEA vs US vs UK">
            <div className="overflow-x-auto not-prose">
              <table className="w-full text-sm border-collapse">
                <thead><tr className="bg-gray-50"><th className="border border-gray-200 p-3 text-left">Cost Item</th><th className="border border-gray-200 p-3 text-left">SEA</th><th className="border border-gray-200 p-3 text-left">US</th><th className="border border-gray-200 p-3 text-left">UK</th></tr></thead>
                <tbody>
                  {[["Avg KOC Commission","$20–$30","$50–$80","$40–$60"],["Shipping per Sample","$8–$15","$25–$40","$20–$35"],["5-KOC Campaign Total","$125–$175","$300–$450","$250–$350"],["Avg Engagement Rate","3–8%","3–6%","2–5%"],["Avg Conversion Rate","5–10%","5–12%","4–8%"]].map(([item,sea,us,uk])=>(
                    <tr key={item}><td className="border border-gray-200 p-3 font-medium">{item}</td><td className="border border-gray-200 p-3 font-bold text-green-600">{sea}</td><td className="border border-gray-200 p-3">{us}</td><td className="border border-gray-200 p-3">{uk}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          <Section id="sourcing" title="5. Finding Local KOCs in SEA Markets">
            <p><strong>Manual approach</strong>: Searching TikTok/Instagram for SEA creators is time-intensive and language barriers make vetting difficult. Ghosting rates remain 30–40%.</p>
            <p><strong>KOC Engine approach</strong>: AI matching + pledge protection eliminates both problems:</p>
            <ul>
              <li>AI scoring evaluates <strong>local language content quality</strong> and audience authenticity</li>
              <li>Matching engine prioritizes <strong>region-specific creators</strong> with category alignment</li>
              <li>10pt pledge guarantees <strong>content delivery</strong> — ghosting drops to &lt;1%</li>
              <li>Unified dashboard across all SEA markets — no need for separate local agencies</li>
            </ul>
          </Section>

          <Section id="logistics" title="6. Intra-Asia Shipping & Logistics">
            <p>Shipping from China to SEA markets is significantly cheaper and faster than China → US routes:</p>
            <ul>
              <li><strong>China → Thailand</strong>: 3–5 days, $8–$12 via SF-Express or local carriers</li>
              <li><strong>China → Vietnam</strong>: 2–3 days, $6–$10 (overland routes available)</li>
              <li><strong>China → Philippines</strong>: 5–7 days, $10–$15 (sea freight + local delivery)</li>
              <li><strong>China → Indonesia</strong>: 5–8 days, $12–$18</li>
              <li><strong>China → Malaysia</strong>: 3–5 days, $8–$12</li>
            </ul>
            <p>KOC Engine's tracking automation covers all major intra-Asia carriers with daily cron queries and delivery auto-confirmation.</p>
          </Section>

          <Section id="tiktok-shop" title="7. TikTok Shop Integration for Direct Conversion">
            <p>TikTok Shop is available in Thailand, Vietnam, and Philippines (2026). This is the most efficient conversion path in SEA:</p>
            <ol>
              <li>KOC creates product video on TikTok with your product tagged</li>
              <li>Viewer taps product card → purchases within TikTok (no redirect to external site)</li>
              <li>Commission tracked via TikTok Shop affiliate system</li>
              <li>Content continues generating sales for weeks — zero ongoing ad spend</li>
            </ol>
            <p>For brands using <strong>both TikTok Shop and Shopee</strong>, KOC content drives traffic to both channels simultaneously. This dual-channel attribution is unique to SEA markets and significantly increases per-KOC ROI.</p>
          </Section>

          <Section id="faq" title="8. Frequently Asked Questions">
            <div className="space-y-4 not-prose">
              {faqs.map((faq, i) => (
                <div key={i} className="bg-gray-50 rounded-xl p-4">
                  <h3 className="font-bold text-zinc-800 mb-2">{faq.q}</h3>
                  <p className="text-sm text-zinc-600">{faq.a}</p>
                </div>
              ))}
            </div>
          </Section>
        </div>

        <div className="bg-pink-50 border border-pink-200 rounded-2xl p-6 mt-12 text-center">
          <p className="font-bold text-pink-700 mb-2">Launch your first SEA KOC campaign — pledge-protected, AI-matched.</p>
          <Link href="/register?role=merchant" className="inline-block bg-gradient-to-r from-pink-500 to-purple-500 text-white px-8 py-3 rounded-full font-bold shadow-lg shadow-pink-200 hover:opacity-90 transition">🏢 Create Free Brand Account →</Link>
        </div>
      </article>
    </>
  );
}
