import type { Metadata } from "next";
import Link from "next/link";
import JsonLd from "@/components/JsonLd";
import { breadcrumbSchema, webPageSchema } from "@/lib/schema";

export const metadata: Metadata = {
  title: "Terms of Service — KOC Engine",
  description: "KOC Engine terms of service. Platform rules, user obligations, commission & pledge terms, dispute resolution, and liability. Last updated July 2026.",
  alternates: { canonical: "/terms" },
  robots: { index: true, follow: false },
};

export default function TermsPage() {
  return (
    <>
      <JsonLd data={breadcrumbSchema([{ name: "Home", url: "https://kocengine.com" }, { name: "Terms of Service", url: "https://kocengine.com/terms" }])} />
      <JsonLd data={webPageSchema({ name: "Terms of Service — KOC Engine", description: "Platform rules, user obligations, commission & pledge terms, dispute resolution, and liability.", url: "https://kocengine.com/terms" })} />
      <main className="max-w-3xl mx-auto px-6 py-16 prose prose-zinc max-w-none">
        <div className="mb-12 not-prose">
          <Link href="/" className="text-sm text-pink-500 hover:text-pink-600 mb-4 inline-block">← KOC Engine</Link>
          <h1 className="text-4xl font-extrabold text-zinc-900 mb-4 leading-tight">Terms of Service</h1>
          <p className="text-sm text-zinc-500">Last updated: July 3, 2026</p>
        </div>

        <section className="mb-10">
          <h2>1. Acceptance of Terms</h2>
          <p>By accessing or using KOC Engine ("the Platform"), you agree to be bound by these Terms of Service. If you do not agree, do not use the Platform.</p>
          <p>KOC Engine is operated by an independent developer. The Platform connects cross-border e-commerce brands ("Brands", "Merchants") with content creators ("KOCs", "Creators") for product collaboration.</p>
        </section>

        <section className="mb-10">
          <h2>2. Platform Role</h2>
          <p>KOC Engine is a <strong>matching and escrow platform</strong>, not an employer, agency, or contractor of any user. We provide:</p>
          <ul>
            <li>AI-powered matching between Brands and KOCs</li>
            <li>Escrow holding of commission pools</li>
            <li>Pledge management and forfeiture enforcement</li>
            <li>AI-powered dispute resolution</li>
            <li>Fraud detection and trust scoring</li>
          </ul>
          <p>We do not guarantee the quality of creator content, the accuracy of brand product descriptions, or the outcome of any collaboration.</p>
        </section>

        <section className="mb-10">
          <h2>3. User Accounts</h2>
          <ul>
            <li>You must provide accurate and complete registration information.</li>
            <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
            <li>You may not create multiple accounts to circumvent platform rules or trust scores.</li>
            <li>One person may not operate both a Brand and a KOC account simultaneously. This is a Red Line violation and will result in permanent ban.</li>
            <li>We reserve the right to suspend or terminate accounts that violate these terms.</li>
          </ul>
        </section>

        <section className="mb-10">
          <h2>4. Points & Payments</h2>
          <h3>4.1 Point System</h3>
          <ul>
            <li>Platform currency: 1pt = $1.00 USD.</li>
            <li>Points are classified as <strong>bonus</strong> (non-withdrawable, for pledges and platform activities) or <strong>withdrawable</strong> (real cash earned from completed tasks).</li>
            <li>Registration bonuses (Brand: 100pt, KOC: 200pt) are bonus points only.</li>
            <li>KOC commission earnings (90% of task commission) are withdrawable.</li>
          </ul>

          <h3>4.2 Brand Payments</h3>
          <ul>
            <li>Brands pay real money to purchase points at 1pt = $1 USD.</li>
            <li>Each task publication costs 5pt platform service fee (non-refundable) + commission pool (20-50pt per KOC, held in escrow).</li>
            <li>Commission pool is non-refundable once a KOC accepts the task, unless the KOC breaches.</li>
          </ul>

          <h3>4.3 KOC Withdrawals</h3>
          <ul>
            <li>KOCs may withdraw earnings after meeting requirements: ≥3 completed tasks AND ≥100pt withdrawable balance.</li>
            <li>Daily withdrawal cap: 500pt.</li>
            <li>Withdrawals are processed via PayPal or bank transfer at 1pt = $1 USD.</li>
            <li>Platform reserves the right to delay withdrawals for fraud review (up to 48 hours).</li>
          </ul>
        </section>

        <section className="mb-10">
          <h2>5. Pledge & Escrow System</h2>
          <h3>5.1 KOC Pledge</h3>
          <ul>
            <li>KOC deposits 10pt fixed pledge per accepted task (from bonus balance).</li>
            <li>Pledge is fully returned as bonus on successful task completion.</li>
            <li>Pledge is forfeited if KOC fails to submit content within 14 days (ghosting).</li>
          </ul>

          <h3>5.2 Brand Escrow</h3>
          <ul>
            <li>Brand pre-pays the full commission pool upon task publication.</li>
            <li>Commission is released to KOC only after brand-approved content delivery.</li>
            <li>Commission is refunded to brand if KOC breaches.</li>
            <li>Commission is forfeited to platform if brand fails to ship within 48 hours.</li>
          </ul>
        </section>

        <section className="mb-10">
          <h2>6. Task SLA & Deadlines</h2>
          <table className="not-prose w-full text-sm border-collapse my-4">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-200 p-3 text-left">Milestone</th>
                <th className="border border-gray-200 p-3 text-left">Deadline</th>
                <th className="border border-gray-200 p-3 text-left">Breach Penalty</th>
              </tr>
            </thead>
            <tbody>
              <tr><td className="border border-gray-200 p-3">Brand ships product</td><td className="border border-gray-200 p-3">48 hours from task acceptance</td><td className="border border-gray-200 p-3">Commission forfeited, KOC pledge refunded, Trust Score -20</td></tr>
              <tr><td className="border border-gray-200 p-3">KOC submits content</td><td className="border border-gray-200 p-3">14 days from delivery receipt</td><td className="border border-gray-200 p-3">Commission refunded, pledge forfeited, Trust Score -15</td></tr>
              <tr><td className="border border-gray-200 p-3">Brand reviews content</td><td className="border border-gray-200 p-3">4 days from submission</td><td className="border border-gray-200 p-3">Auto-approved</td></tr>
              <tr><td className="border border-gray-200 p-3">KOC revision (if rejected)</td><td className="border border-gray-200 p-3">3 days from rejection</td><td className="border border-gray-200 p-3">AI judgment triggered</td></tr>
            </tbody>
          </table>
        </section>

        <section className="mb-10">
          <h2>7. Dispute Resolution</h2>
          <ol>
            <li><strong>Brand Review:</strong> Brand reviews submitted content within 4 days. If rejected, KOC gets one revision chance (3 days).</li>
            <li><strong>AI Judgment:</strong> If brand rejects the revision, DeepSeek v4 AI performs impartial content judgment against the original task requirements.</li>
            <li><strong>AI Decision is Final:</strong> The AI judgment determines whether commission is released to KOC or refunded to brand. There is no further appeal within the platform.</li>
          </ol>
        </section>

        <section className="mb-10">
          <h2>8. Prohibited Conduct</h2>
          <p>The following are strictly prohibited and constitute Red Line violations:</p>
          <ul>
            <li>Operating both Brand and KOC accounts (self-dealing)</li>
            <li>Fake shipping (providing false tracking information)</li>
            <li>Submitting plagiarized or stolen content</li>
            <li>Collusion between specific Brand-KOC pairs (100% approval rates with no other activity)</li>
            <li>Using bots or automated scripts to interact with the platform</li>
            <li>Attempting to circumvent pledge or escrow mechanisms</li>
            <li>Harassment, threats, or abusive behavior toward other users</li>
          </ul>
          <p>Violations trigger automatic enforcement: assets confiscated, active tasks cancelled, innocent party refunded. First offense: account frozen with one chance to rectify. Second offense: permanent ban.</p>
        </section>

        <section className="mb-10">
          <h2>9. Trust Score & Tiers</h2>
          <ul>
            <li>All users are assigned a behavioral Trust Score based on platform activity.</li>
            <li>Trust Scores affect matching priority, task visibility, and may affect pledge requirements.</li>
            <li>Trust Scores are calculated algorithmically based on completion rates, SLA adherence, dispute outcomes, and platform tenure.</li>
            <li>We reserve the right to adjust scoring algorithms. Material changes will be announced.</li>
          </ul>
        </section>

        <section className="mb-10">
          <h2>10. Intellectual Property</h2>
          <ul>
            <li><strong>Creator Content:</strong> KOCs retain ownership of content they create. By submitting content through the platform, KOCs grant the collaborating Brand a non-exclusive license to use the content for marketing purposes.</li>
            <li><strong>Platform:</strong> KOC Engine's codebase, design, algorithms, and branding are the intellectual property of the platform operator.</li>
            <li><strong>Brand Products:</strong> Brands retain all rights to their products, trademarks, and brand assets.</li>
          </ul>
        </section>

        <section className="mb-10">
          <h2>11. Limitation of Liability</h2>
          <p>KOC Engine is provided "as is" without warranties of any kind, either express or implied. To the fullest extent permitted by law:</p>
          <ul>
            <li>We are not liable for disputes between Brands and KOCs beyond the escrowed amounts.</li>
            <li>We are not liable for the quality, safety, or legality of products shipped by Brands.</li>
            <li>We are not liable for the accuracy or authenticity of content created by KOCs.</li>
            <li>Our maximum liability for any claim is limited to the platform fees paid by the claimant in the preceding 30 days.</li>
          </ul>
        </section>

        <section className="mb-10">
          <h2>12. Changes to Terms</h2>
          <p>We may update these Terms of Service from time to time. Material changes will be communicated via email or platform notification. Continued use of the platform after changes constitutes acceptance of the updated terms.</p>
        </section>

        <section className="mb-10">
          <h2>13. Contact</h2>
          <p>
            For questions about these Terms of Service, contact us at{" "}
            <a href="mailto:honghuishen24@gmail.com">honghuishen24@gmail.com</a>.
          </p>
        </section>
      </main>
    </>
  );
}
