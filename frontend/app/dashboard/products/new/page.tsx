"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { products, getToken } from "@/lib/api";

export default function NewProduct() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", asin: "", category: "baby", commission_type: "discount_code", commission_value: "", description: "", image_url: "" });
  const [loading, setLoading] = useState(false);

  function update(field: string, value: string) { setForm((p) => ({ ...p, [field]: value })); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const token = getToken();
    if (!token) return;
    setLoading(true);
    await products.create(form, token);
    router.push("/dashboard/products");
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b px-6 py-3">
        <Link href="/dashboard/products" className="text-indigo-600 text-sm hover:underline">&larr; Products</Link>
      </nav>
      <div className="max-w-lg mx-auto p-6">
        <div className="bg-white rounded-xl border border-slate-100 p-6">
          <h1 className="text-xl font-bold text-slate-900 mb-6">Add New Product</h1>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Product Name *</label>
              <input required value={form.name} onChange={(e) => update("name", e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">ASIN</label>
                <input value={form.asin} onChange={(e) => update("asin", e.target.value)} placeholder="B0DKDSZBN4"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                <select value={form.category} onChange={(e) => update("category", e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900">
                  <option value="baby">Baby</option><option value="wedding">Wedding</option><option value="home">Home</option>
                  <option value="beauty">Beauty</option><option value="fashion">Fashion</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Commission Type</label>
                <select value={form.commission_type} onChange={(e) => update("commission_type", e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900">
                  <option value="discount_code">Discount Code</option>
                  <option value="affiliate">Affiliate Link</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Commission Value</label>
                <input value={form.commission_value} onChange={(e) => update("commission_value", e.target.value)} placeholder="15% off"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Image URL</label>
              <input value={form.image_url} onChange={(e) => update("image_url", e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
              <textarea rows={3} value={form.description} onChange={(e) => update("description", e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50">
              {loading ? "Adding..." : "Add Product"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
