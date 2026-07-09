import type { Metadata } from "next";
import Link from "next/link";
import JsonLd from "@/components/JsonLd";

export const metadata: Metadata = {
  title: "From L1 to L3 — The KOC Level-Up System: Why We Designed It Like an RPG, Not a SaaS",
  description: "Most platforms have tiers based on how much you PAY. Ours is based on how much you've PROVEN. Learn how KOC Engine's L1→L2→L3 progression turns trust into a game mechanic.",
  alternates: { canonical: "/blog/koc-level-up-system" },
};

const articleSchema = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "From L1 to L3 — The KOC Level-Up System: Why We Designed It Like an RPG, Not a SaaS",
  description: "How KOC Engine's tier progression turns trust into a game mechanic. Everyone starts at L1. Prove yourself. Level up. It's that simple — and that powerful.",
  author: { "@type": "Person", name: "Jojo Shen", url: "https://github.com/shen169" },
  datePublished: "2026-07-09",
  dateModified: "2026-07-09",
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

export default function LevelUpPage() {
  const faqs = [
    { q: "How long does it take to go from L1 to L3?", a: "A motivated creator can reach L2 in about 2–3 weeks (completing 3 sample tasks). L3 typically takes 1–2 months of consistent delivery + maintaining a good rating. The system rewards consistency, not speed. Completing 5 tasks with 4.0+ rating and Trust Score ≥ 55 unlocks L3." },
    { q: "Can I lose my tier?", a: "Yes — and that's by design. Trust Score below 30 sends you back to L1. This can happen from ghosting, repeated late submissions, or violations. But it's not permanent — complete tasks again and rebuild. The system is designed to be a safety net, not a permanent mark." },
    { q: "Why doesn't my existing social media following count?", a: "Because trust isn't portable yet. Your Instagram reputation doesn't tell us if you'll deliver on THIS platform with THESE rules. Everyone starts equal — your work on KOC Engine is what builds your reputation here. This prevents 'imported reputation' gaming that's common on other platforms." },
    { q: "Do merchants have a similar tier system?", a: "Yes — M1 (Bronze), M2 (Silver), M3 (Gold). Same rules: upgrade by completing tasks, downgrade by failing to deliver. Both sides of the marketplace are held to the same standard." },
  ];

  return (
    <>
      <JsonLd data={articleSchema} />
      <article className="max-w-3xl mx-auto px-6 py-16">
        <div className="mb-12">
          <Link href="/" className="text-sm text-pink-500 hover:text-pink-600 mb-4 inline-block">← KOC Engine</Link>
          <h1 className="text-4xl font-extrabold text-zinc-900 mb-4 leading-tight">From L1 to L3 — The KOC Level-Up System Designed Like an RPG</h1>
          <p className="text-lg text-zinc-500">Most platforms have tiers based on how much you PAY. Ours is based on how much you've PROVEN. The difference matters.</p>
          <div className="flex items-center gap-3 mt-6 text-sm text-zinc-400"><span>July 2026</span><span>·</span><span>7 min read</span></div>
        </div>

        <nav className="bg-gray-50 rounded-2xl p-6 mb-12">
          <h2 className="font-bold text-zinc-800 mb-3">Table of Contents</h2>
          <ol className="space-y-1 text-sm text-zinc-600 list-decimal list-inside">
            <li><a href="#everyone-starts-l1">Everyone Starts at L1 — No Exceptions</a></li>
            <li><a href="#l1-sample">L1 Explorer: The Sample Phase</a></li>
            <li><a href="#l2-creator">L2 Creator: Commission Unlocks</a></li>
            <li><a href="#l3-partner">L3 Partner: Premium Tier</a></li>
            <li><a href="#downgrade">The Downgrade Path (Equally Important)</a></li>
            <li><a href="#rpg-vs-vip">RPG Logic vs. VIP Logic</a></li>
            <li><a href="#design-principles">The Game Design Principles</a></li>
            <li><a href="#marketplace-impact">What This Does to the Marketplace</a></li>
            <li><a href="#faq">Frequently Asked Questions</a></li>
          </ol>
        </nav>

        <div className="prose prose-zinc max-w-none space-y-12">
          <Section id="everyone-starts-l1" title="1. Everyone Starts at L1 — No Exceptions">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 not-prose mb-4">
              <p className="text-lg font-bold text-amber-700">Doesn't matter if you have 100K followers on TikTok. Doesn't matter if you've done 50 brand deals elsewhere. On KOC Engine, you start at L1.</p>
              <p className="text-sm text-amber-600">Because trust isn't portable yet. Your Instagram reputation doesn't tell us if you'll deliver on THIS platform, with THESE rules. L1 = "Prove yourself first."</p>
            </div>
            <p>This is the most controversial design decision we made. Other platforms let you import your social stats and immediately access high-value deals. We don't.</p>
            <p>Why? Because imported reputation is the #1 attack vector for fraud. A creator with 200K followers can still ghost after receiving a free product. Follower count tells you about audience — nothing about reliability.</p>
          </Section>

          <Section id="l1-sample" title="2. L1 Explorer: The Sample Phase">
            <div className="not-prose grid gap-4 mb-4">
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <h3 className="font-bold text-zinc-800 mb-3">L1 Explorer — Requirements &amp; Limits</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="bg-gray-50 rounded-lg p-2"><span className="text-zinc-500">Task Type</span><br /><span className="font-bold">Sample only</span></div>
                  <div className="bg-gray-50 rounded-lg p-2"><span className="text-zinc-500">Concurrent Tasks</span><br /><span className="font-bold">Max 2</span></div>
                  <div className="bg-gray-50 rounded-lg p-2"><span className="text-zinc-500">Pledge</span><br /><span className="font-bold">5pt ($5)</span></div>
                  <div className="bg-gray-50 rounded-lg p-2"><span className="text-zinc-500">Commission</span><br /><span className="font-bold">Product only</span></div>
                </div>
              </div>
            </div>
            <p>L1 is the proving ground. You receive free products, create content, and build your first track record. ~80% of creators complete their first sample. ~20% don't — and those 20% filtered themselves out at the stage where the stakes are lowest for everyone.</p>
            <p>This is the beauty of level-gating: <strong>bad actors don't get banned — they never get past L1.</strong></p>
          </Section>

          <Section id="l2-creator" title="3. L2 Creator: Commission Unlocks">
            <div className="not-prose grid gap-4 mb-4">
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                <h3 className="font-bold text-purple-700 mb-3">L2 Creator — Unlocked After 3 Tasks + Rating ≥ 3.0</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="bg-white rounded-lg p-2"><span className="text-zinc-500">Task Type</span><br /><span className="font-bold">Commission (20–50pt)</span></div>
                  <div className="bg-white rounded-lg p-2"><span className="text-zinc-500">Concurrent Tasks</span><br /><span className="font-bold">Max 3</span></div>
                  <div className="bg-white rounded-lg p-2"><span className="text-zinc-500">Pledge</span><br /><span className="font-bold">= Commission amount</span></div>
                  <div className="bg-white rounded-lg p-2"><span className="text-zinc-500">Merchant Match</span><br /><span className="font-bold">M1–M2</span></div>
                </div>
              </div>
            </div>
            <p>This is where it gets real. You're no longer "trying this out." You're working. The pledge goes up because the stakes go up — pledge equals commission amount, meaning a 30pt task requires a 30pt deposit. But so does the earning potential.</p>
            <p>Creators who hit L2 typically complete 2–3 commission tasks before naturally progressing toward L3. The system is designed to make the next level always visible and achievable.</p>
          </Section>

          <Section id="l3-partner" title="4. L3 Partner: Premium Tier">
            <div className="not-prose grid gap-4 mb-4">
              <div className="bg-gradient-to-br from-pink-50 to-purple-50 border border-pink-200 rounded-xl p-4">
                <h3 className="font-bold text-pink-700 mb-3">L3 Partner — Unlocked After 5 Tasks + Trust ≥ 55 + Rating ≥ 3.0</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="bg-white rounded-lg p-2"><span className="text-zinc-500">Task Type</span><br /><span className="font-bold">Premium (up to 500pt)</span></div>
                  <div className="bg-white rounded-lg p-2"><span className="text-zinc-500">Concurrent Tasks</span><br /><span className="font-bold">Max 5</span></div>
                  <div className="bg-white rounded-lg p-2"><span className="text-zinc-500">Pledge</span><br /><span className="font-bold">Lower effective rate</span></div>
                  <div className="bg-white rounded-lg p-2"><span className="text-zinc-500">Merchant Match</span><br /><span className="font-bold">M1–M3 (all)</span></div>
                </div>
              </div>
            </div>
            <p>L3 creators are the top tier. They get first access to the best tasks, highest commissions (up to 500pt = $500), and priority matching. Their Trust Score is a genuine asset — a portable reputation that signals reliability to every brand on the platform.</p>
            <p>At L3, the system implicitly trusts you. Your history IS your collateral. The pledge becomes a formality, not a barrier.</p>
          </Section>

          <Section id="downgrade" title="5. The Downgrade Path (Equally Important)">
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 not-prose">
              <p className="text-sm font-bold text-red-700">Trust Score &lt; 30 → back to L1. Downgrades aren't punishment. They're the system saying: "something changed. Prove yourself again."</p>
            </div>
            <p>And you CAN come back. Complete tasks. Rebuild trust. It's not a permanent mark.</p>
            <p>What triggers downgrade:</p>
            <ul>
              <li><strong>Ghosting a task:</strong> Trust Score −20</li>
              <li><strong>Violation (fake content, repeated late submissions):</strong> Trust Score −15</li>
              <li><strong>Active rejection:</strong> Trust Score −3</li>
              <li><strong>Report upheld:</strong> Trust Score −30</li>
            </ul>
            <p>This symmetry is critical — merchants face the same downgrade logic. No double standards.</p>
          </Section>

          <Section id="rpg-vs-vip" title="6. RPG Logic vs. VIP Logic">
            <div className="overflow-x-auto not-prose">
              <table className="w-full text-sm border-collapse">
                <thead><tr className="bg-gray-50"><th className="border border-gray-200 p-3 text-left">Dimension</th><th className="border border-gray-200 p-3 text-left">VIP (Most Platforms)</th><th className="border border-gray-200 p-3 text-left">RPG (KOC Engine)</th></tr></thead>
                <tbody>
                  {[
                    ["How to Advance","Pay more → unlock more","Prove more → unlock more"],
                    ["Tier Meaning","Function of your wallet","Function of your track record"],
                    ["Platform Incentive","Push you to spend","Reward good behavior"],
                    ["Your Incentive","Spend enough to unlock features","Complete tasks reliably"],
                    ["Correlation with Reliability","Zero. You can pay to reach top tier and still ghost.","Direct. Every tier level requires proven delivery."],
                  ].map(([dim, vip, rpg]) => (
                    <tr key={dim}>
                      <td className="border border-gray-200 p-3 font-medium">{dim}</td>
                      <td className="border border-gray-200 p-3 text-red-600">{vip}</td>
                      <td className="border border-gray-200 p-3 font-bold text-green-600">{rpg}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          <Section id="design-principles" title="7. The Game Design Principles We Used">
            <ul>
              <li><strong>Clear level requirements:</strong> No guessing what you need to advance.</li>
              <li><strong>Visible progress:</strong> You can see you're 1 task away from L2.</li>
              <li><strong>Rewards that match risk:</strong> Higher tier = higher rewards = higher stakes.</li>
              <li><strong>A safety net:</strong> Downgrade, not permaban. You can always rebuild.</li>
              <li><strong>Everyone starts equal:</strong> No "imported reputation" shortcuts.</li>
            </ul>
            <p>This isn't gamification for engagement's sake. It's gamification as <strong>trust infrastructure</strong>.</p>
          </Section>

          <Section id="marketplace-impact" title="8. What This Does to the Marketplace">
            <ul>
              <li><strong>Brands can filter by tier.</strong> Want proven reliability? L3 only. Want to give new creators a chance? Open to L1.</li>
              <li><strong>Creators have a clear path.</strong> Not "get lucky with one viral video." Just "complete tasks, get rated well, level up."</li>
              <li><strong>The platform gets cleaner signals.</strong> L2 means something concrete. It's not a vanity metric.</li>
            </ul>
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 not-prose mt-4">
              <p className="text-sm font-bold text-green-700">The most satisfying thing we see: A creator joins. Completes their first L1 sample. Gets rated 4.0. Does two more. Hits L2. Takes their first 30pt commission task. Delivers. Gets paid. Comes back and asks: "What do I need for L3?"</p>
              <p className="text-xs text-green-600 mt-1">That's the system working. Not "how do I hack this?" — "how do I earn this?"</p>
            </div>
          </Section>

          <Section id="faq" title="9. Frequently Asked Questions">
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
          <p className="font-bold text-pink-700 mb-2">Ready to start your KOC journey at L1?</p>
          <Link href="/register?role=koc" className="inline-block bg-gradient-to-r from-pink-500 to-purple-500 text-white px-8 py-3 rounded-full font-bold shadow-lg shadow-pink-200 hover:opacity-90 transition">🎬 Sign Up as a Creator — Start at L1 →</Link>
        </div>
      </article>
    </>
  );
}
