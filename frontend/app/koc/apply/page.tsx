"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { applications } from "@/lib/api";
import { SparkEnter } from "@/components/Spark";

function ApplyForm() {
  const searchParams = useSearchParams();
  const refCode = searchParams.get("ref") || "";
  const router = useRouter();

  const [form, setForm] = useState({
    name: "",
    platform: "tiktok",
    handle: "",
    profile_url: "",
    follower_count: "",
    region: "US",
    email: "",
    shipping_address: "",
    why_join: "",
    niche_tags: [] as string[],
    past_video_urls: "",
  });
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [scoreStep, setScoreStep] = useState(0); // 0=submitting, 1=auth, 2=niche, 3=engagement, 4=total

  function update(f: string, v: string) { setForm((p) => ({ ...p, [f]: v })); }
  function toggleTag(tag: string) {
    setForm((p) => ({
      ...p,
      niche_tags: p.niche_tags.includes(tag)
        ? p.niche_tags.filter((t) => t !== tag)
        : [...p.niche_tags, tag],
    }));
  }

  function validate(): boolean {
    const errs: Record<string, string> = {};

    if (!form.name.trim()) errs.name = "Name is required";
    if (!form.handle.trim()) errs.handle = "Handle is required";
    if (!form.profile_url.trim()) errs.profile_url = "Profile URL is required";
    if (!form.email.trim()) errs.email = "Email is required";
    if (!form.region.trim()) errs.region = "Region is required";

    const fc = parseInt(form.follower_count);
    if (!form.follower_count.trim() || isNaN(fc) || fc < 0) {
      errs.follower_count = "Valid follower count is required";
    }

    if (form.niche_tags.length === 0) {
      errs.niche_tags = "Please select at least one niche tag";
    }

    const pastUrls = form.past_video_urls
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    if (pastUrls.length < 2) {
      errs.past_video_urls = "Please provide at least 2 content links";
    }

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(""); setFieldErrors({});

    if (!validate()) return;

    setLoading(true); setScoreStep(0);

    // Simulate staged reveal while waiting for API
    const delays = [400, 700, 1000, 1300];
    delays.forEach((d, i) => setTimeout(() => setScoreStep(i + 1), d));

    try {
      const pastUrls = form.past_video_urls
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);

      const data = {
        ...form,
        follower_count: parseInt(form.follower_count) || 0,
        niche_tags: form.niche_tags,
        profile_url: form.profile_url.trim(),
        past_video_urls: pastUrls,
        campaign: "baby_products",
        referral_code: refCode,
      };
      const res = await applications.submit(data);
      setTimeout(() => { setResult(res); setLoading(false); }, 1500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Submission failed");
      setLoading(false);
    }
  }

  // ── Result Screen (AI scoring animation) ──
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
          <button onClick={() => router.push("/portal")} className="btn-brand px-6 py-3 text-sm">Go to Portal</button>
        </div>
      </div>
    );
  }

  const inputClass = (field: string) =>
    `w-full rounded-xl border-2 px-4 py-2.5 text-base focus:border-pink-400 focus:ring-4 focus:ring-pink-500/10 outline-none transition ${
      fieldErrors[field] ? "border-red-300 bg-red-50" : "border-zinc-200"
    }`;

  // ── Form ──
  return (
    <div className="min-h-screen py-12 px-4" style={{ background: "linear-gradient(135deg, #FFF7ED, #FDF2F8, #F5F3FF)" }}>
      <div className="max-w-lg mx-auto bg-white rounded-2xl shadow-sm border border-rose-100 p-8">
        <h1 className="text-2xl font-extrabold text-zinc-900 mb-1">Creator Application</h1>
        <p className="text-sm text-zinc-500 mb-6">Tell us about yourself. AI scores your profile instantly.</p>
        {refCode && <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 mb-4 text-sm text-emerald-800">🎉 Referred by a friend!</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <input required value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="Your name *"
              className={inputClass("name")} />
            {fieldErrors.name && <p className="text-red-500 text-xs mt-1">{fieldErrors.name}</p>}
          </div>

          {/* Platform + Handle */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <select value={form.platform} onChange={(e) => update("platform", e.target.value)}
                className={inputClass("platform")}>
                <option value="tiktok">TikTok</option>
                <option value="instagram">Instagram</option>
                <option value="youtube">YouTube</option>
                <option value="xiaohongshu">Xiaohongshu</option>
                <option value="douyin">Douyin</option>
                <option value="x">X (Twitter)</option>
                <option value="facebook">Facebook</option>
                <option value="pinterest">Pinterest</option>
                <option value="snapchat">Snapchat</option>
                <option value="linkedin">LinkedIn</option>
                <option value="twitch">Twitch</option>
                <option value="threads">Threads</option>
                <option value="likee">Likee</option>
                <option value="kwai">Kwai</option>
                <option value="triller">Triller</option>
                <option value="clapper">Clapper</option>
              </select>
            </div>
            <div>
              <input required value={form.handle} onChange={(e) => update("handle", e.target.value)} placeholder="@username *"
                className={inputClass("handle")} />
              {fieldErrors.handle && <p className="text-red-500 text-xs mt-1">{fieldErrors.handle}</p>}
            </div>
          </div>

          {/* Profile URL */}
          <div>
            <input
              type="url"
              required
              value={form.profile_url}
              onChange={(e) => update("profile_url", e.target.value)}
              placeholder="https://your-social-profile-url.com/@handle *"
              className={inputClass("profile_url")}
            />
            {fieldErrors.profile_url && <p className="text-red-500 text-xs mt-1">{fieldErrors.profile_url}</p>}
            <p className="text-xs text-zinc-400 mt-1">Your social media profile URL — proves your account is real</p>
          </div>

          {/* Follower count + Region */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <input
                type="number"
                required
                min="0"
                value={form.follower_count}
                onChange={(e) => update("follower_count", e.target.value)}
                placeholder="Follower count *"
                className={inputClass("follower_count")}
              />
              {fieldErrors.follower_count && <p className="text-red-500 text-xs mt-1">{fieldErrors.follower_count}</p>}
            </div>
            <div>
              <select value={form.region} onChange={(e) => update("region", e.target.value)}
                className={inputClass("region")}>
                <option value="US">US 🇺🇸</option><option value="UK">UK 🇬🇧</option><option value="CA">Canada 🇨🇦</option><option value="AU">Australia 🇦🇺</option><option value="EU">EU 🇪🇺</option><option value="JP">Japan 🇯🇵</option><option value="KR">Korea 🇰🇷</option><option value="SEA">Southeast Asia 🌏</option><option value="CN">China 🇨🇳</option>
              </select>
              {fieldErrors.region && <p className="text-red-500 text-xs mt-1">{fieldErrors.region}</p>}
            </div>
          </div>

          {/* Email */}
          <div>
            <input type="email" required value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="Email *"
              className={inputClass("email")} />
            {fieldErrors.email && <p className="text-red-500 text-xs mt-1">{fieldErrors.email}</p>}
          </div>

          <input value={form.shipping_address} onChange={(e) => update("shipping_address", e.target.value)} placeholder="Shipping address"
            className="w-full rounded-xl border-2 border-zinc-200 px-4 py-2.5 text-base focus:border-pink-400 focus:ring-4 focus:ring-pink-500/10 outline-none transition" />

          <textarea rows={3} value={form.why_join} onChange={(e) => update("why_join", e.target.value)} placeholder="Why do you want to join?"
            className="w-full rounded-xl border-2 border-zinc-200 px-4 py-2.5 text-base focus:border-pink-400 focus:ring-4 focus:ring-pink-500/10 outline-none resize-none" />

          {/* Niche Tags */}
          <div>
            <label className="block text-sm font-semibold text-zinc-600 mb-2">Content Niche (select at least one) *</label>
            <div className="flex flex-wrap gap-2">
              {["skincare", "beauty", "fashion", "fitness", "electronics", "home", "lifestyle", "food", "baby", "pet", "travel", "tech"].map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                    form.niche_tags.includes(tag)
                      ? "btn-brand"
                      : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
            {fieldErrors.niche_tags && <p className="text-red-500 text-xs mt-1">{fieldErrors.niche_tags}</p>}
          </div>

          {/* Past Video URLs */}
          <div>
            <textarea
              rows={4}
              required
              value={form.past_video_urls}
              onChange={(e) => update("past_video_urls", e.target.value)}
              placeholder={"Paste 2+ video/content links (one per line) *\n\nhttps://www.tiktok.com/@user/video/123\nhttps://youtube.com/watch?v=abc\nhttps://www.instagram.com/p/xyz"}
              className={inputClass("past_video_urls") + " resize-y"}
            />
            {fieldErrors.past_video_urls && <p className="text-red-500 text-xs mt-1">{fieldErrors.past_video_urls}</p>}
            <p className="text-xs text-zinc-400 mt-1">At least 2 content links — helps our AI evaluate your style</p>
          </div>

          {loading && (
            <div className="bg-zinc-50 rounded-2xl p-4 text-center animate-fade-in-up">
              <p className="text-sm text-zinc-500">{["🤖 AI analyzing your profile...", "✨ Scoring authenticity...", "🎯 Evaluating niche fit...", "💬 Checking engagement signals...", "📊 Calculating final score..."][scoreStep]}</p>
              <div className="mt-2 h-1.5 bg-zinc-200 rounded-full overflow-hidden">
                <div className="h-full brand-gradient rounded-full transition-all duration-500" style={{ width: `${scoreStep * 25}%` }} />
              </div>
            </div>
          )}

          {error && <p className="text-rose-500 text-sm text-center">{error}</p>}
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
