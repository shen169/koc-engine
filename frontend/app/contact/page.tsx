import type { Metadata } from "next";
import Link from "next/link";
import JsonLd from "@/components/JsonLd";
import { breadcrumbSchema, webPageSchema } from "@/lib/schema";

export const metadata: Metadata = {
  title: "Contact KOC Engine — Get in Touch",
  description: "Contact the KOC Engine team. Questions about the platform, partnership inquiries, or support requests. We respond within 24 hours.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <>
      <JsonLd data={breadcrumbSchema([{ name: "Home", url: "https://kocengine.com" }, { name: "Contact", url: "https://kocengine.com/contact" }])} />
      <JsonLd data={webPageSchema({ name: "Contact KOC Engine", description: "Get in touch with the KOC Engine team for questions, partnerships, or support.", url: "https://kocengine.com/contact" })} />
      <main className="max-w-3xl mx-auto px-6 py-16">
        <div className="mb-12">
          <Link href="/" className="text-sm text-pink-500 hover:text-pink-600 mb-4 inline-block">← KOC Engine</Link>
          <h1 className="text-4xl font-extrabold text-zinc-900 mb-4 leading-tight">
            Get in <span className="bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">Touch</span>
          </h1>
          <p className="text-lg text-zinc-500">We'd love to hear from you. Questions, feedback, partnership inquiries — we respond within 24 hours.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {[
            {
              icon: "✉️",
              title: "Email",
              content: "honghuishen24@gmail.com",
              desc: "Direct line to the founder. Best for urgent matters and partnership inquiries.",
              action: { text: "Send Email →", href: "mailto:honghuishen24@gmail.com" },
            },
            {
              icon: "🐙",
              title: "GitHub",
              content: "shen169/koc-engine",
              desc: "Open an issue for bug reports, feature requests, or to explore the codebase.",
              action: { text: "View on GitHub →", href: "https://github.com/shen169/koc-engine", external: true },
            },
            {
              icon: "🐦",
              title: "X (Twitter)",
              content: "@kocengine",
              desc: "Follow for product updates, creator economy insights, and platform announcements.",
              action: { text: "Follow @kocengine →", href: "https://x.com/kocengine", external: true },
            },
          ].map(({ icon, title, content, desc, action }) => (
            <div key={title} className="bg-white border border-zinc-200 rounded-2xl p-6 text-center">
              <div className="text-3xl mb-3">{icon}</div>
              <h3 className="font-bold text-zinc-900 mb-1">{title}</h3>
              <p className="text-sm font-medium text-pink-600 mb-2">{content}</p>
              <p className="text-xs text-zinc-500 mb-4">{desc}</p>
              <a
                href={action.href}
                target={action.external ? "_blank" : undefined}
                rel={action.external ? "noopener" : undefined}
                className="inline-block text-sm font-semibold text-pink-500 hover:text-pink-600"
              >
                {action.text}
              </a>
            </div>
          ))}
        </div>

        {/* Contact Form */}
        <section className="mb-16">
          <h2 className="text-2xl font-extrabold text-zinc-900 mb-6">Send Us a Message</h2>
          <form className="bg-white border border-zinc-200 rounded-2xl p-6 space-y-4" action="mailto:honghuishen24@gmail.com" method="post" encType="text/plain">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-zinc-700 mb-1">Name *</label>
                <input type="text" id="name" name="name" required className="w-full border border-zinc-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300 focus:border-pink-400" placeholder="Your name" />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-zinc-700 mb-1">Email *</label>
                <input type="email" id="email" name="email" required className="w-full border border-zinc-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300 focus:border-pink-400" placeholder="you@example.com" />
              </div>
            </div>
            <div>
              <label htmlFor="topic" className="block text-sm font-medium text-zinc-700 mb-1">Topic</label>
              <select id="topic" name="topic" className="w-full border border-zinc-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300 focus:border-pink-400">
                <option>General Inquiry</option>
                <option>Brand Partnership</option>
                <option>Creator Question</option>
                <option>Bug Report</option>
                <option>Feature Request</option>
                <option>Other</option>
              </select>
            </div>
            <div>
              <label htmlFor="message" className="block text-sm font-medium text-zinc-700 mb-1">Message *</label>
              <textarea id="message" name="message" required rows={5} className="w-full border border-zinc-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300 focus:border-pink-400" placeholder="Tell us what's on your mind..." />
            </div>
            <button type="submit" className="bg-gradient-to-r from-pink-500 to-purple-500 text-white px-8 py-3 rounded-full font-bold shadow-lg shadow-pink-200 hover:opacity-90 transition">
              Send Message →
            </button>
          </form>
        </section>

        <footer className="text-center text-sm text-zinc-400 pb-12 border-t border-zinc-100 pt-8">
          <p>
            We typically respond within 24 hours. For urgent matters, email directly:{" "}
            <a href="mailto:honghuishen24@gmail.com" className="text-pink-500 hover:text-pink-600 underline">honghuishen24@gmail.com</a>
          </p>
        </footer>
      </main>
    </>
  );
}
