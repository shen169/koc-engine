"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { applications } from "@/lib/api";
import { SparkEnter } from "@/components/Spark";

function ApplyForm() {
  const searchParams = useSearchParams();
  const refCode = searchParams.get("ref") || "";
  const router = useRouter();

  const [form, setForm] = useState({ name: "", platform: "tiktok", handle: "", follower_count: "", region: "US", email: "", shipping_address: "", why_join: "" });
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [scoreStep, setScoreStep] = useState(0); // 0=submitting, 1=auth, 2=niche, 3=engagement, 4=total

  function update(f: string, v: string) { setForm((p) => ({ ...p, [f]: v })); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(""); setLoading(true); setScoreStep(0);

    // Simulate staged reveal while waiting for API
    const delays = [400, 700, 1000, 1300];
    delays.forEach((d, i) => setTimeout(() => setScoreStep(i + 1), d));

    try {
      const data = { ...form, follower_count: parseInt(form.follower_count) || 0, past_video_urls: [] as string[], campaign: "baby_products", referral_code: refCode };
      const res = await applications.submit(data);
      setTimeout(() => { setResult(res); setLoading(false); }, 1500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Submission failed");
      setLoading(false);
    }
  }

  // ── Result Screen (AI 评分结算动画) ──
  if (result) {
    const dims = [
      { key: "authenticity", label: "Authenticity", desc: "Real content & genuine voice" },
      { key: "niche", label: "Niche Fit", desc: "Category relevance match" },
      { key: "engagement", label: "Engagement", desc: "Commerce signals & interaction" },
    ];
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ background: "linear-gradient(135deg, #FFF7ED, #FDF2F8, #F5F3FF)" }}>
        <div className="max-w-md w-full bg-white rounded-[20px] shadow-2xl p-10 text-center">
          <SparkEnter size={64} />
          <h2 className="text-2xl font-extrabold text-zinc-900 mt-6 mb-2">Application Scored!</h2>
          <p className="text-sm text-zinc-500 mb-8">Our AI analyzed your profile across three dimensions</p>

          {dims.map((d, i) => (
            <div key={d.key} className="flex justify-between items-center py-3 border-b border-zinc-100 text-sm"
              style={{ animationDelay: `${i * 200}ms` }}>
              <div className="text-left">
                <span className="font-semibold text-zinc-800">{d.label}</span>
                <p className="text-xs text-zinc-400">{d.desc}</p>
              </div>
              <span className="text-lg font-extrabold brand-gradient-text">{result[d.key] as number}</span>
            </div>
          ))}

          <div className="mt-6 bg-zinc-50 rounded-2xl p-5">
            <div className="text-4xl font-extrabold brand-gradient-text">{result.ai_score as number}</div>
            <div className="text-sm text-zinc-500 mt-1">Total Score</div>
            <span className={`inline-block mt-3 px-4 py-1 rounded-full text-sm font-bold text-white ${(result.tier as string) === "L3" ? "brand-gradient" : (result.tier as string) === "L2" ? "bg-purple-500" : "bg-pink-500"}`}>
              {result.tier as string}
            </span>
          </div>

          <p className="text-xs text-zinc-400 mt-4 mb-6">{result.ai_reason as string}</p>
          <button onClick={() => router.push("/login")} className="btn-brand px-6 py-3 text-sm">Go to Portal</button>
        </div>
      </div>
    );
  }

  // ── Form ──
  return (
    <div className="min-h-screen py-12 px-4" style={{ background: "linear-gradient(135deg, #FFF7ED, #FDF2F8, #F5F3FF)" }}>
      <div className="max-w-lg mx-auto bg-white rounded-2xl shadow-sm border border-rose-100 p-8">
        <h1 className="text-2xl font-extrabold text-zinc-900 mb-1">Creator Application</h1>
        <p className="text-sm text-zinc-500 mb-6">Tell us about yourself. AI scores your profile instantly.</p>
        {refCode && <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 mb-4 text-sm text-emerald-800">🎉 Referred by a friend!</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input required value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="Your name"
            className="w-full rounded-xl border-2 border-zinc-200 px-4 py-2.5 text-base focus:border-pink-400 focus:ring-4 focus:ring-pink-500/10 outline-none transition" />
          <div className="grid grid-cols-2 gap-3">
            <select value={form.platform} onChange={(e) => update("platform", e.target.value)}
              className="rounded-xl border-2 border-zinc-200 px-4 py-2.5 text-base focus:border-pink-400 focus:ring-4 focus:ring-pink-500/10 outline-none">
              <option value="tiktok">TikTok</option><option value="instagram">Instagram</option><option value="xiaohongshu">Xiaohongshu</option>
            </select>
            <input required value={form.handle} onChange={(e) => update("handle", e.target.value)} placeholder="@username"
              className="rounded-xl border-2 border-zinc-200 px-4 py-2.5 text-base focus:border-pink-400 focus:ring-4 focus:ring-pink-500/10 outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input type="number" value={form.follower_count} onChange={(e) => update("follower_count", e.target.value)} placeholder="Followers"
              className="rounded-xl border-2 border-zinc-200 px-4 py-2.5 text-base focus:border-pink-400 focus:ring-4 focus:ring-pink-500/10 outline-none" />
            <select value={form.region} onChange={(e) => update("region", e.target.value)}
              className="rounded-xl border-2 border-zinc-200 px-4 py-2.5 text-base focus:border-pink-400 focus:ring-4 focus:ring-pink-500/10 outline-none">
              <option value="US">US</option><option value="UK">UK</option><option value="CA">Canada</option><option value="AU">Australia</option>
            </select>
          </div>
          <input type="email" required value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="Email"
            className="w-full rounded-xl border-2 border-zinc-200 px-4 py-2.5 text-base focus:border-pink-400 focus:ring-4 focus:ring-pink-500/10 outline-none" />
          <input value={form.shipping_address} onChange={(e) => update("shipping_address", e.target.value)} placeholder="Shipping address"
            className="w-full rounded-xl border-2 border-zinc-200 px-4 py-2.5 text-base focus:border-pink-400 focus:ring-4 focus:ring-pink-500/10 outline-none" />
          <textarea rows={3} value={form.why_join} onChange={(e) => update("why_join", e.target.value)} placeholder="Why do you want to join?"
            className="w-full rounded-xl border-2 border-zinc-200 px-4 py-2.5 text-base focus:border-pink-400 focus:ring-4 focus:ring-pink-500/10 outline-none resize-none" />

          {loading && (
            <div className="bg-zinc-50 rounded-2xl p-4 text-center animate-fade-in-up">
              <p className="text-sm text-zinc-500">{["🤖 AI analyzing your profile...", "✨ Scoring authenticity...", "🎯 Evaluating niche fit...", "💬 Checking engagement signals...", "📊 Calculating final score..."][scoreStep]}</p>
              <div className="mt-2 h-1.5 bg-zinc-200 rounded-full overflow-hidden">
                <div className="h-full brand-gradient rounded-full transition-all duration-500" style={{ width: `${scoreStep * 25}%` }} />
              </div>
            </div>
          )}

          {error && <p className="text-rose-500 text-sm">{error}</p>}
          <button type="submit" disabled={loading}
            className="btn-brand w-full py-3.5 text-lg disabled:opacity-50 disabled:shadow-none">
            {loading ? "Analyzing..." : "Submit Application"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function ApplyPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen text-zinc-400">Loading...</div>}>
      <ApplyForm />
    </Suspense>
  );
}
