"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Spark from "@/components/Spark";
import { landing } from "@/lib/api";

export default function HomePage() {
  const [stats, setStats] = useState({ total_kocs: 0, total_videos: 0, active_products: 0 });
  useEffect(() => { landing.stats().then(setStats).catch(() => {}); }, []);

  return (
    <div>
      {/* ── Hero ── */}
      <section className="min-h-[90vh] flex flex-col items-center justify-center text-center px-6"
        style={{ background: "linear-gradient(135deg, #FFF7ED 0%, #FDF2F8 50%, #F5F3FF 100%)" }}>
        <Spark size={64} animate className="mb-8" />
        <h1 className="text-5xl font-extrabold tracking-tight mb-4 max-w-3xl brand-gradient-text">
          Become a Creator Partner
        </h1>
        <p className="text-lg text-zinc-500 max-w-xl mb-10">
          Free products. Earn commissions. AI video tools that do the hard part.<br />No filming skills needed — we handle the magic.
        </p>
        <div className="flex gap-3 flex-wrap justify-center">
          <Link href="/koc/apply" className="btn-brand px-8 py-3.5 text-lg">
            🎬 Apply Now — It&apos;s Free
          </Link>
          <Link href="/login" className="rounded-full px-8 py-3.5 text-lg font-bold bg-white text-zinc-900 border-2 border-zinc-200 hover:border-pink-300 transition">
            🏢 I&apos;m a Brand
          </Link>
        </div>

        {/* Stats */}
        <div className="flex gap-10 mt-16 text-center">
          {[
            [stats.total_kocs, "Creator Partners"],
            [stats.total_videos, "Videos Delivered"],
            [stats.active_products, "Products Available"],
          ].map(([val, label]) => (
            <div key={label as string}>
              <div className="text-4xl font-extrabold brand-gradient-stat">{val as number}+</div>
              <div className="text-xs text-zinc-500 mt-1">{label as string}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Value Props ── */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="grid md:grid-cols-3 gap-5">
          {[
            { emoji: "🎁", title: "Free Products", desc: "We ship you the latest products. You keep them after your review." },
            { emoji: "💰", title: "Earn Commission", desc: "Your own discount code. Earn 15-20% on every sale from your content." },
            { emoji: "🤖", title: "AI Video Tools", desc: "AI writes scripts, generates storyboards, and produces videos. Just paste a link." },
          ].map((v) => (
            <div key={v.title} className="bg-white rounded-2xl p-8 text-center border border-rose-100 shadow-sm">
              <div className="text-5xl mb-5">{v.emoji}</div>
              <h3 className="text-lg font-bold text-zinc-900 mb-2">{v.title}</h3>
              <p className="text-sm text-zinc-500">{v.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="bg-orange-50 py-20">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-3xl font-extrabold text-center text-zinc-900 mb-14">How It Works</h2>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { step: "1", title: "Apply", desc: "Quick form. AI scores your profile instantly." },
              { step: "2", title: "Get Matched", desc: "Browse products. We match you with brands." },
              { step: "3", title: "Create", desc: "Receive free samples. AI tools make video easy." },
              { step: "4", title: "Earn", desc: "Post, earn credits & unlock higher commission tiers." },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 brand-gradient">
                  <span className="text-white text-xl font-extrabold">{item.step}</span>
                </div>
                <h4 className="font-bold text-zinc-900 mb-1">{item.title}</h4>
                <p className="text-xs text-zinc-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-zinc-900 text-zinc-400 text-center py-8 text-sm">
        <Link href="/login" className="hover:text-purple-400 underline mx-2">Sign In</Link>
        <Link href="/admin" className="hover:text-purple-400 underline mx-2">Admin</Link>
        <p className="mt-3 text-zinc-500">KOC Engine — Connecting Creators &amp; Brands</p>
      </footer>
    </div>
  );
}
