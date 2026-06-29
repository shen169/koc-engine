"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Spark from "@/components/Spark";
import { admin, interests, api, getToken, clearToken, auth } from "@/lib/api";

export default function AdminPage() {
  const router = useRouter();
  const [stats, setStats] = useState<Record<string, unknown> | null>(null);
  const [mutual, setMutual] = useState<Array<Record<string, unknown>>>([]);
  const [alerts, setAlerts] = useState<Array<Record<string, unknown>>>([]);
  const [pendingReports, setPendingReports] = useState(0);

  useEffect(() => {
    const token = getToken();
    if (!token) { router.push("/login"); return; }
    auth.me(token).then((u) => {
      if (u.role !== "admin") { router.push("/dashboard"); return; }
      admin.stats(token).then(setStats).catch(() => {});
      interests.matches(token).then(setMutual).catch(() => {});
      // Load alerts
      api<Array<Record<string, unknown>>>("/api/admin/cron/alerts", { token })
        .then((data) => setAlerts(Array.isArray(data) ? data : []))
        .catch(() => {});
      // Load pending report count
      api<Array<Record<string, unknown>>>("/api/admin/reports?status=pending", { token })
        .then((data) => setPendingReports(Array.isArray(data) ? data.length : 0))
        .catch(() => {});
    }).catch(() => { clearToken(); router.push("/login"); });
  }, [router]);

  const navLinks = [
    ["/admin/applications", "Applications"],
    ["/admin/koc", "KOCs"],
    ["/admin/merchants", "Merchants"],
    ["/admin/interests", "Matches"],
    ["/admin/tasks", "Tasks"],
    ["/admin/products", "Products"],
    ["/admin/credits", "💰 Credits"],
    ["/admin/reports", `⚖️ Reports${pendingReports > 0 ? ` (${pendingReports})` : ""}`],
    ["/admin/reviews", "⭐ Reviews"],
    ["/admin/blacklist", "🚫 Blacklist"],
    ["/admin/fraud", "🛡️ Fraud Monitor"],
  ];

  const alertCount = alerts.length;

  return (
    <div className="min-h-screen bg-zinc-50">
      <nav className="bg-white border-b border-zinc-100 h-14 flex items-center justify-between px-6 shadow-sm">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Spark size={20} />
            <h1 className="font-extrabold text-zinc-900">Admin</h1>
          </div>
          <div className="flex gap-1 flex-wrap">
            {navLinks.map(([href, label]) => (
              <Link key={href} href={href} className="px-3 py-1.5 rounded-full text-xs font-semibold text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 transition">
                {label}
              </Link>
            ))}
          </div>
        </div>
        <button onClick={() => { clearToken(); router.push("/"); }} className="text-sm text-zinc-400 hover:text-zinc-600">Sign Out</button>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Alerts Banner */}
        {alertCount > 0 && (
          <Link href="/admin/tasks" className="block mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl hover:bg-amber-100 transition">
            <div className="flex items-center gap-2">
              <span className="text-lg">⚠️</span>
              <span className="font-bold text-amber-800">{alertCount} active alert{alertCount > 1 ? "s" : ""}</span>
              <span className="text-amber-600 text-sm">
                — SLA violations, idle slots, or overdue tasks need attention
              </span>
              <span className="ml-auto text-amber-500 text-sm font-semibold">View Tasks →</span>
            </div>
          </Link>
        )}

        {/* Dispute Alerts */}
        {pendingReports > 0 && (
          <Link href="/admin/reports" className="block mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl hover:bg-red-100 transition">
            <div className="flex items-center gap-2">
              <span className="text-lg">🚨</span>
              <span className="font-bold text-red-800">{pendingReports} pending report{pendingReports > 1 ? "s" : ""}</span>
              <span className="text-red-600 text-sm">
                — Reports require admin review and decision
              </span>
              <span className="ml-auto text-red-500 text-sm font-semibold">Review Now →</span>
            </div>
          </Link>
        )}

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-6 gap-3 mb-8">
            {(function () {
              const items: Array<[string, number]> = [
                ["KOCs", (stats.kocs as Record<string, unknown>)?.total as number || 0],
                ["Merchants", (stats.merchants as Record<string, unknown>)?.total as number || 0],
                ["Products", (stats.products as Record<string, unknown>)?.total as number || 0],
                ["Tasks", (stats.tasks as Record<string, unknown>)?.total as number || 0],
                ["Pending Apps", (stats.applications as Record<string, unknown>)?.pending as number || 0],
                ["Mutual 💚", (stats.interests as Record<string, unknown>)?.mutual_matches as number || 0],
              ];
              return items.map(([label, val]) => (
                <div key={label} className="bg-white rounded-2xl border border-zinc-100 p-4 text-center">
                  <div className="text-2xl font-extrabold brand-gradient-text">{val}</div>
                  <div className="text-xs text-zinc-500 mt-1">{label}</div>
                </div>
              ));
            })()}
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          {/* Mutual Matches */}
          <div className="bg-white rounded-2xl border border-rose-100 shadow-sm p-6">
            <h2 className="font-extrabold text-zinc-900 mb-4">💚 Mutual Matches ({mutual.length})</h2>
            {mutual.length === 0 ? (
              <div className="text-center py-6"><Spark size={32} className="mx-auto opacity-30" /><p className="text-zinc-400 text-sm mt-2">No mutual interest yet.</p></div>
            ) : (
              <div className="space-y-3">
                {mutual.map((m) => (
                  <div key={m.koc_interest_id as string} className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <p className="text-sm font-semibold text-zinc-900">
                      {m.koc_display_name as string} <span className="text-zinc-400 mx-2">↔</span> {m.merchant_company as string}
                    </p>
                    <button onClick={async () => {
                      const token = getToken();
                      if (!token) return;
                      await interests.match(m.koc_interest_id as string, token);
                      await interests.match(m.merchant_interest_id as string, token);
                      setMutual((prev) => prev.filter((x) => x.koc_interest_id !== m.koc_interest_id));
                    }} className="mt-2 px-4 py-1.5 bg-emerald-500 text-white rounded-full text-xs font-bold hover:bg-emerald-600 transition">
                      ⚡ Match & Connect
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Alerts Panel */}
          <div className="bg-white rounded-2xl border border-amber-100 shadow-sm p-6">
            <h2 className="font-extrabold text-zinc-900 mb-4">
              ⚠️ Active Alerts ({alertCount})
            </h2>
            {alerts.length === 0 ? (
              <div className="text-center py-6">
                <Spark size={32} className="mx-auto opacity-30" />
                <p className="text-zinc-400 text-sm mt-2">All systems normal. No alerts.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {alerts.slice(0, 20).map((a, i) => (
                  <Link
                    key={i}
                    href={`/admin/tasks/${a.task_id}`}
                    className="block p-3 bg-amber-50 border border-amber-100 rounded-xl hover:bg-amber-100 transition"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-xs font-bold text-amber-800 uppercase">
                          {(a.type as string)?.replace(/_/g, " ")}
                        </span>
                        <p className="text-sm text-zinc-700 mt-0.5">
                          {a.product_name as string || "Task"} — Slot {a.slot_index as number}
                        </p>
                      </div>
                      <span className="text-xs text-zinc-400 whitespace-nowrap">
                        {a.type === "accept_timeout" && `${a.hours_passed}h overdue`}
                        {a.type === "submit_due_soon" && `${a.days_left}d left`}
                        {a.type === "review_due_soon" && `${a.days_left}d left`}
                      </span>
                    </div>
                  </Link>
                ))}
                {alerts.length > 20 && (
                  <p className="text-xs text-zinc-400 text-center py-2">
                    +{alerts.length - 20} more alerts
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-6 grid grid-cols-4 gap-3">
          {[
            ["/admin/reports", "⚖️", "Review Reports", pendingReports > 0 ? `text-red-600` : "text-zinc-600"],
            ["/admin/blacklist", "🚫", "Manage Blacklist", "text-zinc-600"],
            ["/admin/credits", "💰", "Top Up Credits", "text-zinc-600"],
            ["/admin/merchants", "🏢", "View Merchants", "text-zinc-600"],
          ].map(([href, icon, label, color]) => (
            <Link
              key={href}
              href={href}
              className="bg-white rounded-xl border border-zinc-100 p-4 text-center hover:shadow-md transition"
            >
              <div className="text-2xl mb-1">{icon}</div>
              <div className={`text-sm font-semibold ${color}`}>{label}</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
