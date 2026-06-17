"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import NavBar from "@/components/NavBar";
import IntegrityBadge from "@/components/IntegrityBadge";
import { auth, getToken, getRole, getConsolePath, clearToken } from "@/lib/api";

export default function DashboardPage() {
  const router = useRouter();
  const token = getToken();
  const role = getRole();
  if (!token) { router.push("/login"); return null; }
  if (role && role !== "merchant") { router.push(getConsolePath(role || "")); return null; }

  const [user, setUser] = useState<Record<string, unknown> | null>(null);
  const [merchantProfile, setMerchantProfile] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    auth.me(token!).then((u) => {
      setUser(u);
      if ((u as any).merchant_profile) {
        setMerchantProfile((u as any).merchant_profile);
      }
    }).catch(() => { clearToken(); router.push("/login"); });
  }, [router]);

  if (!user) return <div className="flex items-center justify-center min-h-screen bg-purple-50 text-zinc-400">Loading...</div>;

  return (
    <div className="min-h-screen bg-purple-50">
      <NavBar user={user} role="merchant" />

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Trust Card */}
        {merchantProfile && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-gray-400 mb-1">商家诚信度</div>
                <IntegrityBadge
                  score={merchantProfile.trust_score as number}
                  tier={merchantProfile.tier as string}
                  tierLabels={{ M3: "🏆 金牌商家", M2: "🥈 银牌商家", M1: "🥉 铜牌商家" }}
                  totalCompleted={merchantProfile.total_tasks_completed as number}
                  totalDisputed={merchantProfile.total_tasks_disputed as number}
                  avgRating={merchantProfile.avg_rating as number}
                  showDetails
                />
              </div>
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-4">
          {[
            { href: "/dashboard/tasks", label: "📋 Task Management", desc: "Manage promotions" },
            { href: "/dashboard/tasks/new", label: "➕ New Task", desc: "Launch campaign" },
            { href: "/dashboard/products", label: "📦 My Products", desc: "Manage listings" },
            { href: "/dashboard/koc-pool", label: "🔍 Find Creators", desc: "Browse anonymously" },
          ].map((item) => (
            <Link key={item.href} href={item.href} className="bg-white rounded-2xl p-5 border border-rose-100 shadow-sm hover:border-purple-200 transition">
              <div className="font-bold text-zinc-900 mb-1">{item.label}</div>
              <div className="text-sm text-zinc-500">{item.desc}</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
