import type { Metadata } from "next";
import Link from "next/link";
import JsonLd from "@/components/JsonLd";

export const metadata: Metadata = {
  title: "KOC Engine Pricing — Pay Per Result, Not Per Subscription",
  description: "KOC Engine pricing model: pay only for delivered content, not monthly subscriptions. 1pt = $1 USD. No hidden fees, no agency markup. Compare with Modash ($299/mo) and Upfluence ($478/mo).",
  alternates: { canonical: "/pricing" },
};

const offerSchema = {
  "@context": "https://schema.org",
  "@type": "OfferCatalog",
  name: "KOC Engine Pricing Plans",
  description: "Pay-per-result pricing model for KOC marketing. No monthly subscription required.",
  offers: [
    {
      "@type": "Offer",
      name: "KOC Pledge",
      price: "10.00",
      priceCurrency: "USD",
      description: "Fixed pledge per accepted task slot. 9pt returned on completion, 1pt platform fee.",
    },
    {
      "@type": "Offer",
      name: "Platform Service Fee",
      price: "5.00",
      priceCurrency: "USD",
      description: "Per task publish fee (non-refundable).",
    },
  ],
};

const comparisonData = [
  ["KOC Engine", "$5/task + commission", "Per-result", "✅ Pledge escrow", "✅ Auto-matched"],
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
        <div className="mb-12">
          <Link href="/" className="text-sm text-pink-500 hover:text-pink-600 mb-4 inline-block">← KOC Engine</Link>
          <h1 className="text-4xl font-extrabold text-zinc-900 mb-4 leading-tight">
            Pricing: Pay for <span className="bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">Delivered Content</span>, Not Subscriptions
          </h1>
          <p className="text-lg text-zinc-500">No monthly fees. No hidden markups. You pay only when a KOC delivers approved content — guaranteed by our pledge economy.</p>
        </div>

        <section className="mb-16">
          <h2 className="text-2xl font-extrabold text-zinc-900 mb-6">How It Works: The Pledge Economy</h2>
          <div className="space-y-6">
            <div className="bg-pink-50 border border-pink-200 rounded-2xl p-6">
              <h3 className="font-bold text-pink-700 mb-3">1. Merchant Publishes a Task</h3>
              <p className="text-zinc-700">Deduct <strong>5pt ($5)</strong> platform service fee (non-refundable) + <strong>commission × koc_required</strong> commission pool (paid to KOCs on completion). Example: 3 KOCs × $50 commission = $150 commission pool + $5 fee = $155 total upfront.</p>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-2xl p-6">
              <h3 className="font-bold text-purple-700 mb-3">2. KOC Accepts & Pledges</h3>
              <p className="text-zinc-700">KOC deposits <strong>10pt ($10)</strong> fixed pledge. On completion: receives <strong>commission + 9pt ($9)</strong> back (1pt platform fee deducted). If they ghost: forfeit entire 10pt + Trust Score −15.</p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-2xl p-6">
              <h3 className="font-bold text-green-700 mb-3">3. Content Delivered → Payment Released</h3>
              <p className="text-zinc-700">Merchant approves content → KOC receives <strong>commission + 9pt</strong>. Both parties get <strong>Trust Score +3</strong>. Zero risk of non-delivery — the pledge makes ghosting economically irrational.</p>
            </div>
          </div>
        </section>

        <section className="mb-16">
          <h2 className="text-2xl font-extrabold text-zinc-900 mb-6">Fee Breakdown</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-200 p-3 text-left">Item</th>
                  <th className="border border-gray-200 p-3 text-left">Cost</th>
                  <th className="border border-gray-200 p-3 text-left">Who Pays</th>
                  <th className="border border-gray-200 p-3 text-left">Refundable?</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Platform Service Fee", "5pt ($5)", "Merchant", "No — per task publish"],
                  ["Commission Pool", "commission × koc_required", "Merchant", "No — paid to KOCs on completion"],
                  ["KOC Pledge", "10pt ($10)", "KOC", "9pt returned on completion"],
                  ["KOC Platform Fee", "1pt ($1)", "KOC", "No — deducted from pledge"],
                  ["Registration Bonus", "1,000pt / 5,000pt", "Platform grants", "Non-withdrawable (for pledges)"],
                ].map(([item, cost, who, refund]) => (
                  <tr key={item}>
                    <td className="border border-gray-200 p-3 font-medium">{item}</td>
                    <td className="border border-gray-200 p-3 font-bold">{cost}</td>
                    <td className="border border-gray-200 p-3">{who}</td>
                    <td className="border border-gray-200 p-3">{refund}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-sm text-zinc-400 mt-4"><strong>Exchange rate:</strong> 1pt = \$1 USD. Points are withdrawable after earning through commissions or referral rewards.</p>
        </section>

        <section className="mb-16">
          <h2 className="text-2xl font-extrabold text-zinc-900 mb-6">Cost Comparison: KOC Engine vs Alternatives</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-200 p-3 text-left">Platform</th>
                  <th className="border border-gray-200 p-3 text-left">Cost</th>
                  <th className="border border-gray-200 p-3 text-left">Model</th>
                  <th className="border border-gray-200 p-3 text-left">Delivery Guarantee</th>
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

        <section className="mb-16">
          <h2 className="text-2xl font-extrabold text-zinc-900 mb-6">Real-World Example: 3-KOC Campaign</h2>
          <div className="bg-gray-50 rounded-2xl p-6 space-y-2 text-sm">
            <p><strong>Product:</strong> Bluetooth Speaker (Amazon US)</p>
            <p><strong>Commission per KOC:</strong> 50pt ($50)</p>
            <p><strong>KOCs required:</strong> 3</p>
            <p className="border-t border-gray-200 pt-2"><strong>Merchant upfront:</strong> 5pt fee + 150pt commission pool = <strong>155pt ($155)</strong></p>
            <p><strong>KOC pledge:</strong> 10pt ($10) each × 3 = 30pt total from KOCs</p>
            <p className="border-t border-gray-200 pt-2"><strong>If all 3 deliver:</strong> Each KOC receives 50pt commission + 9pt = <strong>59pt ($59)</strong>. Merchant gets 3 pieces of verified content for $155 total.</p>
            <p><strong>If 1 ghosts:</strong> Ghosted KOC forfeits 10pt. Merchant gets that slot's commission back (50pt). Net cost: $105 for 2 delivered videos.</p>
          </div>
        </section>

        <section className="mb-12 bg-pink-50 border border-pink-200 rounded-2xl p-8 text-center">
          <p className="font-bold text-pink-700 mb-2">No subscription. No hidden fees. Pay only for results.</p>
          <Link href="/register?role=merchant" className="inline-block bg-gradient-to-r from-pink-500 to-purple-500 text-white px-8 py-3 rounded-full font-bold shadow-lg shadow-pink-200 hover:opacity-90 transition">🏢 Create Free Brand Account →</Link>
          <p className="text-sm text-zinc-500 mt-3">Merchants receive 5,000pt bonus on registration.</p>
        </section>
      </main>
    </>
  );
}
