"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getToken } from "@/lib/api";

export default function AdminMerchants() {
  const [list, setList] = useState<Array<Record<string, unknown>>>([]);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    fetch("http://localhost:8001/api/merchants", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json()).then(setList).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-zinc-50">
      <nav className="bg-white border-b border-zinc-100 h-14 flex items-center px-6 shadow-sm gap-4">
        <Link href="/admin" className="text-pink-500 text-sm font-semibold hover:underline">&larr; Admin</Link>
        <h1 className="font-extrabold text-zinc-900">Merchants ({list.length})</h1>
      </nav>
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="space-y-3">
          {list.map((m) => (
            <div key={m.id as string} className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-5">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-zinc-900">{m.company_name as string || "Unnamed"}</h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    {(m.product_categories as string[])?.join(", ") || "No categories"} &middot; {(m.website as string) || "No website"}
                  </p>
                  <p className="text-xs text-zinc-400">
                    ⭐ {(m.avg_rating as number)?.toFixed(1)} &middot; {m.total_collaborations as number} collaborations
                    {m.is_blacklisted ? <span className="ml-2 px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 text-xs font-bold">Blacklisted</span> : null}
                  </p>
                </div>
                <span className="text-xs text-zinc-400">{m.id as string}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
