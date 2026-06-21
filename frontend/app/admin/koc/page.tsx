"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { kocs, getToken } from "@/lib/api";
import Spark from "@/components/Spark";

export default function AdminKocList() {
  const [list, setList] = useState<Array<Record<string, unknown>>>([]);
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    kocs.list(token).then(setList).catch(() => {});
  }, []);

  async function updateKoc(kocId: string, updates: Record<string, unknown>) {
    const token = getToken();
    if (!token) return;
    await fetch(`http://localhost:8001/api/koc/${kocId}`, {
      method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(updates),
    });
    kocs.list(token).then(setList).catch(() => {});
  }

  const filtered = statusFilter ? list.filter((k) => k.status === statusFilter) : list;
  const tierBadge: Record<string, string> = { L1: "bg-pink-50 text-pink-700", L2: "bg-purple-50 text-purple-700", L3: "brand-gradient text-white" };
  const statusBadge: Record<string, string> = { Approved: "bg-emerald-50 text-emerald-700", Applied: "bg-amber-50 text-amber-700", Delivered: "bg-emerald-50 text-emerald-700", Ghosted: "bg-rose-50 text-rose-700", SampleSent: "bg-cyan-50 text-cyan-700", Submitted: "bg-blue-50 text-blue-700" };

  return (
    <div className="min-h-screen bg-zinc-50">
      <nav className="bg-white border-b border-zinc-100 h-14 flex items-center px-6 shadow-sm gap-4">
        <Link href="/admin" className="text-pink-500 text-sm font-semibold hover:underline">&larr; Admin</Link>
        <h1 className="font-extrabold text-zinc-900">KOC Management ({filtered.length})</h1>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="ml-auto rounded-full border-2 border-zinc-200 px-4 py-1.5 text-sm font-semibold outline-none focus:border-pink-400">
          <option value="">All Statuses</option>
          <option value="Applied">Applied</option><option value="Approved">Approved</option>
          <option value="SampleSent">SampleSent</option><option value="Submitted">Submitted</option>
          <option value="Delivered">Delivered</option><option value="Ghosted">Ghosted</option>
        </select>
      </nav>
      <div className="max-w-4xl mx-auto px-6 py-8">
        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <Spark size={32} className="mx-auto opacity-30" />
            <p className="text-zinc-400 text-sm mt-2">No KOCs yet. New KOC applications will appear here after admin approval.</p>
          </div>
        ) : (
        <div className="space-y-2">
          {filtered.map((k) => (
            <div key={k.id as string} className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full brand-gradient flex items-center justify-center text-white font-extrabold text-sm">
                  {(k.display_name as string || "K")[0]}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-zinc-900">{k.display_name as string || "—"}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${tierBadge[k.tier as string] || ""}`}>{k.tier as string}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${statusBadge[k.status as string] || "bg-zinc-50 text-zinc-600"}`}>{k.status as string}</span>
                  </div>
                  <p className="text-xs text-zinc-400">@{k.handle as string} &middot; {(k.follower_count as number)?.toLocaleString()} followers &middot; AI: {k.score_total as number} &middot; ⭐ {(k.avg_rating as number)?.toFixed(1)}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <select onChange={(e) => { if (e.target.value) updateKoc(k.id as string, { tier: e.target.value }); }}
                  className="rounded-full border border-zinc-200 px-2 py-1 text-xs font-semibold outline-none" defaultValue="">
                  <option value="" disabled>Tier</option><option value="L1">L1</option><option value="L2">L2</option><option value="L3">L3</option>
                </select>
                <select onChange={(e) => { if (e.target.value) updateKoc(k.id as string, { status: e.target.value }); }}
                  className="rounded-full border border-zinc-200 px-2 py-1 text-xs font-semibold outline-none" defaultValue="">
                  <option value="" disabled>Status</option><option value="Approved">Approved</option><option value="Ghosted">Ghosted</option><option value="Collaborating">Collaborating</option>
                </select>
              </div>
            </div>
          ))}
        </div>
        )}
      </div>
    </div>
  );
}
