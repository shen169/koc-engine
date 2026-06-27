import type { Metadata } from "next";
import Link from "next/link";
import JsonLd from "@/components/JsonLd";

export const metadata: Metadata = {
  title: "KOC Engine Pricing — Transparent Economics, Pay Per Result",
  description: "See exactly where every point goes. 1pt = $1 USD. 20-50pt commission range. Platform margin 46% at 30pt. No hidden fees.",
  alternates: { canonical: "/pricing" },
};

const offerSchema = {
  "@context": "https://schema.org",
  "@type": "OfferCatalog",
  name: "KOC Engine Pricing Plans",
  description: "Pay-per-result pricing. Free trial: KOC 200pt / Brand 100pt. Commission range 20-50pt. 1pt = $1 USD.",
  offers: [
    { "@type": "Offer", name: "Platform Service Fee", price: "5.00", priceCurrency: "USD", description: "Per task publish fee (non-refundable)." },
    { "@type": "Offer", name: "Platform Commission", price: "10%", priceCurrency: "USD", description: "10% of task commission per completed slot (min 1pt)." },
    { "@type": "Offer", name: "KOC Pledge", price: "10.00", priceCurrency: "USD", description: "Fixed pledge per slot. Fully returned to KOC on completion (bonus, non-withdrawable)." },
  ],
};

const comparisonData = [
  ["KOC Engine", "$5/task + 10% commission", "Per-result", "✅ Pledge escrow", "✅ AI auto-matched"],
  ["Modash", "$299–$999/mo", "Subscription", "❌ No guarantee", "❌ Manual outreach"],
  ["Upfluence", "$478+/mo", "Subscription", "❌ No escrow", "❌ CRM-based"],
  ["GRIN", "Custom pricing", "Enterprise", "❌ No escrow", "❌ Shopify-only"],
  ["Agency (MCN)", "$500–$2,000+", "Per campaign", "❌ 20-50% markup", "❌ Opaque"],
];

export default function PricingPage() {
  return (
    <>
      <JsonLd data={offerSchema} />
      <main className="max-w-3xl mx-auto px-6 py-16">

        {/* Hero */}
        <div className="mb-12">
          <Link href="/" className="text-sm text-pink-500 hover:text-pink-600 mb-4 inline-block">← KOC Engine</Link>
          <h1 className="text-4xl font-extrabold text-zinc-900 mb-4 leading-tight">
            Transparent Economics —{" "}
            <span className="bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">See Exactly Where Every Point Goes</span>
          </h1>
          <p className="text-lg text-zinc-500">
            No monthly fees. No hidden markups. We publish our full P&amp;L so you know exactly how the platform makes money.
          </p>
        </div>

        {/* 1. How Money Flows */}
        <section className="mb-16">
          <h2 className="text-2xl font-extrabold text-zinc-900 mb-6">💰 How Money Flows</h2>

          <div className="bg-white border border-zinc-200 rounded-2xl p-6 space-y-5 text-sm">
            {/* Step 1 */}
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-purple-500 text-white flex items-center justify-center font-extrabold text-xs shrink-0">1</div>
              <div className="flex-1">
                <p className="font-bold text-zinc-900">Brand Purchases Points</p>
                <p className="text-zinc-500 mt-0.5">
                  $1 real money = 1pt. <strong>Free trial: 100pt bonus</strong> on registration (~2 test tasks).
                  When trial runs out, brands pay to continue.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-pink-500 text-white flex items-center justify-center font-extrabold text-xs shrink-0">2</div>
              <div className="flex-1">
                <p className="font-bold text-zinc-900">Brand Publishes Task</p>
                <p className="text-zinc-500 mt-0.5">
                  Deducted from brand balance: <strong>5pt service fee</strong> (platform) +{" "}
                  <strong>commission × KOC count</strong> commission pool (held in escrow).<br />
                  Commission range: <strong>20–50pt per KOC</strong>.
                </p>
                <div className="mt-2 bg-purple-50 rounded-lg p-3 text-xs text-purple-800">
                  <strong>Example (1 KOC × 30pt):</strong> Brand pays 5 + 30 = <strong>35pt</strong>.
                  Commission pool: 30pt held in escrow.
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center font-extrabold text-xs shrink-0">3</div>
              <div className="flex-1">
                <p className="font-bold text-zinc-900">KOC Accepts &amp; Pledges</p>
                <p className="text-zinc-500 mt-0.5">
                  KOC deposits <strong>10pt fixed pledge</strong> (from bonus balance).{" "}
                  If KOC completes → pledge fully returned as bonus.<br />
                  If KOC ghosts → 10pt forfeited to platform.
                </p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-extrabold text-xs shrink-0">4</div>
              <div className="flex-1">
                <p className="font-bold text-zinc-900">KOC Delivers → Brand Approves</p>
                <p className="text-zinc-500 mt-0.5">
                  Commission pool splits:
                </p>
                <div className="mt-2 grid grid-cols-3 gap-3 text-xs">
                  <div className="bg-emerald-50 rounded-lg p-3 text-center">
                    <p className="text-emerald-700 font-bold text-lg">90%</p>
                    <p className="text-emerald-600 mt-0.5">KOC earns<br /><strong>withdrawable</strong></p>
                    <p className="text-emerald-500 mt-1">(27pt @30pt commission)</p>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-3 text-center">
                    <p className="text-purple-700 font-bold text-lg">10%</p>
                    <p className="text-purple-600 mt-0.5">Platform fee<br /><strong>revenue</strong></p>
                    <p className="text-purple-500 mt-1">(3pt @30pt commission)</p>
                  </div>
                  <div className="bg-amber-50 rounded-lg p-3 text-center">
                    <p className="text-amber-700 font-bold text-lg">10pt</p>
                    <p className="text-amber-600 mt-0.5">KOC pledge<br /><strong>returned (bonus)</strong></p>
                    <p className="text-amber-500 mt-1">(non-withdrawable)</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 5 */}
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-cyan-500 text-white flex items-center justify-center font-extrabold text-xs shrink-0">5</div>
              <div className="flex-1">
                <p className="font-bold text-zinc-900">KOC Withdraws Earnings</p>
                <p className="text-zinc-500 mt-0.5">
                  When KOC unlocks withdrawal: <strong>≥3 completed tasks</strong> AND{" "}
                  <strong>≥100pt withdrawable balance</strong>.{" "}
                  <strong className="text-rose-500">Daily cap: 500pt.</strong>{" "}
                  Withdrawn via PayPal or bank transfer at <strong>1pt = $1 USD</strong>.
                </p>
              </div>
            </div>
          </div>

          {/* Edge Cases */}
          <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
            <div className="bg-rose-50 border border-rose-100 rounded-xl p-3">
              <p className="font-bold text-rose-700">KOC Breach (Ghosts)</p>
              <p className="text-rose-600 mt-0.5">
                Commission → refunded to brand (bonus). KOC 10pt pledge → forfeited to platform. KOC Trust Score −15.
              </p>
            </div>
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
              <p className="font-bold text-amber-700">Brand Breach (No Ship)</p>
              <p className="text-amber-600 mt-0.5">
                Commission pool → forfeited to platform. KOC pledge → refunded. Brand Trust Score −20.
              </p>
            </div>
          </div>
        </section>

        {/* 2. Platform Revenue Transparency */}
        <section className="mb-16">
          <h2 className="text-2xl font-extrabold text-zinc-900 mb-6">📊 Platform Revenue Model</h2>

          <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="p-3 text-left font-semibold">Revenue Source</th>
                  <th className="p-3 text-left font-semibold">Amount</th>
                  <th className="p-3 text-left font-semibold">When</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {[
                  ["Platform Service Fee", "5pt ($5)", "Every task publish — pure platform revenue"],
                  ["Commission Fee", "10% of commission (min 1pt)", "KOC completes + brand approves"],
                  ["KOC Breach Forfeiture", "10pt ($10)", "KOC fails to submit content within 14 days"],
                  ["Brand Breach Forfeiture", "Full commission pool", "Brand fails to ship within 48 hours"],
                ].map(([source, amount, when]) => (
                  <tr key={source}>
                    <td className="p-3 font-medium text-zinc-800">{source}</td>
                    <td className="p-3 font-bold text-purple-600">{amount}</td>
                    <td className="p-3 text-zinc-500">{when}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Margin transparency box */}
          <div className="mt-6 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-2xl p-6">
            <h3 className="font-extrabold text-purple-900 mb-3">💡 Platform Margin: 46% at 30pt Commission</h3>
            <div className="space-y-2 text-sm text-purple-800">
              <p><strong>Per $100 brand充值:</strong></p>
              <div className="bg-white/60 rounded-lg p-3 space-y-1">
                <p>→ Brand pays $100 real money → gets 100pt</p>
                <p>→ Publishes 2 tasks (2 × 35pt = 70pt, 30pt leftover)</p>
                <p>→ Platform keeps: 2 × 5pt service fee + 2 × 3pt commission fee = <strong>$16</strong></p>
                <p>→ KOC earns: 2 × 27pt = 54pt withdrawable (<strong>$54 cash liability</strong>)</p>
                <p className="font-extrabold text-purple-900 mt-2">→ Platform net: $100 − $54 = <strong>$46 (46% margin)</strong></p>
              </div>
              <p className="text-xs text-purple-500 mt-2">
                Higher commission = higher margin. @50pt: 55% margin. @20pt: 28% margin.<br />
                Brand breach forfeitures and KOC non-withdrawal are additional upside (not counted in margin).
              </p>
            </div>
          </div>
        </section>

        {/* 3. Fee Breakdown + Withdrawal Rules */}
        <section className="mb-16">
          <h2 className="text-2xl font-extrabold text-zinc-900 mb-6">💳 Cost &amp; Withdrawal Reference</h2>

          <div className="overflow-x-auto mb-8">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-200 p-3 text-left">Item</th>
                  <th className="border border-gray-200 p-3 text-left">Amount</th>
                  <th className="border border-gray-200 p-3 text-left">Who Pays</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Platform Service Fee", "5pt ($5)", "Brand — per task, non-refundable"],
                  ["Commission Pool", "20–50pt × KOC count", "Brand — held in escrow, paid to KOCs on completion"],
                  ["Platform Commission", "10% of commission (min 1pt)", "Split from KOC earnings — platform revenue"],
                  ["KOC Pledge", "10pt ($10)", "KOC — fully returned on completion (bonus, not withdrawable)"],
                  ["KOC Registration", "200pt bonus", "Platform grants — non-withdrawable, for pledges/tasks"],
                  ["Brand Registration", "100pt bonus", "Platform grants — non-withdrawable, ~2 test tasks"],
                  ["KOC Withdrawal", "1pt = $1 USD", "KOC only — PayPal / bank transfer"],
                ].map(([item, amount, who]) => (
                  <tr key={item}>
                    <td className="border border-gray-200 p-3 font-medium">{item}</td>
                    <td className="border border-gray-200 p-3 font-bold">{amount}</td>
                    <td className="border border-gray-200 p-3 text-zinc-500">{who}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Withdrawal rules */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
            <h3 className="font-extrabold text-amber-900 mb-4">🔐 KOC Withdrawal Rules</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              {[
                { icon: "✅", title: "≥3 Completed Tasks", desc: "Must complete at least 3 tasks before withdrawal unlocks." },
                { icon: "💵", title: "≥100pt Withdrawable", desc: "Must accumulate ≥100pt withdrawable balance. At 30pt commission: 4 completions = 108pt." },
                { icon: "🚫", title: "Brands Cannot Withdraw", desc: "All brand points are for publishing tasks only. Hard rejection on withdrawal attempt." },
                { icon: "🕐", title: "Daily Cap: 500pt", desc: "Maximum 500pt withdrawal per 24-hour window. Prevents large cash-outs. Contact admin for exceptions." },
                { icon: "💰", title: "1pt = $1.00 USD", desc: "Exchange rate fixed at parity. Paid via PayPal or bank transfer." },
                { icon: "⚠️", title: "Bonus ≠ Cash", desc: "Registration bonus and pledge returns are NOT withdrawable. Only commission earnings (90%) can be withdrawn." },
              ].map(({ icon, title, desc }) => (
                <div key={title} className="bg-white rounded-xl p-3 flex gap-3">
                  <span className="text-lg shrink-0">{icon}</span>
                  <div>
                    <p className="font-bold text-zinc-800">{title}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 4. Real Examples */}
        <section className="mb-16">
          <h2 className="text-2xl font-extrabold text-zinc-900 mb-6">🧮 Real-World Examples</h2>

          <div className="space-y-4">
            {/* Example 1 */}
            <div className="bg-white border border-zinc-200 rounded-2xl p-6">
              <h3 className="font-bold text-zinc-900 mb-3">Example A: 1 KOC × 30pt Commission</h3>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="bg-purple-50 rounded-xl p-3">
                  <p className="text-xs text-purple-500 mb-1">Brand Pays</p>
                  <p className="font-extrabold text-purple-700 text-lg">35pt</p>
                  <p className="text-xs text-purple-500">5pt fee + 30pt pool</p>
                </div>
                <div className="bg-emerald-50 rounded-xl p-3">
                  <p className="text-xs text-emerald-500 mb-1">KOC Earns</p>
                  <p className="font-extrabold text-emerald-700 text-lg">37pt</p>
                  <p className="text-xs text-emerald-500">27pt withdrawable + 10pt bonus</p>
                </div>
                <div className="bg-pink-50 rounded-xl p-3">
                  <p className="text-xs text-pink-500 mb-1">Platform Keeps</p>
                  <p className="font-extrabold text-pink-700 text-lg">8pt</p>
                  <p className="text-xs text-pink-500">5pt fee + 3pt commission</p>
                </div>
              </div>
              <p className="text-xs text-zinc-400 mt-3">
                At this rate, KOC needs 4 completions (108pt) to reach the 100pt withdrawal threshold. Brand can publish 2 tasks with free trial (70pt).
              </p>
            </div>

            {/* Example 2 */}
            <div className="bg-white border border-zinc-200 rounded-2xl p-6">
              <h3 className="font-bold text-zinc-900 mb-3">Example B: Brand Buys $100 of Points</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-2 border-b border-zinc-100">
                  <span className="text-zinc-500">Brand充值</span>
                  <span className="font-bold text-purple-700">+$100 (100pt bonus)</span>
                </div>
                <div className="flex justify-between py-2 border-b border-zinc-100">
                  <span className="text-zinc-500">Publish 2 tasks (1 KOC × 30pt each)</span>
                  <span className="font-bold text-rose-600">−70pt (5+30) × 2</span>
                </div>
                <div className="flex justify-between py-2 border-b border-zinc-100">
                  <span className="text-zinc-500">Remaining brand balance</span>
                  <span className="font-bold text-zinc-600">30pt</span>
                </div>
                <div className="flex justify-between py-2 border-b border-zinc-100">
                  <span className="text-zinc-500">Platform service fees</span>
                  <span className="font-bold text-purple-600">+$10</span>
                </div>
                <div className="flex justify-between py-2 border-b border-zinc-100">
                  <span className="text-zinc-500">Platform commission fees (10%)</span>
                  <span className="font-bold text-purple-600">+$6</span>
                </div>
                <div className="flex justify-between py-2 border-b border-zinc-100">
                  <span className="text-zinc-500">KOC withdrawable earnings</span>
                  <span className="font-bold text-emerald-600">−$54</span>
                </div>
                <div className="flex justify-between py-2 bg-purple-50 rounded-lg px-3 -mx-1 mt-2">
                  <span className="font-extrabold text-purple-900">Platform Net Profit</span>
                  <span className="font-extrabold text-purple-700">$46 (46% margin)</span>
                </div>
              </div>
              <p className="text-xs text-zinc-400 mt-3">
                KOC earns 54pt withdrawable (2 × 27pt). Needs 2 more completions from another brand to reach 100pt withdrawal threshold.
                If KOC never withdraws, platform keeps 100% of $100.
              </p>
            </div>
          </div>
        </section>

        {/* 5. Cost Comparison */}
        <section className="mb-16">
          <h2 className="text-2xl font-extrabold text-zinc-900 mb-6">🏷️ Cost Comparison</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-200 p-3 text-left">Platform</th>
                  <th className="border border-gray-200 p-3 text-left">Cost</th>
                  <th className="border border-gray-200 p-3 text-left">Model</th>
                  <th className="border border-gray-200 p-3 text-left">Guarantee</th>
                  <th className="border border-gray-200 p-3 text-left">Matching</th>
                </tr>
              </thead>
              <tbody>
                {comparisonData.map(([platform, cost, model, guarantee, matching]) => (
                  <tr key={platform}>
                    <td className={`border border-gray-200 p-3 ${platform === "KOC Engine" ? "font-bold text-pink-600" : "font-medium"}`}>{platform}</td>
                    <td className="border border-gray-200 p-3">{cost}</td>
                    <td className="border border-gray-200 p-3">{model}</td>
                    <td className="border border-gray-200 p-3">{guarantee}</td>
                    <td className="border border-gray-200 p-3">{matching}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* CTA */}
        <section className="mb-8 bg-gradient-to-r from-pink-50 to-purple-50 border border-pink-200 rounded-2xl p-8 text-center">
          <p className="font-bold text-pink-700 mb-2">No subscription. No hidden fees. Economics you can verify.</p>
          <Link href="/register?role=merchant" className="inline-block bg-gradient-to-r from-pink-500 to-purple-500 text-white px-8 py-3 rounded-full font-bold shadow-lg shadow-pink-200 hover:opacity-90 transition">
            🏢 Create Free Brand Account →
          </Link>
          <p className="text-sm text-zinc-500 mt-3">
            Brands: <strong>100pt free trial</strong> (~2 test tasks). KOCs: <strong>200pt</strong> free trial.{" "}
            <Link href="/rules" className="text-pink-500 underline">Read full platform rules →</Link>
          </p>
        </section>

        <footer className="text-center text-sm text-zinc-400 pb-12 border-t border-zinc-100 pt-8">
          <p>
            Questions about pricing or withdrawals? Contact admin:{" "}
            <a href="mailto:honghuishen24@gmail.com" className="text-pink-500 hover:text-pink-600 underline">honghuishen24@gmail.com</a>
          </p>
        </footer>
      </main>
    </>
  );
}
