"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { products, getToken, getRole, getConsolePath } from "@/lib/api";
import NavBar from "@/components/NavBar";

export default function MyProducts() {
  const router = useRouter();
  const token = getToken();
  const role = getRole();
  if (!token) { router.push("/login"); return null; }
  if (role && role !== "merchant") { router.push(getConsolePath(role || "")); return null; }

  const [items, setItems] = useState<Array<Record<string, unknown>>>([]);

  useEffect(() => {
    products.list(token!).then(setItems).catch(() => {});
  }, []);

  async function toggleStatus(productId: string, currentStatus: string) {
    const newStatus = currentStatus === "active" ? "paused" : "active";
    await fetch(`http://localhost:8001/api/products/${productId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status: newStatus }),
    });
    products.list(token!).then(setItems).catch(() => {});
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <NavBar user={null} role="merchant" title="我的产品" />
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex justify-end mb-4">
          <Link href="/dashboard/products/new" className="px-3 py-1.5 bg-indigo-600 text-white rounded text-sm">+ New Product</Link>
        </div>
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
