import type { Metadata } from "next";
import Link from "next/link";
import JsonLd from "@/components/JsonLd";
import { breadcrumbSchema, webPageSchema } from "@/lib/schema";

export const metadata: Metadata = {
  title: "Privacy Policy — KOC Engine",
  description: "KOC Engine privacy policy. How we collect, use, and protect your data. Last updated July 2026.",
  alternates: { canonical: "/privacy" },
  robots: { index: true, follow: false },
};

export default function PrivacyPage() {
  return (
    <>
      <JsonLd data={breadcrumbSchema([{ name: "Home", url: "https://kocengine.com" }, { name: "Privacy Policy", url: "https://kocengine.com/privacy" }])} />
      <JsonLd data={webPageSchema({ name: "Privacy Policy — KOC Engine", description: "How KOC Engine collects, uses, and protects your data.", url: "https://kocengine.com/privacy" })} />
      <main className="max-w-3xl mx-auto px-6 py-16 prose prose-zinc max-w-none">
        <div className="mb-12 not-prose">
          <Link href="/" className="text-sm text-pink-500 hover:text-pink-600 mb-4 inline-block">← KOC Engine</Link>
          <h1 className="text-4xl font-extrabold text-zinc-900 mb-4 leading-tight">Privacy Policy</h1>
          <p className="text-sm text-zinc-500">Last updated: July 3, 2026</p>
        </div>

        <section className="mb-10">
          <h2>1. Information We Collect</h2>
          <h3>1.1 Information You Provide</h3>
          <ul>
            <li><strong>Account Information:</strong> When you register, we collect your email address, username, and password (hashed with bcrypt).</li>
            <li><strong>Creator Profile:</strong> If you apply as a KOC, we collect your social media handles (TikTok, Instagram), content niche, region, and follower metrics for AI scoring and matching.</li>
            <li><strong>Brand Profile:</strong> If you register as a brand, we collect your company name, website, and product information.</li>
            <li><strong>Transaction Data:</strong> Task commissions, pledges, point balances, and withdrawal requests are recorded for platform operation.</li>
            <li><strong>Communications:</strong> Messages sent through our contact form or direct email.</li>
          </ul>

          <h3>1.2 Information Collected Automatically</h3>
          <ul>
            <li><strong>Usage Data:</strong> Page views, feature usage, and interaction patterns for product improvement.</li>
            <li><strong>Device Information:</strong> Browser type, operating system, IP address, and approximate location for security (fraud detection).</li>
            <li><strong>Cookies:</strong> We use essential cookies for authentication (JWT tokens stored in localStorage) and session management. We do not use third-party tracking cookies.</li>
          </ul>
        </section>

        <section className="mb-10">
          <h2>2. How We Use Your Information</h2>
          <ul>
            <li><strong>Platform Operation:</strong> To enable task publishing, KOC matching, pledge management, commission tracking, and withdrawals.</li>
            <li><strong>AI Matching:</strong> Creator profile data is used by our AI matching engine to score compatibility with brand tasks.</li>
            <li><strong>Trust & Safety:</strong> Behavioral data is analyzed by our Red Line Protection System to detect fraud patterns (speed anomalies, repeat pairs, IP correlation).</li>
            <li><strong>Communications:</strong> To respond to your inquiries and send essential service notifications.</li>
            <li><strong>Improvement:</strong> Aggregated, anonymized usage data helps us improve the platform.</li>
          </ul>
          <p>We do NOT sell your personal data to third parties. We do NOT use your data for advertising purposes.</p>
        </section>

        <section className="mb-10">
          <h2>3. Data Sharing</h2>
          <p>We share your information only in the following limited circumstances:</p>
          <ul>
            <li><strong>Between Brands and Creators:</strong> When a task match is confirmed, relevant profile information (creator content stats, brand product details) is shared between the matched parties. Contact information (email, social handles) is only shared after a match is confirmed.</li>
            <li><strong>Service Providers:</strong> We use Vercel for hosting, Render for backend services, and PayPal for payment processing. These providers receive only the minimum data necessary to perform their functions.</li>
            <li><strong>Legal Requirements:</strong> If required by law, court order, or governmental regulation.</li>
          </ul>
        </section>

        <section className="mb-10">
          <h2>4. Data Storage & Security</h2>
          <ul>
            <li><strong>Storage:</strong> User data is stored on secure servers. Passwords are hashed with bcrypt. JWT tokens are used for authentication.</li>
            <li><strong>Location:</strong> Data is stored on VPS servers. Cross-border data transfers are handled in accordance with applicable laws.</li>
            <li><strong>Security Measures:</strong> We implement HTTPS encryption, input validation, rate limiting, and automated fraud detection. However, no method of electronic storage is 100% secure.</li>
          </ul>
        </section>

        <section className="mb-10">
          <h2>5. Data Retention</h2>
          <ul>
            <li><strong>Account Data:</strong> Retained while your account is active. You may request deletion by contacting us.</li>
            <li><strong>Transaction Records:</strong> Retained indefinitely for audit and dispute resolution purposes.</li>
            <li><strong>Usage Logs:</strong> Retained for 90 days for security monitoring.</li>
            <li><strong>Deleted Accounts:</strong> Personal information is removed within 30 days of account deletion. Anonymized transaction records may be retained.</li>
          </ul>
        </section>

        <section className="mb-10">
          <h2>6. Your Rights</h2>
          <p>You have the right to:</p>
          <ul>
            <li><strong>Access:</strong> Request a copy of your personal data we hold.</li>
            <li><strong>Correction:</strong> Update or correct inaccurate information.</li>
            <li><strong>Deletion:</strong> Request deletion of your account and associated data.</li>
            <li><strong>Portability:</strong> Receive your data in a structured, machine-readable format.</li>
            <li><strong>Objection:</strong> Object to certain processing activities.</li>
          </ul>
          <p>To exercise any of these rights, contact us at <a href="mailto:honghuishen24@gmail.com">honghuishen24@gmail.com</a>.</p>
        </section>

        <section className="mb-10">
          <h2>7. Third-Party Services</h2>
          <p>Our platform may contain links to third-party websites or services (e.g., creator social media profiles, brand websites). We are not responsible for the privacy practices of these third parties.</p>
          <p>We use the following third-party services:</p>
          <ul>
            <li><strong>DeepSeek:</strong> AI content judgment for dispute resolution. Content submitted for judgment is processed by DeepSeek's API.</li>
            <li><strong>PayPal:</strong> Payment processing for creator withdrawals. PayPal's privacy policy applies to those transactions.</li>
          </ul>
        </section>

        <section className="mb-10">
          <h2>8. Children's Privacy</h2>
          <p>KOC Engine is not intended for use by individuals under the age of 13. We do not knowingly collect personal information from children under 13.</p>
        </section>

        <section className="mb-10">
          <h2>9. Changes to This Policy</h2>
          <p>We may update this Privacy Policy from time to time. Material changes will be communicated via email or platform notification. Continued use of the platform after changes constitutes acceptance of the updated policy.</p>
        </section>

        <section className="mb-10">
          <h2>10. Contact Us</h2>
          <p>
            If you have questions about this Privacy Policy or our data practices, please contact us at{" "}
            <a href="mailto:honghuishen24@gmail.com">honghuishen24@gmail.com</a>.
          </p>
        </section>
      </main>
    </>
  );
}
