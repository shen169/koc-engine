"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getToken, getRole, getConsolePath } from "@/lib/api";
import NavBar from "@/components/NavBar";

export default function CouponsPage() {
  const router = useRouter();

  // Role guard — redirect non-KOC users
  const token = getToken();
  const role = getRole();
  const unauthorized = !token || (role && role !== "koc");

  const [coupons, setCoupons] = useState<Array<Record<string, unknown>>>([]);

  useEffect(() => {
    if (!token) { router.push("/login"); return; }
    if (role && role !== "koc") { router.push(getConsolePath(role || "")); return; }
    fetch("http://localhost:8001/api/coupons", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json()).then(setCoupons).catch(() => {});
  }, [router, role, token]);

  if (unauthorized) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      <NavBar user={null} role="koc" title="Discount Codes" />
      <div className="max-w-2xl mx-auto p-6">
        <h1 className="text-xl font-bold text-slate-900 mb-6">My Discount Codes</h1>
        {coupons.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-100 p-8 text-center">
            <p className="text-slate-400">No discount codes yet.</p>
            <p className="text-sm text-slate-400 mt-1">Codes are assigned when a brand matches with you.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {coupons.map((c) => (
              <div key={c.id as string} className="bg-white rounded-xl border border-slate-100 p-5">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-2xl font-bold text-indigo-600 font-mono">{c.code as string}</span>
                  <span className="text-sm text-slate-500">{c.discount_percent as number}% off</span>
                </div>
                <div className="flex gap-6 text-sm text-slate-500">
                  <span>Used: <strong>{c.usage_count as number}</strong> times</span>
                  <span>Revenue: <strong>${(c.total_revenue as number)?.toFixed(2)}</strong></span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
