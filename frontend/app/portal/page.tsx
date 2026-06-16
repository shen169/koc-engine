"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Spark from "@/components/Spark";
import { auth, credits, tasks, getToken, clearToken, getRole, getConsolePath } from "@/lib/api";
import NavBar from "@/components/NavBar";

export default function PortalDashboard() {
  const router = useRouter();

  // Role guard — redirect non-KOC users
  const token = getToken();
  const role = getRole();
  if (!token) { router.push("/login"); return null; }
  if (role && role !== "koc") { router.push(getConsolePath(role || "")); return null; }

  const [user, setUser] = useState<Record<string, unknown> | null>(null);
  const [balance, setBalance] = useState(0);
  const [taskList, setTaskList] = useState<Array<Record<string, unknown>>>([]);

  useEffect(() => {
    const token = getToken();
    if (!token) { router.push("/login"); return; }
    auth.me(token).then(setUser).catch(() => { clearToken(); router.push("/login"); });
    credits.balance(token).then((r) => setBalance(r.balance)).catch(() => {});
    tasks.list(token).then(setTaskList).catch(() => {});
  }, [router]);

  if (!user) return <div className="flex items-center justify-center min-h-screen bg-orange-50 text-zinc-400">Loading...</div>;

  return (
    <div className="min-h-screen bg-orange-50">
      <NavBar user={user} role="koc" balance={balance} />

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Quick Actions */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          {[
            { href: "/portal/hall", label: "🏪 Task Hall", desc: "Discover new tasks" },
            { href: "/portal/products", label: "🛍 Browse Products", desc: "Find products to promote" },
            { href: "/portal/tasks", label: "📋 My Tasks", desc: `${taskList.length} active` },
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
              {taskList.slice(0, 5).map((t) => (
                <Link key={t.id as string} href={`/portal/tasks/${t.id}`} className="block p-4 bg-zinc-50 rounded-xl hover:bg-pink-50 transition">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-semibold text-zinc-900">{t.product_name as string || "Task"}</span>
                      <span className={`ml-3 text-xs px-2 py-0.5 rounded-full font-semibold ${t.delivered ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                        {t.delivered ? "Delivered" : t.sample_status === "sent" ? "Sample Sent" : "Pending"}
                      </span>
                    </div>
                    <span className="text-sm font-bold brand-gradient-text">+{t.credits_reward as number} pts</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
