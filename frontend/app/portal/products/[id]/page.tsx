"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { products, interests, matching, getToken, getRole, getConsolePath } from "@/lib/api";
import NavBar from "@/components/NavBar";

const PLATFORM_EMOJI: Record<string, string> = {
  amazon: "🏪", shopify: "🛒", walmart: "🏬", ebay: "📦",
  etsy: "🎨", shopee: "🛍", temu: "📱", aliexpress: "🌏",
  independent: "🏗", other: "📋",
};
const PLATFORM_LABEL: Record<string, string> = {
  amazon: "Amazon", shopify: "Shopify", walmart: "Walmart", ebay: "eBay",
  etsy: "Etsy", shopee: "Shopee", temu: "Temu", aliexpress: "AliExpress",
  independent: "Independent", other: "Other",
};
function platformBadge(sp: string): string {
  return sp ? `${PLATFORM_EMOJI[sp] || "📋"} ${PLATFORM_LABEL[sp] || sp}` : "";
}

export default function ProductDetail() {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;

  const [authorized, setAuthorized] = useState(false);
  const [product, setProduct] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [interested, setInterested] = useState(false);
  const [myInterests, setMyInterests] = useState<Set<string>>(new Set());
  const [matchInfo, setMatchInfo] = useState<Record<string, unknown> | null>(null);
  const [showingInterestFeedback, setShowingInterestFeedback] = useState(false);

  useEffect(() => {
    const token = getToken();
    const role = getRole();
    if (!token) { router.push("/login"); return; }
    if (role && role !== "koc") { router.push(getConsolePath(role || "")); return; }

    setAuthorized(true);

    // Fetch product detail
    products.get(productId, token)
      .then((p) => setProduct(p as Record<string, unknown>))
      .catch(() => setProduct(null))
      .finally(() => setLoading(false));

    // Check if already interested
    interests.list(token)
      .then((list) => {
        const ids = new Set((list as Array<Record<string, unknown>>).map((i) => i.to_id as string));
        setMyInterests(ids);
        if (ids.has(productId)) setInterested(true);
      })
      .catch(() => {});

    // Fetch match score for this product
    matching.forKoc({ top_n: 20 }, token)
      .then((res: unknown) => {
        const data = res as Record<string, unknown>;
        const matches = (data.matches as Array<Record<string, unknown>>) || [];
        const m = matches.find((m) => m.product_id === productId);
        if (m) setMatchInfo(m);
      })
      .catch(() => {});
  }, [productId, router]);

  async function handleInterested() {
    const t = getToken();
    if (!t) return;
    try {
      await interests.express(productId, "product", t);
      setInterested(true);
      setShowingInterestFeedback(true);
      setTimeout(() => {
        setShowingInterestFeedback(false);
        router.push("/portal/tasks");
      }, 1500);
    } catch (e) {
      console.error("Failed to express interest:", e);
    }
  }

  if (!authorized || loading) {
    return (
      <div className="min-h-screen bg-orange-50 flex items-center justify-center">
        <div className="text-zinc-400 text-sm">Loading...</div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-orange-50">
        <NavBar user={null} role="koc" title="Product Details" />
        <div className="max-w-2xl mx-auto px-6 py-16 text-center">
          <p className="text-zinc-400 text-lg mb-4">Product not found</p>
          <button onClick={() => router.push("/portal/products")} className="btn-brand px-6 py-2">
            ← Back to Product List
          </button>
        </div>
      </div>
    );
  }

  const score = matchInfo?.match_score as number | undefined;
  const reasons = matchInfo?.match_reasons as string[] | undefined;

  return (
    <div className="min-h-screen bg-orange-50">
      <NavBar user={null} role="koc" title="Product Details" />

      {showingInterestFeedback && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-emerald-500 text-white px-6 py-3 rounded-2xl shadow-lg text-sm font-bold animate-bounce">
          ✅ Accepted! Redirecting to My Tasks...
        </div>
      )}

      <div className="max-w-2xl mx-auto px-6 py-8">
        <button
          onClick={() => router.push("/portal/products")}
          className="text-sm text-zinc-400 hover:text-pink-500 transition mb-6 flex items-center gap-1"
        >
          ← Back to Browse Products
        </button>

        <div className="bg-white rounded-3xl border border-pink-200 shadow-md overflow-hidden">
          <div className="bg-gradient-to-r from-pink-400 to-purple-500 px-6 py-6">
            <h1 className="text-2xl font-extrabold text-white">{product.name as string}</h1>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-white/80 text-sm">{(product.category as string) || "Uncategorized"}</span>
              <span className="text-white/40">·</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                product.status === "active" ? "bg-white/20 text-white" : "bg-zinc-200 text-zinc-500"
              }`}>
                {product.status === "active" ? "🟢 Active" : "⏸ Paused"}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-2">
              {(product.sales_platform as string) && <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full">{platformBadge(product.sales_platform as string)}</span>}
              {(product.product_id as string) && <span className="text-xs text-white/60">ID: {product.product_id as string}</span>}
            </div>
          </div>

          <div className="p-6 space-y-5">
            {score !== undefined && (
              <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-2xl p-4 border border-pink-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-zinc-700">🎯 Smart Match Score</span>
                  <span className="text-xl font-extrabold text-pink-600">{score} pt</span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Match score considers your <span className="font-medium text-zinc-600">niche tags</span> overlap with product <span className="font-medium text-zinc-600">category</span>, follower count, Trust tier, and other factors. Higher score means better fit for this product.
                </p>
                {reasons && reasons.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {reasons.map((r, i) => (
                      <span key={i} className="px-2 py-1 bg-green-50 text-green-700 rounded-lg text-xs font-medium">
                        ✓ {r}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Commission Info */}
            <div className="bg-zinc-50 rounded-2xl p-4 space-y-3">
              <h3 className="text-sm font-semibold text-zinc-600">🔗 Product URL</h3>

              {product.commission_link ? (
                <a
                  href={product.commission_link as string}
                  target="_blank"
                  rel="noopener"
                  className="flex items-center gap-2 text-sm text-emerald-600 hover:text-emerald-700 font-medium break-all"
                >
                  🔗 Product Page ↗
                </a>
              ) : (
                <p className="text-xs text-zinc-400">Merchant has not provided a commission link yet</p>
              )}

              <div className="flex items-center gap-2 text-sm">
                <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full font-bold text-xs">
                  {product.commission_type === "affiliate" ? "🔗 Affiliate Commission" : "🏷 Discount Code"}
                </span>
                <span className="font-extrabold text-zinc-900">
                  {product.commission_value as string || "15% off"}
                </span>
              </div>
            </div>

            {product.description ? (
              <div>
                <h3 className="text-sm font-semibold text-zinc-600 mb-2">📝 Product Description</h3>
                <p className="text-sm text-zinc-600 leading-relaxed whitespace-pre-wrap">
                  {product.description as string}
                </p>
              </div>
            ) : (
              <div className="text-center py-4 text-zinc-300 text-sm">Merchant has not provided a detailed description</div>
            )}

            <div className="flex gap-3 pt-2">
              {interested ? (
                <div className="flex-1 flex flex-col gap-2">
                  <div className="px-6 py-3 bg-emerald-50 text-emerald-700 rounded-2xl text-center font-bold text-sm border border-emerald-200">
                    ✅ Accepted
                  </div>
                  <button
                    onClick={() => router.push("/portal/tasks")}
                    className="w-full px-6 py-2.5 bg-zinc-800 text-white rounded-2xl text-sm font-semibold hover:bg-zinc-700 transition"
                  >
                    View My Tasks →
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleInterested}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-2xl font-bold text-sm hover:from-pink-600 hover:to-purple-600 transition shadow-md shadow-pink-200"
                >
                  ✦ Accept
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
