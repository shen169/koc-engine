"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { products, matching, getToken, getRole, getConsolePath } from "@/lib/api";
import NavBar from "@/components/NavBar";

interface MatchResult {
  koc_id: string;
  display_name: string;
  tier: string;
  niche_tags: string[];
  score_total: number;
  follower_count: number;
  region: string;
  avg_rating: number;
  completed_tasks: number;
  match_score: number;
  match_reasons: string[];
  source: string;
}

export default function MyProducts() {
  const router = useRouter();
  const token = getToken();
  const role = getRole();
  if (!token) { router.push("/login"); return null; }
  if (role && role !== "merchant") { router.push(getConsolePath(role || "")); return null; }

  const [items, setItems] = useState<Array<Record<string, unknown>>>([]);
  const [matchModal, setMatchModal] = useState<{ productId: string; productName: string } | null>(null);
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [matchingLoading, setMatchingLoading] = useState(false);
  const [sendingInterest, setSendingInterest] = useState(false);

  useEffect(() => {
    products.list(token!).then(setItems).catch(() => {});
  }, []);

  async function toggleStatus(productId: string, currentStatus: string) {
    const newStatus = currentStatus === "active" ? "paused" : "active";
    await fetch(`http://localhost:8001/api/products/${productId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status: newStatus }),
    });
    products.list(token!).then(setItems).catch(() => {});
  }

  async function openMatchModal(productId: string, productName: string) {
    setMatchModal({ productId, productName });
    setMatches([]);
    setSelected(new Set());
    setMatchingLoading(true);
    try {
      const result = await matching.forProduct(productId, { top_n: 10 }, token!);
      setMatches((result.matches as MatchResult[]) || []);
    } catch (err) {
      console.error("Matching failed", err);
    } finally {
      setMatchingLoading(false);
    }
  }

  function toggleSelect(kocId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(kocId)) next.delete(kocId);
      else next.add(kocId);
      return next;
    });
  }

  async function sendBatchInterest() {
    if (selected.size === 0 || !matchModal) return;
    setSendingInterest(true);
    try {
      await matching.autoInterest(
        { product_id: matchModal.productId, koc_ids: [...selected] },
        token!
      );
      setMatchModal(null);
    } catch (err) {
      console.error("Auto interest failed", err);
    } finally {
      setSendingInterest(false);
    }
  }

  const tierBadge = (tier: string) => {
    const colors: Record<string, string> = {
      L3: "bg-gradient-to-r from-pink-500 to-purple-500 text-white",
      L2: "bg-purple-100 text-purple-700",
      L1: "bg-pink-100 text-pink-700",
    };
    const labels: Record<string, string> = { L3: "合伙人", L2: "创作官", L1: "体验官" };
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${colors[tier] || "bg-slate-100 text-slate-500"}`}>
        {tier} {labels[tier] || ""}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <NavBar user={null} role="merchant" title="我的产品" />
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex justify-end mb-4">
          <Link href="/dashboard/products/new" className="px-3 py-1.5 bg-indigo-600 text-white rounded text-sm">+ New Product</Link>
        </div>
        {items.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-100 p-8 text-center">
            <p className="text-slate-400 mb-3">No products listed yet.</p>
            <Link href="/dashboard/products/new" className="text-indigo-600 text-sm hover:underline">Add your first product</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((p) => (
              <div key={p.id as string} className="bg-white rounded-xl border border-slate-100 p-4 flex justify-between items-center">
                <div>
                  <h3 className="font-semibold text-slate-900">{p.name as string}</h3>
                  <p className="text-xs text-slate-400">{p.category as string} · {p.commission_value as string} · ASIN: {p.asin as string}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${p.status === "active" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                    {p.status as string}
                  </span>
                  <button onClick={() => openMatchModal(p.id as string, p.name as string)}
                    className="text-xs px-3 py-1 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-full font-bold hover:opacity-90 transition-opacity">
                    🔍 智能匹配
                  </button>
                  <button onClick={() => toggleStatus(p.id as string, p.status as string)}
                    className="text-xs text-slate-500 hover:text-indigo-600 underline">
                    {p.status === "active" ? "Pause" : "Activate"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── 匹配结果 Modal ── */}
        {matchModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }} onClick={() => setMatchModal(null)}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
              {/* Header */}
              <div className="p-5 border-b border-slate-100 flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">🔍 智能匹配</h3>
                  <p className="text-xs text-slate-400 mt-0.5">为「{matchModal.productName}」推荐 KOC</p>
                </div>
                <button onClick={() => setMatchModal(null)} className="text-slate-300 hover:text-slate-600 text-xl leading-none">&times;</button>
              </div>

              {/* Match List */}
              <div className="flex-1 overflow-y-auto p-5">
                {matchingLoading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full mx-auto mb-3" />
                    <p className="text-sm text-slate-400">正在分析最佳匹配...</p>
                  </div>
                ) : matches.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-sm">No eligible KOCs found.</div>
                ) : (
                  <div className="space-y-3">
                    {matches.map((m) => (
                      <label
                        key={m.koc_id}
                        className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                          selected.has(m.koc_id)
                            ? "border-pink-400 bg-pink-50"
                            : "border-slate-100 hover:border-slate-200"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selected.has(m.koc_id)}
                          onChange={() => toggleSelect(m.koc_id)}
                          className="mt-1 accent-pink-500"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-sm text-slate-900">{m.display_name}</span>
                            {tierBadge(m.tier)}
                            <span className="text-xs font-mono text-pink-600 font-bold">{m.match_score}分</span>
                            {m.source === "ai" && <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">🤖 AI</span>}
                          </div>
                          <div className="flex flex-wrap gap-1 mb-1">
                            {m.niche_tags.map((t) => (
                              <span key={t} className="px-1.5 py-0.5 bg-slate-100 rounded text-xs text-slate-500">{t}</span>
                            ))}
                          </div>
                          <div className="text-xs text-slate-400">
                            {m.region} · {m.follower_count.toLocaleString()} followers · ⭐ {m.avg_rating} · {m.completed_tasks} tasks
                          </div>
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {m.match_reasons.map((r, i) => (
                              <span key={i} className="px-1.5 py-0.5 bg-green-50 text-green-700 rounded text-xs">{r}</span>
                            ))}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              {matches.length > 0 && (
                <div className="p-4 border-t border-slate-100 flex justify-between items-center">
                  <span className="text-xs text-slate-400">
                    {selected.size > 0 ? `已选 ${selected.size} 个 KOC` : "勾选要发送意向的 KOC"}
                  </span>
                  <button
                    onClick={sendBatchInterest}
                    disabled={selected.size === 0 || sendingInterest}
                    className="px-5 py-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-full text-sm font-bold disabled:opacity-50 hover:opacity-90 transition-opacity"
                  >
                    {sendingInterest ? "发送中..." : `🚀 一键发送意向 (${selected.size})`}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
