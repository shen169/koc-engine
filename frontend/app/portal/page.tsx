"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Spark from "@/components/Spark";
import IntegrityBadge from "@/components/IntegrityBadge";
import { auth, credits, tasks, getToken, clearToken, getRole, getConsolePath } from "@/lib/api";
import NavBar from "@/components/NavBar";

function TrustLevelBadge({ score, tier }: { score: number; tier: string }) {
  const tierColors: Record<string, string> = {
    L3: "bg-gradient-to-r from-amber-400 to-orange-500 text-white",
    L2: "bg-purple-100 text-purple-700",
    L1: "bg-pink-100 text-pink-700",
  };
  const tierLabel: Record<string, string> = {
    L3: "Partner",
    L2: "Creator",
    L1: "Explorer",
  };
  return (
    <div className="flex items-center gap-2">
      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${tierColors[tier] || "bg-gray-100 text-gray-600"}`}>
        {tier} {tierLabel[tier] || ""}
      </span>
      <IntegrityBadge score={score} />
    </div>
  );
}

export default function PortalDashboard() {
  const router = useRouter();

  const [authorized, setAuthorized] = useState(false);
  const [user, setUser] = useState<Record<string, unknown> | null>(null);
  const [balance, setBalance] = useState(0);
  const [taskList, setTaskList] = useState<Array<Record<string, unknown>>>([]);
  const [kocProfile, setKocProfile] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    const token = getToken();
    const role = getRole();
    if (!token) { router.push("/login"); return; }
    if (role && role !== "koc") { router.push(getConsolePath(role || "")); return; }

    auth.me(token).then((u) => {
      setUser(u);
      if ((u as any).koc_profile) {
        setKocProfile((u as any).koc_profile);
        setAuthorized(true);
      } else {
        // No KOC profile yet — redirect to application
        router.push("/koc/apply");
      }
    }).catch(() => { clearToken(); router.push("/login"); });
    credits.balance(token).then((r) => setBalance(r.balance)).catch(() => {});
    tasks.mine(token).then(setTaskList).catch(() => {});
  }, [router]);

  if (!authorized || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-orange-50 text-zinc-400">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-orange-50">
      <NavBar user={user} role="koc" balance={balance} />

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Trust & Tier Card */}
        {kocProfile && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-gray-400 mb-1">My Trust</div>
                <TrustLevelBadge
                  score={kocProfile.trust_score as number}
                  tier={kocProfile.tier as string}
                />
              </div>
              <div className="flex gap-4 text-sm">
                <div className="text-center">
                  <div className="font-bold text-gray-900">{kocProfile.completed_tasks as number}</div>
                  <div className="text-xs text-gray-400">Completed</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-gray-900">{(kocProfile.avg_rating as number)?.toFixed(1) || "—"}</div>
                  <div className="text-xs text-gray-400">Avg Rating</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          {[
            { href: "/portal/hall", label: "🏪 Task Hall", desc: "Discover new tasks" },
            { href: "/portal/products", label: "🛍 Browse Products", desc: "Find products to promote" },
            { href: "/portal/tasks", label: "📋 My Tasks", desc: `${taskList.length}/5 active` },
            { href: "/portal/credits", label: "💰 Credits", desc: `${balance} points` },
            { href: "/portal/coupons", label: "🏷 Coupons", desc: "Your discount codes" },
          ].map((item) => (
            <Link key={item.href} href={item.href} className="bg-white rounded-2xl p-5 border border-rose-100 shadow-sm hover:border-pink-200 transition">
              <div className="font-bold text-zinc-900 mb-1">{item.label}</div>
              <div className="text-sm text-zinc-500">{item.desc}</div>
            </Link>
          ))}
        </div>

        {/* Tasks */}
        <div className="bg-white rounded-2xl border border-rose-100 shadow-sm p-6">
          <h2 className="text-lg font-extrabold text-zinc-900 mb-4">Recent Tasks</h2>
          {taskList.length === 0 ? (
            <div className="text-center py-8">
              <Spark size={36} className="mx-auto mb-3 opacity-40" />
              <p className="text-zinc-400 text-sm">No tasks yet. Browse products and express interest!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {taskList.slice(0, 5).map((t) => {
                const task = (t.task || t) as Record<string, unknown>;
                const slot = t.my_slot as Record<string, unknown> | undefined;
                const status = slot?.status || task.task_status || "pending";
                const statusColors: Record<string, string> = {
                  submitted: "bg-emerald-50 text-emerald-700",
                  received: "bg-blue-50 text-blue-700",
                  shipped: "bg-purple-50 text-purple-700",
                  accepted: "bg-amber-50 text-amber-700",
                  assigned: "bg-pink-50 text-pink-700",
                };
                const statusLabels: Record<string, string> = {
                  submitted: "Submitted",
                  received: "Received",
                  shipped: "Shipped",
                  accepted: "Accepted",
                  assigned: "Assigned",
                  pending: "Pending",
                };
                return (
                <Link key={task.id as string} href={`/portal/tasks/${task.id}`} className="block p-4 bg-zinc-50 rounded-xl hover:bg-pink-50 transition">
                  <div className="flex justify-between items-start">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-zinc-900 truncate">{task.product_name as string || "Task"}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${statusColors[status as string] || "bg-zinc-100 text-zinc-500"}`}>
                          {statusLabels[status as string] || (status as string)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-zinc-400">
                        {(task.product_category as string) ? <span>📂 {task.product_category as string}</span> : null}
                        {(task.product_target_market as string) ? <span>🌍 {task.product_target_market as string}</span> : null}
                        {(task.merchant_company as string) ? <span>🏢 {task.merchant_company as string}</span> : null}
                      </div>
                    </div>
                    <span className="text-sm font-bold text-pink-600 shrink-0 ml-3">+{task.commission as number || 0} pts</span>
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
