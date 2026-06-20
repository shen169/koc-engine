"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import NavBar from "@/components/NavBar";
import IntegrityBadge from "@/components/IntegrityBadge";
import { auth, credits, tasks, getToken, getRole, getConsolePath, clearToken } from "@/lib/api";

export default function DashboardPage() {
  const router = useRouter();
  const token = getToken();
  const role = getRole();
  if (!token) { router.push("/login"); return null; }
  if (role && role !== "merchant") { router.push(getConsolePath(role || "")); return null; }

  const [user, setUser] = useState<Record<string, unknown> | null>(null);
  const [merchantProfile, setMerchantProfile] = useState<Record<string, unknown> | null>(null);
  const [balance, setBalance] = useState(0);
  const [taskList, setTaskList] = useState<Array<Record<string, unknown>>>([]);

  useEffect(() => {
    auth.me(token!).then((u) => {
      setUser(u);
      if ((u as any).merchant_profile) {
        setMerchantProfile((u as any).merchant_profile);
      }
    }).catch(() => { clearToken(); router.push("/login"); });
    credits.balance(token!).then((r) => setBalance(r.balance)).catch(() => {});
    tasks.mine(token!).then(setTaskList).catch(() => {});
  }, [router]);

  if (!user) return <div className="flex items-center justify-center min-h-screen bg-purple-50 text-zinc-400">Loading...</div>;

  return (
    <div className="min-h-screen bg-purple-50">
      <NavBar user={user} role="merchant" balance={balance} />

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Trust Card */}
        {merchantProfile && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-gray-400 mb-1">Merchant Trust</div>
                <IntegrityBadge
                  score={merchantProfile.trust_score as number}
                  tier={merchantProfile.tier as string}
                  tierLabels={{ M3: "🏆 Gold Merchant", M2: "🥈 Silver Merchant", M1: "🥉 Bronze Merchant" }}
                  totalCompleted={merchantProfile.total_tasks_completed as number}
                  totalDisputed={merchantProfile.total_tasks_disputed as number}
                  avgRating={merchantProfile.avg_rating as number}
                  showDetails
                />
              </div>
              <div className="flex gap-4 text-sm">
                <div className="text-center">
                  <div className="font-bold text-gray-900">{merchantProfile.completed_tasks as number || 0}</div>
                  <div className="text-xs text-gray-400">Completed</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-gray-900">{(merchantProfile.avg_rating as number)?.toFixed(1) || "—"}</div>
                  <div className="text-xs text-gray-400">Avg Rating</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          {[
            { href: "/dashboard/tasks", label: "📋 Task Management", desc: `${taskList.length} tasks` },
            { href: "/dashboard/tasks/new", label: "➕ New Task", desc: "Launch campaign" },
            { href: "/dashboard/products", label: "📦 My Products", desc: "Manage listings" },
            { href: "/dashboard/koc-pool", label: "🔍 Find Creators", desc: "Browse anonymously" },
            { href: "/dashboard/credits", label: "💰 Credits", desc: `${balance} pts` },
            { href: "/dashboard/coupons", label: "🏷 Coupons", desc: "Discount codes" },
          ].map((item) => (
            <Link key={item.href} href={item.href} className="bg-white rounded-2xl p-5 border border-rose-100 shadow-sm hover:border-purple-200 transition">
              <div className="font-bold text-zinc-900 mb-1">{item.label}</div>
              <div className="text-sm text-zinc-500">{item.desc}</div>
            </Link>
          ))}
        </div>

        {/* Recent Tasks */}
        <div className="bg-white rounded-2xl border border-rose-100 shadow-sm p-6">
          <h2 className="text-lg font-extrabold text-zinc-900 mb-4">Recent Tasks</h2>
          {taskList.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-zinc-400 text-sm">No tasks yet. Publish your first task!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {taskList.slice(0, 5).map((t) => {
                const task = (t.task || t) as Record<string, unknown>;
                const status = task.task_status || task.status || "pending";
                const statusColors: Record<string, string> = {
                  completed: "bg-emerald-50 text-emerald-700",
                  in_progress: "bg-amber-50 text-amber-700",
                  pending: "bg-zinc-50 text-zinc-500",
                };
                const statusLabels: Record<string, string> = {
                  completed: "Completed",
                  in_progress: "Active",
                  pending: "Pending",
                };
                return (
                <Link key={task.id as string} href={`/dashboard/tasks/${task.id}`} className="block p-4 bg-zinc-50 rounded-xl hover:bg-purple-50 transition">
                  <div className="flex justify-between items-start">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-zinc-900 truncate">{task.product_name as string || "Task"}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${statusColors[status as string] || "bg-zinc-100 text-zinc-500"}`}>
                          {statusLabels[status as string] || (status as string)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-zinc-400">
                        {task.task_type ? <span>{task.task_type === "urgent" ? "⚡ Urgent" : "🌊 Long-term"}</span> : null}
                        {task.koc_required ? <span>👥 {task.koc_filled as number || 0}/{task.koc_required as number} KOCs</span> : null}
                      </div>
                    </div>
                    <span className="text-sm font-bold text-purple-600 shrink-0 ml-3">{task.commission as number || 0} pts/KOC</span>
                  </div>
                </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
