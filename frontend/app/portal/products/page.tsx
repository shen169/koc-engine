"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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

export default function BrowseProducts() {
  const router = useRouter();
  const token = getToken();
  const role = getRole();
  if (!token) { router.push("/login"); return null; }
  if (role && role !== "koc") { router.push(getConsolePath(role || "")); return null; }

  const [items, setItems] = useState<Array<Record<string, unknown>>>([]);
  const [myInterests, setMyInterests] = useState<Set<string>>(new Set());
  const [recommended, setRecommended] = useState<ProductMatch[]>([]);
  const [recLoading, setRecLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const token = getToken()!;
    products.list(token).then(setItems).catch(() => {});
    interests.list(token).then((list) => setMyInterests(new Set((list as Array<Record<string, unknown>>).map((i) => i.to_id as string)))).catch(() => {});
    // Load recommendations
    matching.forKoc({ top_n: 10 }, token)
      .then((res) => setRecommended((res.matches as ProductMatch[]) || []))
      .catch(() => {})
      .finally(() => setRecLoading(false));
  }, []);

  async function express(productId: string) {
    const token = getToken();
    if (!token) return;
    await interests.express(productId, "product", token);
    setMyInterests((prev) => new Set([...prev, productId]));
  }

  // Filter out recommended products from the full list to avoid dupes
  const recIds = new Set(recommended.map((r) => r.product_id));
  const otherProducts = items.filter((p) => !recIds.has(p.id as string));

  return (
    <div className="min-h-screen bg-orange-50">
      <NavBar user={null} role="koc" title="产品浏览" />
      <div className="max-w-3xl mx-auto px-6 py-8">

        {/* ── 为你推荐 ── */}
        {!recLoading && recommended.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-extrabold text-zinc-900 mb-3 flex items-center gap-2">
              <span className="text-xl">✨</span> 为你推荐
              <span className="text-xs font-normal text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-full">智能匹配</span>
            </h2>
            <div className="space-y-2">
              {recommended.slice(0, showAll ? recommended.length : 5).map((m) => (
                <div key={m.product_id} className="bg-white rounded-2xl border border-pink-200 shadow-sm p-4 flex items-center justify-between relative overflow-hidden">
                  {/* Left accent bar */}
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-pink-400 to-purple-400" />
                  <div className="pl-3">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="font-bold text-zinc-900 text-sm">{m.product_name}</h3>
                      <span className="text-xs font-mono text-pink-600 font-bold">{m.match_score}分</span>
                      {m.source === "ai" && <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">🤖 AI</span>}
                    </div>
                    <p className="text-xs text-zinc-400">{m.product_category} · {m.commission_value || "15% off"}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {m.match_reasons.slice(0, 3).map((r, i) => (
                        <span key={i} className="px-1.5 py-0.5 bg-green-50 text-green-700 rounded text-xs">{r}</span>
                      ))}
                    </div>
                  </div>
                  {myInterests.has(m.product_id) ? (
                    <span className="px-4 py-2 bg-emerald-50 text-emerald-700 rounded-full text-sm font-bold shrink-0">✓ Interested</span>
                  ) : (
                    <button onClick={() => express(m.product_id)} className="btn-brand px-5 py-2 text-sm shrink-0">Interested</button>
                  )}
                </div>
              ))}
            </div>
            {recommended.length > 5 && (
              <button
                onClick={() => setShowAll(!showAll)}
                className="mt-3 text-xs text-pink-500 hover:text-pink-600 font-medium"
              >
                {showAll ? `收起，只显示 Top 5` : `查看全部 ${recommended.length} 个推荐`}
              </button>
            )}
          </section>
        )}

        {/* ── 全部产品 ── */}
        <h2 className="text-lg font-extrabold text-zinc-900 mb-3">📦 全部产品</h2>
        {items.length === 0 ? (
          <div className="text-center py-16 text-zinc-400 text-sm">No products yet.</div>
        ) : (
          <div className="space-y-3">
            {otherProducts.map((p) => (
              <div key={p.id as string} className="bg-white rounded-2xl border border-rose-100 shadow-sm p-5 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-zinc-900">{p.name as string}</h3>
                  <p className="text-xs text-zinc-400">{p.category as string} &middot; {p.commission_value as string || "15% off"}</p>
                </div>
                {myInterests.has(p.id as string) ? (
                  <span className="px-4 py-2 bg-emerald-50 text-emerald-700 rounded-full text-sm font-bold">✓ Interested</span>
                ) : (
                  <button onClick={() => express(p.id as string)} className="btn-brand px-5 py-2 text-sm">Interested</button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
