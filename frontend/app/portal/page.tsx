"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Spark from "@/components/Spark";
import IntegrityBadge from "@/components/IntegrityBadge";
import { auth, credits, tasks, kocs, getToken, clearToken, getRole, getConsolePath } from "@/lib/api";
import NavBar from "@/components/NavBar";

function TrustLevelBadge({ score, tier }: { score: number; tier: string }) {
  const tierColors: Record<string, string> = {
    L3: "bg-gradient-to-r from-amber-400 to-orange-500 text-white",
    L2: "bg-purple-100 text-purple-700",
    L1: "bg-pink-100 text-pink-700",
  };
  const tierLabel: Record<string, string> = {
    L3: "Partner",
    L2: "Creator",
    L1: "Explorer",
  };
  return (
    <div className="flex items-center gap-2">
      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${tierColors[tier] || "bg-gray-100 text-gray-600"}`}>
        {tier} {tierLabel[tier] || ""}
      </span>
      <IntegrityBadge score={score} />
    </div>
  );
}

export default function PortalDashboard() {
  const router = useRouter();

  const [authorized, setAuthorized] = useState(false);
  const [user, setUser] = useState<Record<string, unknown> | null>(null);
  const [balance, setBalance] = useState(0);
  const [taskList, setTaskList] = useState<Array<Record<string, unknown>>>([]);
  const [kocProfile, setKocProfile] = useState<Record<string, unknown> | null>(null);

  // ── Edit profile form state ──
  const [showEditForm, setShowEditForm] = useState(false);
  const [editForm, setEditForm] = useState({
    display_name: "",
    platform: "tiktok",
    handle: "",
    profile_url: "",
    follower_count: 0,
    region: "US",
    niche_tags: [] as string[],
  });
  const [editError, setEditError] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);

  const NICHE_TAGS_ALL = [
    "skincare", "beauty", "fashion", "fitness", "electronics",
    "home", "lifestyle", "food", "baby", "pet", "travel", "tech",
  ];

  const PLATFORMS = [
    { value: "tiktok", label: "TikTok" },
    { value: "instagram", label: "Instagram" },
    { value: "youtube", label: "YouTube" },
    { value: "xiaohongshu", label: "Xiaohongshu" },
    { value: "douyin", label: "Douyin" },
    { value: "x", label: "X (Twitter)" },
    { value: "facebook", label: "Facebook" },
    { value: "pinterest", label: "Pinterest" },
    { value: "snapchat", label: "Snapchat" },
    { value: "linkedin", label: "LinkedIn" },
    { value: "twitch", label: "Twitch" },
    { value: "threads", label: "Threads" },
  ];

  const REGIONS = [
    { value: "US", label: "🇺🇸 US" },
    { value: "UK", label: "🇬🇧 UK" },
    { value: "CA", label: "🇨🇦 CA" },
    { value: "AU", label: "🇦🇺 AU" },
    { value: "EU", label: "🇪🇺 EU" },
    { value: "JP", label: "🇯🇵 JP" },
    { value: "KR", label: "🇰🇷 KR" },
    { value: "SEA", label: "🌏 SEA" },
    { value: "CN", label: "🇨🇳 CN" },
  ];

  useEffect(() => {
    const token = getToken();
    const role = getRole();
    if (!token) { router.push("/login"); return; }
    if (role && role !== "koc") { router.push(getConsolePath(role || "")); return; }

    auth.me(token).then((u) => {
      setUser(u);
      if ((u as any).koc_profile) {
        setKocProfile((u as any).koc_profile);
        setAuthorized(true);
      } else {
        // No KOC profile yet — redirect to application
        router.push("/koc/apply");
      }
    }).catch(() => { clearToken(); router.push("/login"); });
    credits.balance(token).then((r) => setBalance(r.total as number)).catch(() => {});
    tasks.mine(token).then(setTaskList).catch(() => {});
  }, [router]);

  function openEditForm() {
    const kp = kocProfile;
    setEditForm({
      display_name: (kp?.display_name as string) || "",
      platform: (kp?.platform as string) || "tiktok",
      handle: (kp?.handle as string) || "",
      profile_url: (kp?.profile_url as string) || "",
      follower_count: (kp?.follower_count as number) || 0,
      region: (kp?.region as string) || "US",
      niche_tags: (kp?.niche_tags as string[]) || [],
    });
    setEditError("");
    setShowEditForm(true);
  }

  async function handleSubmitProfile(e: React.FormEvent) {
    e.preventDefault();
    setEditError("");
    if (!editForm.handle.trim()) { setEditError("Handle / username is required"); return; }
    setEditSubmitting(true);
    try {
      const token = getToken()!;
      const result = await kocs.updateMe({
        display_name: editForm.display_name.trim(),
        platform: editForm.platform,
        handle: editForm.handle.trim(),
        profile_url: editForm.profile_url.trim(),
        follower_count: editForm.follower_count,
        region: editForm.region,
        niche_tags: editForm.niche_tags,
      }, token) as Record<string, unknown>;
      setKocProfile(result);
      setShowEditForm(false);
      // Refresh auth.me so NavBar has latest
      const me = await auth.me(token);
      setUser(me);
      if ((me as any).koc_profile) setKocProfile((me as any).koc_profile);
    } catch (err: any) {
      setEditError(err.message || "Failed to save profile");
    } finally {
      setEditSubmitting(false);
    }
  }

  function toggleNicheTag(tag: string) {
    setEditForm((p) => ({
      ...p,
      niche_tags: p.niche_tags.includes(tag)
        ? p.niche_tags.filter((t) => t !== tag)
        : [...p.niche_tags, tag],
    }));
  }

  if (!authorized || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-orange-50 text-zinc-400">
        Loading...
      </div>
    );
  }

  // ── Edit profile form ──
  if (showEditForm) {
    return (
      <div className="min-h-screen bg-orange-50">
        <NavBar user={user} role="koc" />
        <div className="max-w-lg mx-auto px-6 py-8">
          <div className="bg-white rounded-2xl border-2 border-pink-300 shadow-lg shadow-pink-100 p-6">
            <div className="text-center mb-6">
              <span className="text-4xl">✏️</span>
              <h1 className="text-xl font-extrabold text-zinc-900 mt-3">Edit My Profile</h1>
              <p className="text-sm text-zinc-500 mt-1">
                Update your creator info — helps match with the right products.
              </p>
            </div>

            {editError && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-4">
                {editError}
              </div>
            )}

            <form onSubmit={handleSubmitProfile} className="space-y-4">
              {/* Display Name */}
              <div>
                <label className="block text-sm font-semibold text-zinc-700 mb-1">
                  Display Name <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <input
                  value={editForm.display_name}
                  onChange={(e) => setEditForm((p) => ({ ...p, display_name: e.target.value }))}
                  placeholder="e.g. BeautyCreator_Official"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-slate-900"
                />
              </div>

              {/* Platform */}
              <div>
                <label className="block text-sm font-semibold text-zinc-700 mb-1">Platform</label>
                <select
                  value={editForm.platform}
                  onChange={(e) => setEditForm((p) => ({ ...p, platform: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-slate-900"
                >
                  {PLATFORMS.map((pl) => (
                    <option key={pl.value} value={pl.value}>{pl.label}</option>
                  ))}
                </select>
              </div>

              {/* Handle */}
              <div>
                <label className="block text-sm font-semibold text-zinc-700 mb-1">
                  Handle / Username <span className="text-red-400">*</span>
                </label>
                <input
                  value={editForm.handle}
                  onChange={(e) => setEditForm((p) => ({ ...p, handle: e.target.value }))}
                  placeholder="@yourhandle"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-slate-900"
                />
              </div>

              {/* Profile URL */}
              <div>
                <label className="block text-sm font-semibold text-zinc-700 mb-1">
                  Profile URL <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <input
                  value={editForm.profile_url}
                  onChange={(e) => setEditForm((p) => ({ ...p, profile_url: e.target.value }))}
                  placeholder="https://..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-slate-900"
                />
              </div>

              {/* Follower Count + Region */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-zinc-700 mb-1">Follower Count</label>
                  <input
                    type="number"
                    value={editForm.follower_count}
                    onChange={(e) => setEditForm((p) => ({ ...p, follower_count: parseInt(e.target.value) || 0 }))}
                    placeholder="e.g. 50000"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-zinc-700 mb-1">Region</label>
                  <select
                    value={editForm.region}
                    onChange={(e) => setEditForm((p) => ({ ...p, region: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-slate-900"
                  >
                    {REGIONS.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Niche Tags */}
              <div>
                <label className="block text-sm font-semibold text-zinc-700 mb-2">
                  Niche Tags <span className="text-slate-400 font-normal">(select all that apply)</span>
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {NICHE_TAGS_ALL.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleNicheTag(tag)}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium transition capitalize ${
                        editForm.niche_tags.includes(tag)
                          ? "bg-pink-600 text-white"
                          : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={editSubmitting}
                className="w-full py-3 bg-pink-600 text-white rounded-xl font-bold text-sm hover:bg-pink-700 disabled:opacity-50 transition"
              >
                {editSubmitting ? "Saving..." : "Save Changes"}
              </button>

              <button
                type="button"
                onClick={() => setShowEditForm(false)}
                className="w-full py-2 text-sm text-zinc-500 hover:text-zinc-700 transition"
              >
                Cancel
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-orange-50">
      <NavBar user={user} role="koc" balance={balance} />

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Trust & Tier Card */}
        {kocProfile && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-gray-400 mb-1">My Trust</div>
                <TrustLevelBadge
                  score={kocProfile.trust_score as number}
                  tier={kocProfile.tier as string}
                />
                {/* Profile info pills */}
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {(kocProfile.display_name as string) && (
                    <span className="text-xs bg-pink-100 text-pink-700 px-2 py-0.5 rounded-full">
                      👤 {kocProfile.display_name as string}
                    </span>
                  )}
                  {(kocProfile.platform as string) && (
                    <span className="text-xs bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-full">
                      📱 {kocProfile.platform as string}
                    </span>
                  )}
                  {(kocProfile.handle as string) && (
                    <span className="text-xs bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-full">
                      @{(kocProfile.handle as string)}
                    </span>
                  )}
                  {((kocProfile.niche_tags as string[]) || []).slice(0, 3).map((t: string) => (
                    <span key={t} className="text-xs bg-pink-100 text-pink-700 px-2 py-0.5 rounded-full capitalize">
                      {t}
                    </span>
                  ))}
                  {((kocProfile.niche_tags as string[]) || []).length > 3 && (
                    <span className="text-xs text-zinc-400">
                      +{(kocProfile.niche_tags as string[]).length - 3} more
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-4 text-sm items-center">
                <div className="text-center">
                  <div className="font-bold text-gray-900">{kocProfile.completed_tasks as number}</div>
                  <div className="text-xs text-gray-400">Completed</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-gray-900">{(kocProfile.avg_rating as number)?.toFixed(1) || "—"}</div>
                  <div className="text-xs text-gray-400">Avg Rating</div>
                </div>
                <button
                  onClick={openEditForm}
                  className="self-start px-3 py-1.5 text-xs font-medium text-pink-600 bg-pink-50 rounded-lg hover:bg-pink-100 transition"
                >
                  ✏️ Edit
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          {[
            { href: "/portal/hall", label: "🏪 Task Hall", desc: "Discover new tasks" },
            { href: "/portal/products", label: "🛍 Browse Products", desc: "Find products to promote" },
            { href: "/portal/tasks", label: "📋 My Tasks", desc: `${taskList.length}/5 active` },
            { href: "/portal/credits", label: "💰 Credits", desc: `${balance} points` },
            { href: "/portal/coupons", label: "🏷 Coupons", desc: "Your discount codes" },
          ].map((item) => (
            <Link key={item.href} href={item.href} className="bg-white rounded-2xl p-5 border border-rose-100 shadow-sm hover:border-pink-200 transition">
              <div className="font-bold text-zinc-900 mb-1">{item.label}</div>
              <div className="text-sm text-zinc-500">{item.desc}</div>
            </Link>
          ))}
        </div>

        {/* Tasks */}
        <div className="bg-white rounded-2xl border border-rose-100 shadow-sm p-6">
          <h2 className="text-lg font-extrabold text-zinc-900 mb-4">Recent Tasks</h2>
          {taskList.length === 0 ? (
            <div className="text-center py-8">
              <Spark size={36} className="mx-auto mb-3 opacity-40" />
              <p className="text-zinc-400 text-sm">No tasks yet. Browse products and express interest!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {taskList.slice(0, 5).map((t) => {
                const task = (t.task || t) as Record<string, unknown>;
                const slot = t.my_slot as Record<string, unknown> | undefined;
                const status = slot?.status || task.task_status || "pending";
                const statusColors: Record<string, string> = {
                  submitted: "bg-emerald-50 text-emerald-700",
                  received: "bg-blue-50 text-blue-700",
                  shipped: "bg-purple-50 text-purple-700",
                  accepted: "bg-amber-50 text-amber-700",
                  assigned: "bg-pink-50 text-pink-700",
                };
                const statusLabels: Record<string, string> = {
                  submitted: "Submitted",
                  received: "Received",
                  shipped: "Shipped",
                  accepted: "Accepted",
                  assigned: "Assigned",
                  pending: "Pending",
                };
                return (
                <Link key={task.id as string} href={`/portal/tasks/${task.id}`} className="block p-4 bg-zinc-50 rounded-xl hover:bg-pink-50 transition">
                  <div className="flex justify-between items-start">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-zinc-900 truncate">{task.product_name as string || "Task"}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${statusColors[status as string] || "bg-zinc-100 text-zinc-500"}`}>
                          {statusLabels[status as string] || (status as string)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-zinc-400">
                        {(task.product_category as string) ? <span>📂 {task.product_category as string}</span> : null}
                        {(task.product_target_market as string) ? <span>🌍 {task.product_target_market as string}</span> : null}
                        {(task.merchant_company as string) ? <span>🏢 {task.merchant_company as string}</span> : null}
                      </div>
                    </div>
                    <span className="text-sm font-bold text-pink-600 shrink-0 ml-3">+{task.commission as number || 0} pts</span>
                  </div>
                </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
