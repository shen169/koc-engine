"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import NavBar from "@/components/NavBar";
import IntegrityBadge from "@/components/IntegrityBadge";
import { api, auth, credits, tasks, merchants, getToken, getRole, getConsolePath, clearToken } from "@/lib/api";

const ALL_CATEGORIES = [
  "baby", "beauty", "fashion", "electronics", "home", "health", "sports",
  "toys", "pets", "office", "auto", "jewelry", "garden", "tools", "grocery",
  "furniture", "luggage", "party", "crafts", "musical", "books", "software",
  "gaming", "appliances", "lighting", "bedding", "kitchen", "wedding",
  "fitness", "baby_gear", "outdoor", "smart_home", "wearable",
];

const CATEGORY_LABELS: Record<string, string> = {
  baby: "Baby & Childcare", beauty: "Beauty & Personal Care", fashion: "Fashion & Apparel",
  electronics: "Electronics & Gadgets", home: "Home & Kitchen", health: "Health & Wellness",
  sports: "Sports & Outdoors", toys: "Toys & Games", pets: "Pet Supplies",
  office: "Office & Stationery", auto: "Automotive & Accessories", jewelry: "Jewelry & Watches",
  garden: "Garden & Outdoor", tools: "Tools & Home Improvement", grocery: "Grocery & Food",
  furniture: "Furniture & Decor", luggage: "Luggage & Travel", party: "Party & Events",
  crafts: "Arts, Crafts & Sewing", musical: "Musical Instruments", books: "Books & Media",
  software: "Software & Apps", gaming: "Video Games & Consoles", appliances: "Home Appliances",
  lighting: "Lighting & Lamps", bedding: "Bedding & Bath", kitchen: "Kitchen & Dining",
  wedding: "Wedding & Registry", fitness: "Fitness & Exercise", baby_gear: "Baby Gear & Strollers",
  outdoor: "Camping & Hiking", smart_home: "Smart Home & IoT", wearable: "Wearable Tech",
};

const ALL_MARKETS = [
  { code: "US", label: "🇺🇸 US" },
  { code: "UK", label: "🇬🇧 UK" },
  { code: "CA", label: "🇨🇦 CA" },
  { code: "AU", label: "🇦🇺 AU" },
  { code: "DE", label: "🇩🇪 DE" },
  { code: "FR", label: "🇫🇷 FR" },
  { code: "IT", label: "🇮🇹 IT" },
  { code: "ES", label: "🇪🇸 ES" },
  { code: "JP", label: "🇯🇵 JP" },
  { code: "KR", label: "🇰🇷 KR" },
  { code: "BR", label: "🇧🇷 BR" },
  { code: "MX", label: "🇲🇽 MX" },
  { code: "IN", label: "🇮🇳 IN" },
  { code: "SEA", label: "🌏 SEA" },
  { code: "CN", label: "🇨🇳 CN" },
  { code: "EU", label: "🇪🇺 EU" },
];

export default function DashboardPage() {
  const router = useRouter();

  const [authorized, setAuthorized] = useState(false);
  const [user, setUser] = useState<Record<string, unknown> | null>(null);
  const [merchantProfile, setMerchantProfile] = useState<Record<string, unknown> | null>(null);
  const [balance, setBalance] = useState(0);
  const [taskList, setTaskList] = useState<Array<Record<string, unknown>>>([]);
  const [loadingProfile, setLoadingProfile] = useState(true);

  // Profile form state (shared by create + edit)
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [profileForm, setProfileForm] = useState({ company_name: "", website: "", amazon_storefront: "" });
  const [profileCats, setProfileCats] = useState<Set<string>>(new Set());
  const [profileMarkets, setProfileMarkets] = useState<Set<string>>(new Set());
  const [profileError, setProfileError] = useState("");
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});
  const [profileSubmitting, setProfileSubmitting] = useState(false);

  useEffect(() => {
    const token = getToken();
    const role = getRole();
    if (!token) { router.push("/login"); return; }
    if (role && role !== "merchant") { router.push(getConsolePath(role || "")); return; }
    setAuthorized(true);

    auth.me(token).then((u) => {
      setUser(u);
      const mp = (u as any).merchant_profile;
      if (mp) {
        setMerchantProfile(mp);
      } else {
        setShowProfileForm(true);
      }
    }).catch(() => { clearToken(); router.push("/login"); })
    .finally(() => setLoadingProfile(false));
    credits.balance(token).then((r) => setBalance(r.total as number)).catch(() => {});
    tasks.mine(token).then(setTaskList).catch(() => {});
  }, [router]);

  function openEditForm() {
    const mp = merchantProfile;
    setProfileForm({
      company_name: (mp?.company_name as string) || "",
      website: (mp?.website as string) || "",
      amazon_storefront: (mp?.amazon_storefront as string) || "",
    });
    setProfileCats(new Set((mp?.product_categories as string[]) || []));
    setProfileMarkets(new Set((mp?.target_markets as string[]) || []));
    setIsEditing(true);
    setShowProfileForm(true);
    setProfileError("");
    setProfileErrors({});
  }

  function validateProfile(): boolean {
    const errs: Record<string, string> = {};
    if (!profileForm.website.trim()) errs.website = "Store URL is required";
    if (profileCats.size === 0) errs.categories = "Select at least one category";
    if (profileMarkets.size === 0) errs.markets = "Select at least one target market";
    setProfileErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmitProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileError("");
    if (!validateProfile()) return;

    const t = getToken() || "";

    setProfileSubmitting(true);
    try {
      const payload = {
        company_name: profileForm.company_name.trim(),
        website: profileForm.website.trim(),
        amazon_storefront: profileForm.amazon_storefront.trim(),
        product_categories: Array.from(profileCats),
        target_markets: Array.from(profileMarkets),
      };

      if (isEditing) {
        // Update existing profile
        const result = await api<Record<string, unknown>>("/api/merchants/me", {
          method: "PUT",
          body: payload,
          token: t,
        });
        setMerchantProfile(result);
      } else {
        // Create new profile
        const result = await merchants.create(payload, t) as Record<string, unknown>;
        setMerchantProfile(result);
      }
      setShowProfileForm(false);
      setIsEditing(false);
      // Refresh auth.me
      const me = await auth.me(t);
      setUser(me);
      if ((me as any).merchant_profile) setMerchantProfile((me as any).merchant_profile);
    } catch (err: any) {
      setProfileError(err.message || "Failed to save profile");
    } finally {
      setProfileSubmitting(false);
    }
  }

  function toggleCat(cat: string) {
    setProfileCats((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat); else next.add(cat);
      return next;
    });
    if (profileErrors.categories) setProfileErrors((p) => { const n = { ...p }; delete n.categories; return n; });
  }

  function toggleMarket(m: string) {
    setProfileMarkets((prev) => {
      const next = new Set(prev);
      if (next.has(m)) next.delete(m); else next.add(m);
      return next;
    });
    if (profileErrors.markets) setProfileErrors((p) => { const n = { ...p }; delete n.markets; return n; });
  }

  const inputClass = (field: string) =>
    `w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-900 ${
      profileErrors[field] ? "border-red-400 bg-red-50" : "border-slate-200"
    }`;

  if (!authorized || !user || loadingProfile) return <div className="flex items-center justify-center min-h-screen bg-purple-50 text-zinc-400">Loading...</div>;

  // ── Profile form (create or edit) ──
  if (showProfileForm) {
    return (
      <div className="min-h-screen bg-purple-50">
        <NavBar user={user} role="merchant" />
        <div className="max-w-lg mx-auto px-6 py-8">

          {/* ⚠️ Warning banner — only for new profile creation */}
          {!isEditing && (
            <div className="bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400 text-white rounded-2xl p-5 mb-6 shadow-lg shadow-amber-200 animate-pulse">
              <div className="flex items-start gap-3">
                <span className="text-3xl shrink-0">⚠️</span>
                <div>
                  <h2 className="text-lg font-extrabold mb-1">Create Your Profile First</h2>
                  <p className="text-sm text-white/90 leading-relaxed">
                    You need a merchant profile to <strong>publish tasks</strong>, <strong>list products</strong>, and <strong>match with KOCs</strong>.
                    Without it, most features are locked.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl border-2 border-amber-300 shadow-lg shadow-amber-100 p-6">
            <div className="text-center mb-6">
              <span className="text-4xl">🏢</span>
              <h1 className="text-xl font-extrabold text-zinc-900 mt-3">
                {isEditing ? "Edit Merchant Profile" : "Create Your Merchant Profile"}
              </h1>
              <p className="text-sm text-zinc-500 mt-1">
                {isEditing
                  ? "Update your store info — helps match with the right KOCs."
                  : "3 required fields help us match you with the best KOCs for your products."}
              </p>
            </div>

            {profileError && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-4">
                {profileError}
              </div>
            )}

            <form onSubmit={handleSubmitProfile} className="space-y-4">
              {/* Company Name — optional */}
              <div>
                <label className="block text-sm font-semibold text-zinc-700 mb-1">
                  Company Name <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <input
                  value={profileForm.company_name}
                  onChange={(e) => setProfileForm((p) => ({ ...p, company_name: e.target.value }))}
                  placeholder="e.g. Premium Beauty Co."
                  className={inputClass("company_name")}
                />
              </div>

              {/* Store URL — REQUIRED */}
              <div>
                <label className="block text-sm font-semibold text-zinc-700 mb-1">
                  Store URL <span className="text-red-400">*</span>
                  <span className="text-slate-400 font-normal"> (Amazon / Shopify / independent store — any platform)</span>
                </label>
                <input
                  value={profileForm.website}
                  onChange={(e) => {
                    setProfileForm((p) => ({ ...p, website: e.target.value }));
                    if (profileErrors.website) setProfileErrors((p) => { const n = { ...p }; delete n.website; return n; });
                  }}
                  placeholder="https://amazon.com/shops/... / yourstore.com / store.myshopify.com"
                  className={inputClass("website")}
                />
                {profileErrors.website && <p className="text-xs text-red-500 mt-1">{profileErrors.website}</p>}
              </div>

              {/* Product Categories — REQUIRED */}
              <div>
                <label className="block text-sm font-semibold text-zinc-700 mb-2">
                  Main Categories <span className="text-red-400">*</span>
                  <span className="text-slate-400 font-normal"> (select all that apply)</span>
                </label>
                <div className={`flex flex-wrap gap-1.5 max-h-48 overflow-y-auto p-2 rounded-lg ${profileErrors.categories ? "border border-red-400 bg-red-50" : ""}`}>
                  {ALL_CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => toggleCat(cat)}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium transition ${
                        profileCats.has(cat)
                          ? "bg-purple-600 text-white"
                          : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                      }`}
                    >
                      {CATEGORY_LABELS[cat] || cat}
                    </button>
                  ))}
                </div>
                {profileErrors.categories && <p className="text-xs text-red-500 mt-1">{profileErrors.categories}</p>}
                {profileCats.size > 0 && !profileErrors.categories && (
                  <p className="text-xs text-zinc-400 mt-2">{profileCats.size} categor{profileCats.size === 1 ? "y" : "ies"} selected</p>
                )}
              </div>

              {/* Target Markets — REQUIRED */}
              <div>
                <label className="block text-sm font-semibold text-zinc-700 mb-2">
                  Target Markets <span className="text-red-400">*</span>
                  <span className="text-slate-400 font-normal"> (where your products are sold)</span>
                </label>
                <div className={`flex flex-wrap gap-1.5 p-2 rounded-lg ${profileErrors.markets ? "border border-red-400 bg-red-50" : ""}`}>
                  {ALL_MARKETS.map(({ code, label }) => (
                    <button
                      key={code}
                      type="button"
                      onClick={() => toggleMarket(code)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                        profileMarkets.has(code)
                          ? "bg-indigo-600 text-white"
                          : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {profileErrors.markets && <p className="text-xs text-red-500 mt-1">{profileErrors.markets}</p>}
                {profileMarkets.size > 0 && !profileErrors.markets && (
                  <p className="text-xs text-zinc-400 mt-2">{profileMarkets.size} market{profileMarkets.size === 1 ? "" : "s"} selected</p>
                )}
              </div>

              <button
                type="submit"
                disabled={profileSubmitting}
                className="w-full py-3 bg-purple-600 text-white rounded-xl font-bold text-sm hover:bg-purple-700 disabled:opacity-50 transition"
              >
                {profileSubmitting ? "Saving..." : isEditing ? "Save Changes" : "Create Profile →"}
              </button>

              {isEditing && (
                <button
                  type="button"
                  onClick={() => { setShowProfileForm(false); setIsEditing(false); }}
                  className="w-full py-2 text-sm text-zinc-500 hover:text-zinc-700 transition"
                >
                  Cancel
                </button>
              )}
            </form>
          </div>
        </div>
      </div>
    );
  }

  // ── Normal dashboard (profile exists) ──
  return (
    <div className="min-h-screen bg-purple-50">
      <NavBar user={user} role="merchant" balance={balance} />

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Trust Card + Edit Profile */}
        {merchantProfile && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-gray-400 mb-1">Merchant Trust</div>
                <IntegrityBadge
                  score={merchantProfile.trust_score as number}
                  tier={merchantProfile.tier as string}
                  tierLabels={{ M3: "🏆 Gold Merchant", M2: "🥈 Silver Merchant", M1: "🥉 Bronze Merchant" }}
                  totalCompleted={merchantProfile.total_tasks_completed as number}
                  totalDisputed={merchantProfile.total_tasks_disputed as number}
                  avgRating={merchantProfile.avg_rating as number}
                  showDetails
                />
                {/* Show profile info pills */}
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {(merchantProfile.website as string) && (
                    <span className="text-xs bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-full">
                      🔗 {(merchantProfile.website as string).replace(/^https?:\/\//, "").replace(/\/$/, "")}
                    </span>
                  )}
                  {((merchantProfile.product_categories as string[]) || []).slice(0, 4).map((c: string) => (
                    <span key={c} className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                      {CATEGORY_LABELS[c] || c}
                    </span>
                  ))}
                  {((merchantProfile.product_categories as string[]) || []).length > 4 && (
                    <span className="text-xs text-zinc-400">
                      +{(merchantProfile.product_categories as string[]).length - 4} more
                    </span>
                  )}
                  {((merchantProfile.target_markets as string[]) || []).map((m: string) => (
                    <span key={m} className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                      {ALL_MARKETS.find((x) => x.code === m)?.label || m}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex gap-4 text-sm">
                <div className="text-center">
                  <div className="font-bold text-gray-900">{merchantProfile.total_tasks_completed as number || 0}</div>
                  <div className="text-xs text-gray-400">Completed</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-gray-900">{(merchantProfile.avg_rating as number)?.toFixed(1) || "—"}</div>
                  <div className="text-xs text-gray-400">Avg Rating</div>
                </div>
                <button
                  onClick={openEditForm}
                  className="self-start px-3 py-1.5 text-xs font-medium text-purple-600 bg-purple-50 rounded-lg hover:bg-purple-100 transition"
                >
                  ✏️ Edit
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          {[
            { href: "/dashboard/tasks", label: "📋 Task Management", desc: `${taskList.length} tasks` },
            { href: "/dashboard/tasks/new", label: "➕ New Task", desc: "Launch campaign" },
            { href: "/dashboard/products", label: "📦 My Products", desc: "Manage listings" },
            { href: "/dashboard/koc-pool", label: "🔍 Find Creators", desc: "Browse anonymously" },
            { href: "/dashboard/credits", label: "💰 Credits", desc: `${balance} pts` },
            { href: "/dashboard/coupons", label: "🏷 Coupons", desc: "Discount codes" },
          ].map((item) => (
            <Link key={item.href} href={item.href} className="bg-white rounded-2xl p-5 border border-rose-100 shadow-sm hover:border-purple-200 transition">
              <div className="font-bold text-zinc-900 mb-1">{item.label}</div>
              <div className="text-sm text-zinc-500">{item.desc}</div>
            </Link>
          ))}
        </div>

        {/* Recent Tasks */}
        <div className="bg-white rounded-2xl border border-rose-100 shadow-sm p-6">
          <h2 className="text-lg font-extrabold text-zinc-900 mb-4">Recent Tasks</h2>
          {taskList.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-zinc-400 text-sm">No tasks yet. Publish your first task!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {taskList.slice(0, 5).map((t) => {
                const task = (t.task || t) as Record<string, unknown>;
                const status = task.task_status || task.status || "pending";
                const statusColors: Record<string, string> = {
                  completed: "bg-emerald-50 text-emerald-700",
                  in_progress: "bg-amber-50 text-amber-700",
                  pending: "bg-zinc-50 text-zinc-500",
                };
                const statusLabels: Record<string, string> = {
                  completed: "Completed",
                  in_progress: "Active",
                  pending: "Pending",
                };
                return (
                <Link key={task.id as string} href={`/dashboard/tasks/${task.id}`} className="block p-4 bg-zinc-50 rounded-xl hover:bg-purple-50 transition">
                  <div className="flex justify-between items-start">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-zinc-900 truncate">{task.product_name as string || "Task"}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${statusColors[status as string] || "bg-zinc-100 text-zinc-500"}`}>
                          {statusLabels[status as string] || (status as string)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-zinc-400">
                        {task.task_type ? <span>{task.task_type === "urgent" ? "⚡ Urgent" : "🌊 Long-term"}</span> : null}
                        {task.koc_required ? <span>👥 {task.koc_filled as number || 0}/{task.koc_required as number} KOCs</span> : null}
                      </div>
                    </div>
                    <span className="text-sm font-bold text-purple-600 shrink-0 ml-3">{task.commission as number || 0} pts/KOC</span>
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
