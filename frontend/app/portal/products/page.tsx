"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { products, interests, getToken } from "@/lib/api";

export default function BrowseProducts() {
  const [items, setItems] = useState<Array<Record<string, unknown>>>([]);
  const [myInterests, setMyInterests] = useState<Set<string>>(new Set());

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    products.list(token).then(setItems).catch(() => {});
    interests.list(token).then((list) => setMyInterests(new Set((list as Array<Record<string, unknown>>).map((i) => i.to_id as string)))).catch(() => {});
  }, []);

  async function express(productId: string) {
    const token = getToken();
    if (!token) return;
    await interests.express(productId, "product", token);
    setMyInterests((prev) => new Set([...prev, productId]));
  }

  return (
    <div className="min-h-screen bg-orange-50">
      <nav className="bg-white border-b border-zinc-100 h-14 flex items-center px-6 shadow-sm gap-4">
        <Link href="/portal" className="text-pink-500 text-sm font-semibold hover:underline">&larr; Dashboard</Link>
        <h1 className="font-extrabold text-zinc-900">Browse Products</h1>
      </nav>
      <div className="max-w-3xl mx-auto px-6 py-8">
        {items.length === 0 ? (
          <div className="text-center py-16 text-zinc-400 text-sm">No products yet.</div>
        ) : (
          <div className="space-y-3">
            {items.map((p) => (
              <div key={p.id as string} className="bg-white rounded-2xl border border-rose-100 shadow-sm p-5 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-zinc-900">{p.name as string}</h3>
                  <p className="text-xs text-zinc-400">{p.category as string} &middot; {p.commission_value as string || "15% off"}</p>
                </div>
                {myInterests.has(p.id as string) ? (
                  <span className="px-4 py-2 bg-emerald-50 text-emerald-700 rounded-full text-sm font-bold">✓ Interested</span>
                ) : (
                  <button onClick={() => express(p.id as string)} className="btn-brand px-5 py-2 text-sm">Interested</button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
