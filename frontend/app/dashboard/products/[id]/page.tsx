"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { products, getToken, getRole, getConsolePath } from "@/lib/api";
import NavBar from "@/components/NavBar";

const REQUIRED_FIELDS = ["name", "product_id", "category"] as const;

const FIELD_LABELS: Record<string, string> = {
  name: "Product Name",
  product_id: "Product ID",
  category: "Category",
};

export default function EditProduct() {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;
  const token = getToken();
  const role = getRole();

  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [form, setForm] = useState({
    product_url: "",
    name: "",
    sales_platform: "amazon",
    product_id: "",
    category: "",
    target_market: "US",
    description: "",
    image_url: "",
    status: "active",
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [autoFilling, setAutoFilling] = useState(false);
  const [autoFillError, setAutoFillError] = useState("");
  const [autoFillWarnings, setAutoFillWarnings] = useState<string[]>([]);

  useEffect(() => {
    if (!token) { router.push("/login"); return; }
    if (role && role !== "merchant") { router.push(getConsolePath(role || "")); return; }
    setAuthorized(true);

    products.get(productId, token)
      .then((p) => {
        setForm({
          product_url: (p.product_url as string) || "",
          name: (p.name as string) || "",
          sales_platform: (p.sales_platform as string) || "amazon",
          product_id: (p.product_id as string) || "",
          category: (p.category as string) || "",
          target_market: (p.target_market as string) || "US",
          description: (p.description as string) || "",
          image_url: (p.image_url as string) || "",
          status: (p.status as string) || "active",
        });
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [productId, router, role, token]);

  function update(field: string, value: string) {
    setForm((p) => ({ ...p, [field]: value }));
    if (errors[field]) {
      setErrors((p) => { const n = { ...p }; delete n[field]; return n; });
    }
    if (saveError) setSaveError("");
    if (saveSuccess) setSaveSuccess(false);
  }

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    for (const field of REQUIRED_FIELDS) {
      const val = (form as any)[field];
      if (!val || (typeof val === "string" && !val.trim())) {
        newErrors[field] = `${FIELD_LABELS[field]} is required`;
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleAutoFill() {
    if (!form.product_url.trim()) return;
    setAutoFilling(true);
    setAutoFillError("");
    setAutoFillWarnings([]);
    try {
      const result = await products.autoFill(form.product_url.trim(), token!);
      const updates: Record<string, string> = {};
      if (result.name) updates.name = result.name as string;
      if (result.sales_platform) updates.sales_platform = result.sales_platform as string;
      if (result.target_market) updates.target_market = result.target_market as string;
      if (result.product_id) updates.product_id = result.product_id as string;
      if (result.category) updates.category = result.category as string;
      if (result.image_url) updates.image_url = result.image_url as string;
      if (result.description) updates.description = result.description as string;
      setForm((p) => ({ ...p, ...updates }));
      if (result.errors && (result.errors as string[]).length > 0) {
        setAutoFillWarnings(result.errors as string[]);
      }
    } catch (err: any) {
      setAutoFillError(err.message || "Auto-fill failed");
    } finally {
      setAutoFilling(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaveError("");
    setSaveSuccess(false);

    if (!validate()) return;

    setSaving(true);
    try {
      await products.update(productId, form, token!);
      setSaveSuccess(true);
      setTimeout(() => router.push("/dashboard/products"), 800);
    } catch (err: any) {
      setSaveError(err.message || "Failed to save changes");
      setSaving(false);
    }
  }

  const idLabels: Record<string, { label: string; placeholder: string }> = {
    amazon: { label: "ASIN", placeholder: "B0DKDSZBN4" },
    shopify: { label: "Product Handle / SKU", placeholder: "premium-face-serum" },
    walmart: { label: "Item ID", placeholder: "123456789" },
    ebay: { label: "Item ID", placeholder: "123456789012" },
    etsy: { label: "Listing ID / SKU", placeholder: "1234567890" },
    shopee: { label: "Product ID / SKU", placeholder: "123456789" },
    temu: { label: "Product ID / SKU", placeholder: "SKU-001" },
    aliexpress: { label: "Product ID / SKU", placeholder: "123456789" },
    independent: { label: "Product URL or SKU", placeholder: "https://yourstore.com/products/..." },
    other: { label: "Product URL or SKU", placeholder: "https://..." },
  };

  const inputClass = (field: string) =>
    `w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 ${
      errors[field] ? "border-red-400 bg-red-50" : "border-slate-200"
    }`;

  if (!authorized || loading) {
    return (
      <div className="min-h-screen bg-purple-50 flex items-center justify-center">
        <div className="text-slate-400 text-sm">Loading...</div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-purple-50">
        <NavBar user={null} role="merchant" title="Edit Product" />
        <div className="max-w-lg mx-auto px-6 py-16 text-center">
          <p className="text-slate-400 text-lg mb-4">Product not found</p>
          <button onClick={() => router.push("/dashboard/products")} className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition">
            ← Back to Products
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-purple-50">
      <NavBar user={null} role="merchant" title="Edit Product" />
      <div className="max-w-lg mx-auto p-6">
        <div className="bg-white rounded-xl border border-slate-100 p-6">
          <h1 className="text-xl font-bold text-slate-900 mb-6">Edit Product</h1>

          {saveError && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-4">
              {saveError}
            </div>
          )}

          {saveSuccess && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-lg p-3 mb-4">
              ✅ Changes saved! Redirecting...
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-4">
            {/* 0. Product URL — MOST IMPORTANT */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Product URL <span className="text-slate-400 font-normal">(paste Amazon/Shopify/etc. link)</span>
              </label>
              <div className="flex gap-2">
                <input
                  value={form.product_url}
                  onChange={(e) => update("product_url", e.target.value)}
                  placeholder="https://amazon.com/dp/B0DKDSZBN4 or https://yourstore.com/products/..."
                  className="flex-1 px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900"
                />
                <button
                  type="button"
                  onClick={handleAutoFill}
                  disabled={autoFilling || !form.product_url.trim()}
                  className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-200 disabled:opacity-50 transition whitespace-nowrap"
                >
                  {autoFilling ? "Filling..." : "✨ Auto-Fill"}
                </button>
              </div>
              {autoFillError && <p className="text-xs text-red-500 mt-1">{autoFillError}</p>}
              {autoFillWarnings.length > 0 && (
                <div className="mt-1 space-y-0.5">
                  {autoFillWarnings.map((w, i) => (
                    <p key={i} className="text-xs text-amber-600">⚠ {w}</p>
                  ))}
                </div>
              )}
            </div>

            {/* 1. Product Name — REQUIRED */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Product Name <span className="text-red-400">*</span>
              </label>
              <input
                value={form.name} onChange={(e) => update("name", e.target.value)}
                placeholder="e.g. Premium Face Serum"
                className={inputClass("name")} />
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
            </div>

            {/* 2. Sales Platform + Category */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Sales Platform</label>
                <select value={form.sales_platform} onChange={(e) => update("sales_platform", e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900">
                  <option value="amazon">🏪 Amazon</option>
                  <option value="shopify">🛒 Shopify</option>
                  <option value="walmart">🏬 Walmart</option>
                  <option value="ebay">📦 eBay</option>
                  <option value="etsy">🎨 Etsy</option>
                  <option value="shopee">🛍 Shopee</option>
                  <option value="temu">📱 Temu</option>
                  <option value="aliexpress">🌏 AliExpress</option>
                  <option value="independent">🏗 Independent Store</option>
                  <option value="other">📋 Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Category <span className="text-red-400">*</span>
                </label>
                <select value={form.category} onChange={(e) => update("category", e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 ${errors.category ? "border-red-400 bg-red-50" : "border-slate-200"}`}>
                  <option value="" disabled>-- Select Category --</option>
                  <option value="baby">Baby & Childcare</option>
                  <option value="beauty">Beauty & Personal Care</option>
                  <option value="fashion">Fashion & Apparel</option>
                  <option value="electronics">Electronics & Gadgets</option>
                  <option value="home">Home & Kitchen</option>
                  <option value="health">Health & Wellness</option>
                  <option value="sports">Sports & Outdoors</option>
                  <option value="toys">Toys & Games</option>
                  <option value="pets">Pet Supplies</option>
                  <option value="office">Office & Stationery</option>
                  <option value="auto">Automotive & Accessories</option>
                  <option value="jewelry">Jewelry & Watches</option>
                  <option value="garden">Garden & Outdoor</option>
                  <option value="tools">Tools & Home Improvement</option>
                  <option value="grocery">Grocery & Food</option>
                  <option value="furniture">Furniture & Decor</option>
                  <option value="luggage">Luggage & Travel</option>
                  <option value="party">Party & Events</option>
                  <option value="crafts">Arts, Crafts & Sewing</option>
                  <option value="musical">Musical Instruments</option>
                  <option value="books">Books & Media</option>
                  <option value="software">Software & Apps</option>
                  <option value="gaming">Video Games & Consoles</option>
                  <option value="appliances">Home Appliances</option>
                  <option value="lighting">Lighting & Lamps</option>
                  <option value="bedding">Bedding & Bath</option>
                  <option value="kitchen">Kitchen & Dining</option>
                  <option value="wedding">Wedding & Registry</option>
                  <option value="fitness">Fitness & Exercise</option>
                  <option value="baby_gear">Baby Gear & Strollers</option>
                  <option value="outdoor">Camping & Hiking</option>
                  <option value="smart_home">Smart Home & IoT</option>
                  <option value="wearable">Wearable Tech</option>
                </select>
                {errors.category && <p className="text-xs text-red-500 mt-1">{errors.category}</p>}
              </div>
            </div>

            {/* 3. Product ID (dynamic) + Target Market */}
            <div className="grid grid-cols-2 gap-3">
              {(() => {
                const cfg = idLabels[form.sales_platform] || idLabels.other;
                return (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      {cfg.label} <span className="text-red-400">*</span>
                    </label>
                    <input value={form.product_id} onChange={(e) => update("product_id", e.target.value)}
                      placeholder={cfg.placeholder}
                      className={inputClass("product_id")} />
                    {errors.product_id && <p className="text-xs text-red-500 mt-1">{errors.product_id}</p>}
                  </div>
                );
              })()}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Target Market</label>
                <select value={form.target_market} onChange={(e) => update("target_market", e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900">
                  <option value="US">US 🇺🇸</option><option value="UK">UK 🇬🇧</option><option value="CA">CA 🇨🇦</option>
                  <option value="AU">AU 🇦🇺</option><option value="EU">EU 🇪🇺</option><option value="JP">JP 🇯🇵</option>
                  <option value="KR">KR 🇰🇷</option><option value="SEA">SEA 🌏</option><option value="CN">CN 🇨🇳</option>
                </select>
              </div>
            </div>

            {/* 4. Image URL (optional) */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Image URL <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <input value={form.image_url} onChange={(e) => update("image_url", e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900" />
            </div>

            {/* 5. Description (optional) */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Description <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <textarea rows={3} value={form.description} onChange={(e) => update("description", e.target.value)}
                placeholder="Describe your product, key selling points, target audience..."
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900" />
            </div>

            {/* 6. Status */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
              <select value={form.status} onChange={(e) => update("status", e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900">
                <option value="active">🟢 Active</option>
                <option value="paused">⏸ Paused</option>
                <option value="archived">📦 Archived</option>
              </select>
            </div>

            {/* 7. Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => router.push("/dashboard/products")}
                className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-lg font-semibold hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button type="submit" disabled={saving}
                className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 transition">
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
