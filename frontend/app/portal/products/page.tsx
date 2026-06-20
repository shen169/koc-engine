"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { products, interests, matching, getToken, getRole, getConsolePath } from "@/lib/api";
import NavBar from "@/components/NavBar";

interface ProductMatch {
  product_id: string;
  product_name: string;
  product_category: string;
  commission_value: string;
  commission_type: string;
  match_score: number;
  match_reasons: string[];
  source: string;
}

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

export default function BrowseProducts() {
  const router = useRouter();

  const [authorized, setAuthorized] = useState(false);
  const [items, setItems] = useState<Array<Record<string, unknown>>>([]);
  const [myInterests, setMyInterests] = useState<Set<string>>(new Set());
  const [recommended, setRecommended] = useState<ProductMatch[]>([]);
  const [recLoading, setRecLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const token = getToken();
    const role = getRole();
    if (!token) { router.push("/login"); return; }
    if (role && role !== "koc") { router.push(getConsolePath(role || "")); return; }
    setAuthorized(true);

    products.list(token).then(setItems).catch(() => {});
    interests.list(token).then((list) => setMyInterests(new Set((list as Array<Record<string, unknown>>).map((i) => i.to_id as string)))).catch(() => {});
    matching.forKoc({ top_n: 10 }, token)
      .then((res) => setRecommended((res.matches as ProductMatch[]) || []))
      .catch(() => {})
      .finally(() => setRecLoading(false));
  }, [router]);

  async function express(productId: string) {
    const token = getToken();
    if (!token) return;
    await interests.express(productId, "product", token);
    setMyInterests((prev) => new Set([...prev, productId]));
    router.push("/portal/tasks");
  }

  const recIds = new Set(recommended.map((r) => r.product_id));
  const otherProducts = items.filter((p) => !recIds.has(p.id as string));

  if (!authorized) {
    return (
      <div className="min-h-screen bg-orange-50 flex items-center justify-center">
        <div className="text-zinc-400 text-sm">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-orange-50">
      <NavBar user={null} role="koc" title="Browse Products" />
      <div className="max-w-3xl mx-auto px-6 py-8">

        {/* ── Recommended for You ── */}
        {!recLoading && recommended.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-extrabold text-zinc-900 mb-3 flex items-center gap-2">
              <span className="text-xl">✨</span> Recommended for You
              <span className="text-xs font-normal text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-full">Smart Match</span>
            </h2>
            <div className="space-y-2">
              {recommended.slice(0, showAll ? recommended.length : 5).map((m) => {
                const fullProduct = items.find((p) => p.id === m.product_id) || {};
                return (
                <div key={m.product_id} className="bg-white rounded-2xl border border-pink-200 shadow-sm p-4 relative overflow-hidden hover:shadow-md transition">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-pink-400 to-purple-400" />
                  <div className="pl-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <Link href={`/portal/products/${m.product_id}`} className="font-bold text-zinc-900 text-sm hover:text-pink-500 transition truncate">
                            {m.product_name}
                          </Link>
                          <span className="text-xs font-mono text-pink-600 font-bold shrink-0" title="Match score based on your niche tags, follower count, Trust tier and product category fit">
                            {m.match_score} pt
                          </span>
                          {m.source === "ai" && <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">🤖 AI</span>}
                          {(fullProduct.target_market as string) && (
                            <span className="text-xs px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-100">
                              🌍 {(fullProduct.target_market as string).toUpperCase()}
                            </span>
                          )}
                          {(fullProduct.merchant_company as string) && (
                            <span className="text-xs px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">
                              🏢 {fullProduct.merchant_company as string}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-zinc-400 mb-1">📂 {m.product_category} · 💰 {m.commission_value || "15% off"}</p>
                        {fullProduct.sales_platform ? <span className="text-xs text-zinc-400">{PLATFORM_EMOJI[fullProduct.sales_platform as string]} {PLATFORM_LABEL[fullProduct.sales_platform as string]}</span> : null}
                        {(fullProduct.description as string) && (
                          <p className="text-xs text-gray-400 leading-relaxed line-clamp-1 mb-1">
                            {(fullProduct.description as string).slice(0, 120)}
                          </p>
                        )}
                        {(fullProduct.commission_link as string) && (
                          <a
                            href={fullProduct.commission_link as string}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 font-medium underline underline-offset-2"
                          >
                            💰 Commission Link: {(fullProduct.commission_link as string).slice(0, 30)}... ↗
                          </a>
                        )}
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {m.match_reasons.slice(0, 3).map((r, i) => (
                            <span key={i} className="px-1.5 py-0.5 bg-green-50 text-green-700 rounded text-xs">{r}</span>
                          ))}
                        </div>
                      </div>
                      {myInterests.has(m.product_id) ? (
                        <Link href={`/portal/products/${m.product_id}`} className="px-4 py-2 bg-emerald-50 text-emerald-700 rounded-full text-sm font-bold shrink-0 hover:bg-emerald-100 transition">
                          ✓ Accepted
                        </Link>
                      ) : (
                        <button onClick={() => express(m.product_id)} className="btn-brand px-5 py-2 text-sm shrink-0">Accept</button>
                      )}
                    </div>
                  </div>
                </div>
                );
              })}
            </div>
            {recommended.length > 5 && (
              <button
                onClick={() => setShowAll(!showAll)}
                className="mt-3 text-xs text-pink-500 hover:text-pink-600 font-medium"
              >
                {showAll ? `Collapse, show Top 5 only` : `View all ${recommended.length} recommendations`}
              </button>
            )}
          </section>
        )}

        {/* ── All Products ── */}
        <h2 className="text-lg font-extrabold text-zinc-900 mb-3">📦 All Products</h2>
        {items.length === 0 ? (
          <div className="text-center py-16 text-zinc-400 text-sm">No products yet.</div>
        ) : (
          <div className="space-y-3">
            {otherProducts.map((p) => (
              <div key={p.id as string} className="bg-white rounded-2xl border border-rose-100 shadow-sm p-5 hover:shadow-md transition">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <Link href={`/portal/products/${p.id}`} className="font-bold text-zinc-900 hover:text-pink-500 transition text-base">
                        {p.name as string}
                      </Link>
                      {(p.target_market as string) && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-100">
                          🌍 {(p.target_market as string).toUpperCase()}
                        </span>
                      )}
                      {(p.merchant_company as string) && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                          🏢 {p.merchant_company as string}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-500 mb-1">
                      📂 {p.category as string} · 💰 {p.commission_value as string || "15% off"}
                    </p>
                    {p.sales_platform ? <span className="text-xs text-zinc-400">{PLATFORM_EMOJI[p.sales_platform as string]} {PLATFORM_LABEL[p.sales_platform as string]}</span> : null}
                    {(p.description as string) && (
                      <p className="text-sm text-gray-500 leading-relaxed line-clamp-2 mb-2">
                        {(p.description as string).slice(0, 150)}
                      </p>
                    )}
                    {(p.commission_link as string) && (
                      <a
                        href={p.commission_link as string}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 font-medium underline underline-offset-2"
                      >
                        💰 Commission Link: {(p.commission_link as string).slice(0, 40)}... ↗
                      </a>
                    )}
                  </div>
                  {myInterests.has(p.id as string) ? (
                    <Link href={`/portal/products/${p.id}`} className="px-4 py-2 bg-emerald-50 text-emerald-700 rounded-full text-sm font-bold shrink-0 hover:bg-emerald-100 transition">
                      ✓ Accepted
                    </Link>
                  ) : (
                    <button onClick={() => express(p.id as string)} className="btn-brand px-5 py-2 text-sm shrink-0">Accept</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
