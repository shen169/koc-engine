"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Spark from "@/components/Spark";
import { admin, applications, interests, getToken, clearToken, auth } from "@/lib/api";

export default function AdminPage() {
  const router = useRouter();
  const [stats, setStats] = useState<Record<string, unknown> | null>(null);
  const [pendingApps, setPendingApps] = useState<Array<Record<string, unknown>>>([]);
  const [mutual, setMutual] = useState<Array<Record<string, unknown>>>([]);

  useEffect(() => {
    const token = getToken();
    if (!token) { router.push("/login"); return; }
    auth.me(token).then((u) => {
      if (u.role !== "admin") { router.push("/dashboard"); return; }
      admin.stats(token).then(setStats).catch(() => {});
      applications.list(token).then((list) =>
        setPendingApps((list as Array<Record<string, unknown>>).filter((a) => a.decision === "pending"))
      ).catch(() => {});
      interests.matches(token).then(setMutual).catch(() => {});
    }).catch(() => { clearToken(); router.push("/login"); });
  }, [router]);

  async function handleDecision(appId: string, decision: string) {
    const token = getToken();
    if (!token) return;
    await applications.decide(appId, decision, token);
    setPendingApps((prev) => prev.filter((a) => a.id !== appId));
    admin.stats(token).then(setStats).catch(() => {});
  }

  const navLinks = [
    ["/admin/applications", "Applications"],
    ["/admin/koc", "KOCs"],
    ["/admin/merchants", "Merchants"],
    ["/admin/interests", "Matches"],
    ["/admin/tasks", "Tasks"],
  ];

  return (
    <div className="min-h-screen bg-zinc-50">
      <nav className="bg-white border-b border-zinc-100 h-14 flex items-center justify-between px-6 shadow-sm">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Spark size={20} />
            <h1 className="font-extrabold text-zinc-900">Admin</h1>
          </div>
          <div className="flex gap-1">
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
          {/* Pending Applications */}
          <div className="bg-white rounded-2xl border border-rose-100 shadow-sm p-6">
            <h2 className="font-extrabold text-zinc-900 mb-4">🔍 Pending Applications ({pendingApps.length})</h2>
            {pendingApps.length === 0 ? (
              <div className="text-center py-6"><Spark size={32} className="mx-auto opacity-30" /><p className="text-zinc-400 text-sm mt-2">All caught up!</p></div>
            ) : (
              <div className="space-y-3">
                {pendingApps.slice(0, 5).map((a) => {
                  const form = a.raw_form as Record<string, unknown> || {};
                  return (
                    <div key={a.id as string} className="p-4 bg-zinc-50 rounded-xl">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <span className="font-semibold text-zinc-900">{form.name as string || "Unknown"}</span>
                          <span className="text-xs text-zinc-400 ml-2">@{form.handle as string}</span>
                        </div>
                        <span className="text-sm font-extrabold brand-gradient-text">{a.ai_score as number}/100</span>
                      </div>
                      <div className="flex gap-2">
                        {[{ l: "Approve", d: "approved", c: "bg-emerald-500 hover:bg-emerald-600" }, { l: "Reject", d: "rejected", c: "bg-rose-500 hover:bg-rose-600" }, { l: "Watch", d: "watching", c: "bg-amber-500 hover:bg-amber-600" }].map((b) => (
                          <button key={b.d} onClick={() => handleDecision(a.id as string, b.d)}
                            className={`flex-1 py-1.5 ${b.c} text-white rounded-full text-xs font-bold transition`}>{b.l}</button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

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
        </div>
      </div>
    </div>
  );
}
