"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { products, getToken } from "@/lib/api";

export default function MyProducts() {
  const [items, setItems] = useState<Array<Record<string, unknown>>>([]);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    products.list(token).then(setItems).catch(() => {});
  }, []);

  async function toggleStatus(productId: string, currentStatus: string) {
    const token = getToken();
    if (!token) return;
    const newStatus = currentStatus === "active" ? "paused" : "active";
    await fetch(`http://localhost:8001/api/products/${productId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status: newStatus }),
    });
    products.list(token).then(setItems).catch(() => {});
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b px-6 py-3 flex justify-between items-center">
        <div className="flex gap-4 items-center">
          <Link href="/dashboard" className="text-indigo-600 text-sm hover:underline">&larr; Dashboard</Link>
          <h1 className="font-bold text-slate-900">My Products</h1>
        </div>
        <Link href="/dashboard/products/new" className="px-3 py-1.5 bg-indigo-600 text-white rounded text-sm">+ New Product</Link>
      </nav>
      <div className="max-w-4xl mx-auto p-6">
        {items.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-100 p-8 text-center">
            <p className="text-slate-400 mb-3">No products listed yet.</p>
            <Link href="/dashboard/products/new" className="text-indigo-600 text-sm hover:underline">Add your first product</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((p) => (
              <div key={p.id as string} className="bg-white rounded-xl border border-slate-100 p-4 flex justify-between items-center">
                <div>
                  <h3 className="font-semibold text-slate-900">{p.name as string}</h3>
                  <p className="text-xs text-slate-400">{p.category as string} · {p.commission_value as string} · ASIN: {p.asin as string}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${p.status === "active" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                    {p.status as string}
                  </span>
                  <button onClick={() => toggleStatus(p.id as string, p.status as string)}
                    className="text-xs text-slate-500 hover:text-indigo-600 underline">
                    {p.status === "active" ? "Pause" : "Activate"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
