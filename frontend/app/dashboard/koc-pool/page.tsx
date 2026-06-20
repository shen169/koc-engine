"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { kocs, interests, getToken, getRole, getConsolePath } from "@/lib/api";
import NavBar from "@/components/NavBar";
import IntegrityBadge from "@/components/IntegrityBadge";

export default function KocPoolPage() {
  const router = useRouter();
  const token = getToken();
  const role = getRole();
  if (!token) { router.push("/login"); return null; }
  if (role && role !== "merchant") { router.push(getConsolePath(role || "")); return null; }

  const [pool, setPool] = useState<Array<Record<string, unknown>>>([]);
  const [myInterests, setMyInterests] = useState<Set<string>>(new Set());

  useEffect(() => {
    kocs.pool(token!).then(setPool).catch(() => {});
    interests.list(token!).then((list) => setMyInterests(new Set((list as Array<Record<string, unknown>>).map((i) => i.to_id as string)))).catch(() => {});
  }, []);

  async function showInterest(kocId: string) {
    await interests.express(kocId, "koc", token!);
    setMyInterests((prev) => new Set([...prev, kocId]));
  }

  const tierBadge: Record<string, string> = { L1: "bg-pink-50 text-pink-700", L2: "bg-purple-50 text-purple-700", L3: "brand-gradient text-white" };

  return (
    <div className="min-h-screen bg-purple-50">
      <NavBar user={null} role="merchant" title="KOC Pool" />
      <div className="max-w-3xl mx-auto px-6 py-8">
        {pool.length === 0 ? (
          <div className="text-center py-16 text-zinc-400 text-sm">No approved creators yet.</div>
        ) : (
          <div className="space-y-3">
            {pool.map((k) => (
              <div key={k.id as string} className="bg-white rounded-2xl border border-rose-100 shadow-sm p-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full brand-gradient flex items-center justify-center text-xl font-extrabold text-white">
                    {(k.display_name as string || "K")[0]}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-zinc-900">{k.display_name as string}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${tierBadge[k.tier as string] || "bg-zinc-100 text-zinc-600"}`}>{k.tier as string}</span>
                    </div>
                    <p className="text-xs text-zinc-400">{(k.niche_tags as string[])?.join(", ") || "General"} &middot; {(k.region as string)} &middot; {(k.follower_count as number)?.toLocaleString()} followers</p>
                    <div className="flex gap-3 mt-1 text-xs text-zinc-400">
                      <span>⭐ {(k.avg_rating as number)?.toFixed(1) || "—"}</span>
                      <span>{k.completed_tasks as number} tasks</span>
                      <span>AI: {k.score_total as number}</span>
                    </div>
                    <div className="mt-1.5">
                      <IntegrityBadge score={k.trust_score as number} />
                    </div>
                  </div>
                </div>
                {myInterests.has(k.id as string) ? (
                  <span className="px-4 py-2 bg-emerald-50 text-emerald-700 rounded-full text-sm font-bold">✓ Interested</span>
                ) : (
                  <button onClick={() => showInterest(k.id as string)} className="btn-brand px-5 py-2 text-sm">Interested</button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
