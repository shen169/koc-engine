"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Spark from "@/components/Spark";
import { applications, getToken } from "@/lib/api";

export default function AdminApplications() {
  const [apps, setApps] = useState<Array<Record<string, unknown>>>([]);
  const [filter, setFilter] = useState("pending");

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    applications.list(token).then((data) => setApps(data as Array<Record<string, unknown>>)).catch(() => {});
  }, []);

  const filtered = filter === "all" ? apps : apps.filter((a) => a.decision === filter);
  const decisionBadge: Record<string, string> = { approved: "bg-emerald-50 text-emerald-700", rejected: "bg-rose-50 text-rose-700", watching: "bg-amber-50 text-amber-700", pending: "bg-zinc-50 text-zinc-600" };

  return (
    <div className="min-h-screen bg-zinc-50">
      <nav className="bg-white border-b border-zinc-100 h-14 flex items-center px-6 shadow-sm gap-4">
        <Link href="/admin" className="text-pink-500 text-sm font-semibold hover:underline">&larr; Admin</Link>
        <h1 className="font-extrabold text-zinc-900">Applications</h1>
        <div className="flex gap-1 ml-auto">
          {["pending", "approved", "rejected", "watching", "all"].map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition ${filter === f ? "btn-brand" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"}`}>{f}</button>
          ))}
        </div>
      </nav>
      <div className="max-w-3xl mx-auto px-6 py-8">
        {filtered.length === 0 ? (
          <div className="text-center py-12"><Spark size={32} className="mx-auto opacity-30" /><p className="text-zinc-400 text-sm mt-2">No results.</p></div>
        ) : (
          <div className="space-y-3">
            {filtered.map((a) => {
              const form = a.raw_form as Record<string, unknown> || {};
              return (
                <div key={a.id as string} className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-5">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="font-bold text-zinc-900">{form.name as string || "Unknown"}</span>
                      <span className="text-xs text-zinc-400 ml-2">@{form.handle as string} &middot; {form.platform as string}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-extrabold brand-gradient-text">{a.ai_score as number}/100</span>
                      <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-bold ${decisionBadge[a.decision as string] || ""}`}>{a.decision as string}</span>
                    </div>
                  </div>
                  <p className="text-xs text-zinc-400 mb-2">{a.ai_reason as string}</p>
                  <p className="text-xs text-zinc-400 mb-3">{form.follower_count as string} followers &middot; {form.region as string} &middot; {form.email as string}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
