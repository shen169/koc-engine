"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, auth, getToken, clearToken } from "@/lib/api";
import Spark from "@/components/Spark";

export default function AdminReports() {
  const router = useRouter();
  const [reports, setReports] = useState<Array<Record<string, unknown>>>([]);
  const [filter, setFilter] = useState("pending");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) { router.push("/login"); return; }
    auth.me(token).then((u) => {
      if (u.role !== "admin") { router.push("/dashboard"); return; }
      loadReports();
    }).catch(() => { clearToken(); router.push("/login"); });
  }, [filter, router]);

  async function loadReports() {
    const token = getToken();
    if (!token) return;
    try {
      const data = await api<Array<Record<string, unknown>>>(
        `/api/admin/reports?status=${filter}`,
        { token }
      );
      setReports(Array.isArray(data) ? data : []);
    } catch {
      setReports([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleReview(reportId: string, decision: string) {
    const token = getToken();
    if (!token) return;
    await api(`/api/admin/reports/${reportId}/review`, {
      method: "PUT",
      body: { decision },
      token,
    });
    loadReports();
  }

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-700",
    approved: "bg-emerald-100 text-emerald-700",
    rejected: "bg-zinc-100 text-zinc-500",
  };

  return (
    <div className="min-h-screen bg-zinc-50">
      <nav className="bg-white border-b border-zinc-100 h-14 flex items-center px-6 shadow-sm gap-4">
        <Link href="/admin" className="text-pink-500 text-sm font-semibold hover:underline">
          &larr; Admin
        </Link>
        <h1 className="font-extrabold text-zinc-900">⚖️ Reports & Disputes</h1>
        <div className="flex gap-1 ml-auto">
          {["pending", "approved", "rejected"].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold capitalize transition ${
                filter === s
                  ? s === "pending"
                    ? "bg-yellow-400 text-yellow-900"
                    : s === "approved"
                    ? "bg-emerald-500 text-white"
                    : "bg-zinc-300 text-zinc-700"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
              }`}
            >
              {s} {filter === s && reports.length > 0 ? `(${reports.length})` : ""}
            </button>
          ))}
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {loading ? (
          <div className="text-center py-12">
            <Spark size={32} className="mx-auto opacity-30" />
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-12">
            <Spark size={32} className="mx-auto opacity-30" />
            <p className="text-zinc-400 text-sm mt-2">
              {filter === "pending"
                ? "No pending reports. All clear! 🎉"
                : `No ${filter} reports.`}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map((r) => (
              <div
                key={r.id as string}
                className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-5"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-zinc-900">
                        {r.reporter_role === "koc" ? "🎬 KOC" : "🏢 Merchant"}{" "}
                        reports{" "}
                        {r.reported_entity_type === "koc" ? "KOC" : "Merchant"}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                          statusColors[r.status as string] || ""
                        }`}
                      >
                        {r.status as string}
                      </span>
                    </div>
                    <p className="text-sm text-zinc-600">
                      {(r.reason as string) || "No reason provided"}
                    </p>
                    <div className="flex gap-4 mt-2 text-xs text-zinc-400">
                      <span>Reporter: {(r.reporter_user_id as string)?.slice(0, 8)}</span>
                      <span>Entity: {(r.reported_entity_id as string)?.slice(0, 8)}</span>
                      {(r.task_id as string) && (
                        <span>Task: {(r.task_id as string)?.slice(0, 8)}</span>
                      )}
                      <span>
                        {r.created_at
                          ? new Date(r.created_at as string).toLocaleDateString()
                          : ""}
                      </span>
                    </div>
                  </div>
                </div>

                {r.status === "pending" && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleReview(r.id as string, "approved")}
                      className="px-4 py-2 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600 transition"
                    >
                      🚫 Uphold & Penalize (-30 Trust)
                    </button>
                    <button
                      onClick={() => handleReview(r.id as string, "rejected")}
                      className="px-4 py-2 bg-zinc-200 text-zinc-600 rounded-xl text-sm font-bold hover:bg-zinc-300 transition"
                    >
                      Dismiss Report
                    </button>
                  </div>
                )}

                {r.status !== "pending" && (
                  <div className="text-xs text-zinc-400 mt-2">
                    Reviewed: {r.reviewed_at ? new Date(r.reviewed_at as string).toLocaleDateString() : ""}
                    {(r.penalty as number) !== undefined && (
                      <span className="ml-2 text-red-500 font-bold">
                        Penalty: {String(r.penalty)} trust
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
