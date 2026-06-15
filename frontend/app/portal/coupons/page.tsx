"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getToken } from "@/lib/api";

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Array<Record<string, unknown>>>([]);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    fetch("http://localhost:8001/api/coupons", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json()).then(setCoupons).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b px-6 py-3">
        <Link href="/portal" className="text-indigo-600 text-sm hover:underline">&larr; Dashboard</Link>
      </nav>
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
