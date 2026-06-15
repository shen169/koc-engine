"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Spark from "@/components/Spark";
import { auth, getToken, clearToken } from "@/lib/api";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<Record<string, unknown> | null>(null);
  const [role, setRole] = useState("");

  useEffect(() => {
    const token = getToken();
    if (!token) { router.push("/login"); return; }
    setRole(localStorage.getItem("koc_role") || "");
    auth.me(token).then(setUser).catch(() => { clearToken(); router.push("/login"); });
  }, [router]);

  if (!user) return <div className="flex items-center justify-center min-h-screen bg-purple-50 text-zinc-400">Loading...</div>;
  if (role === "admin") { router.push("/admin"); return null; }

  const isMerchant = role === "merchant";
  const bg = isMerchant ? "bg-purple-50" : "bg-orange-50";

  return (
    <div className={`min-h-screen ${bg}`}>
      <nav className="bg-white border-b border-zinc-100 h-14 flex items-center justify-between px-6 shadow-sm">
        <div className="flex items-center gap-3">
          <Spark size={22} />
          <h1 className="font-extrabold text-zinc-900">{isMerchant ? "Brand Dashboard" : "Dashboard"}</h1>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-zinc-400">{user.email as string}</span>
          <button onClick={() => { clearToken(); router.push("/"); }} className="text-zinc-400 hover:text-zinc-600">Sign Out</button>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {isMerchant ? (
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { href: "/dashboard/products", label: "📦 My Products", desc: "Manage listings" },
              { href: "/dashboard/products/new", label: "➕ Add Product", desc: "List for creators" },
              { href: "/dashboard/koc-pool", label: "🔍 Find Creators", desc: "Browse anonymously" },
            ].map((item) => (
              <Link key={item.href} href={item.href} className="bg-white rounded-2xl p-5 border border-rose-100 shadow-sm hover:border-purple-200 transition">
                <div className="font-bold text-zinc-900 mb-1">{item.label}</div>
                <div className="text-sm text-zinc-500">{item.desc}</div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { href: "/portal", label: "🎬 Creator Portal", desc: "Tasks, points, coupons" },
              { href: "/portal/products", label: "🛍 Products", desc: "Find products to promote" },
              { href: "/portal/referrals", label: "👥 Referrals", desc: "Invite & earn points" },
            ].map((item) => (
              <Link key={item.href} href={item.href} className="bg-white rounded-2xl p-5 border border-rose-100 shadow-sm hover:border-pink-200 transition">
                <div className="font-bold text-zinc-900 mb-1">{item.label}</div>
                <div className="text-sm text-zinc-500">{item.desc}</div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
