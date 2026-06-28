"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Spark from "@/components/Spark";
import { api, getToken } from "@/lib/api";

export default function AdminMerchantDetail() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = getToken();
    if (!token || !id) return;
    api<Record<string, unknown>>(`/api/admin/merchants/${id}`, { token })
      .then(setData).catch(() => setError("Failed to load merchant details"));
  }, [id]);

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <p className="text-zinc-400">{error}</p>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <Spark size={24} className="opacity-30" />
      </div>
    );
  }

  const profile = data.profile as Record<string, unknown> || {};
  const products = data.products as Array<Record<string, unknown>> || [];
  const tasks = data.tasks as Record<string, unknown> || {};
  const recentTasks = tasks.recent as Array<Record<string, unknown>> || [];

  const tierLabel: Record<string, string> = { M1: "Bronze", M2: "Silver", M3: "Gold" };
  const tierColors: Record<string, string> = { M1: "bg-amber-50 text-amber-700", M2: "bg-slate-50 text-slate-700", M3: "bg-yellow-50 text-yellow-700" };

  return (
    <div className="min-h-screen bg-zinc-50">
      <nav className="bg-white border-b border-zinc-100 h-14 flex items-center px-6 shadow-sm gap-4">
        <Link href="/admin/merchants" className="text-pink-500 text-sm font-semibold hover:underline">&larr; Merchants</Link>
        <h1 className="font-extrabold text-zinc-900">{profile.company_name as string || "Merchant"}</h1>
        <span className={`ml-auto text-xs px-2 py-0.5 rounded-full font-bold ${tierColors[profile.tier as string] || "bg-zinc-50 text-zinc-600"}`}>
          {tierLabel[profile.tier as string] || profile.tier as string}
        </span>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Info Card */}
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-6">
          <h2 className="font-extrabold text-zinc-900 mb-4">Merchant Info</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-zinc-400">Company</span>
              <p className="font-semibold text-zinc-900">{profile.company_name as string || "—"}</p>
            </div>
            <div>
              <span className="text-zinc-400">Email</span>
              <p className="font-semibold text-zinc-900">{data.user_email as string || "—"}</p>
            </div>
            <div>
              <span className="text-zinc-400">Website</span>
              <p className="font-semibold text-zinc-900">{profile.website as string || "—"}</p>
            </div>
            <div>
              <span className="text-zinc-400">Categories</span>
              <p className="font-semibold text-zinc-900">{(profile.product_categories as string[])?.join(", ") || "—"}</p>
            </div>
            <div>
              <span className="text-zinc-400">Trust Score</span>
              <p className="font-semibold text-zinc-900">{profile.trust_score as number}/100</p>
            </div>
            <div>
              <span className="text-zinc-400">Rating</span>
              <p className="font-semibold text-zinc-900">⭐ {(profile.avg_rating as number)?.toFixed(1) || "—"} · {profile.total_collaborations as number} collabs</p>
            </div>
          </div>
        </div>

        {/* Products */}
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-6">
          <h2 className="font-extrabold text-zinc-900 mb-4">Products ({products.length})</h2>
          {products.length === 0 ? (
            <p className="text-zinc-400 text-sm">No products listed.</p>
          ) : (
            <div className="space-y-2">
              {products.map((p) => (
                <div key={p.id as string} className="flex justify-between items-center p-3 bg-zinc-50 rounded-xl">
                  <div>
                    <span className="font-semibold text-zinc-900 text-sm">{p.name as string}</span>
                    <span className="text-xs text-zinc-400 ml-2">{p.category as string}</span>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${p.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-zinc-100 text-zinc-500"}`}>
                    {p.status as string}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Tasks */}
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-6">
          <h2 className="font-extrabold text-zinc-900 mb-4">
            Tasks ({tasks.total as number}) · Active: {tasks.active as number} · Completed: {tasks.completed as number}
          </h2>
          {recentTasks.length === 0 ? (
            <p className="text-zinc-400 text-sm">No tasks yet.</p>
          ) : (
            <div className="space-y-2">
              {recentTasks.map((t) => (
                <div key={t.id as string} className="flex justify-between items-center p-3 bg-zinc-50 rounded-xl">
                  <div>
                    <span className="font-semibold text-zinc-900 text-sm">{t.product_name as string || "Task"}</span>
                    <span className="text-xs text-zinc-400 ml-2">{t.task_type as string} · {t.koc_required as number} KOCs</span>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${t.task_status === "completed" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                    {t.task_status as string}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
