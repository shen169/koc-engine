"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getToken } from "@/lib/api";

export default function AdminProducts() {
  const [list, setList] = useState<Array<Record<string, unknown>>>([]);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    fetch("http://localhost:8001/api/products", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json()).then(setList).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-zinc-50">
      <nav className="bg-white border-b border-zinc-100 h-14 flex items-center px-6 shadow-sm gap-4">
        <Link href="/admin" className="text-pink-500 text-sm font-semibold hover:underline">&larr; Admin</Link>
        <h1 className="font-extrabold text-zinc-900">Products ({list.length})</h1>
      </nav>
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="space-y-2">
          {list.map((p) => (
            <div key={p.id as string} className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-zinc-900">{p.name as string}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${p.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-zinc-50 text-zinc-500"}`}>{p.status as string}</span>
                </div>
                <p className="text-xs text-zinc-400">ASIN: {p.asin as string || "—"} &middot; {p.category as string} &middot; {p.commission_value as string}</p>
              </div>
              <span className="text-xs text-zinc-400">Merchant: {(p.merchant_id as string)?.slice(0, 8)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
