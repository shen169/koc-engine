"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { products, getToken, getRole, getConsolePath } from "@/lib/api";
import NavBar from "@/components/NavBar";

const REQUIRED_FIELDS = ["name", "product_id", "category", "commission_value", "commission_link"] as const;

const FIELD_LABELS: Record<string, string> = {
  name: "Product Name",
  product_id: "Product ID",
  category: "Category",
  commission_value: "Commission Value",
  commission_link: "Product URL",
};

export default function NewProduct() {
  const router = useRouter();
  const token = getToken();
  const role = getRole();
  if (!token) { router.push("/login"); return null; }
  if (role && role !== "merchant") { router.push(getConsolePath(role || "")); return null; }

  const [form, setForm] = useState({
    name: "",
    sales_platform: "amazon",
    product_id: "",
    category: "",
    target_market: "US",
    commission_type: "discount_code",
    commission_value: "",
    commission_link: "",
    description: "",
    image_url: "",
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState("");

  function update(field: string, value: string) {
    setForm((p) => ({ ...p, [field]: value }));
    if (errors[field]) {
      setErrors((p) => { const n = { ...p }; delete n[field]; return n; });
    }
    if (submitError) setSubmitError("");
  }

  function validate(): boolean {
    const newErrors: Record<string, string> = {};

    for (const field of REQUIRED_FIELDS) {
      const val = (form as any)[field];
      if (!val || (typeof val === "string" && !val.trim())) {
        newErrors[field] = `${FIELD_LABELS[field]} is required`;
      }
    }

    // URL format validation
    if (form.commission_link.trim()) {
      try {
        new URL(form.commission_link.trim());
      } catch {
        newErrors.commission_link = "Please enter a valid URL";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError("");

    if (!validate()) return;

    setLoading(true);
    try {
      await products.create(form, token!);
      router.push("/dashboard/products");
    } catch (err: any) {
      setSubmitError(err.message || "Failed to create product");
      setLoading(false);
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

  return (
    <div className="min-h-screen bg-purple-50">
      <NavBar user={null} role="merchant" title="Add New Product" />
      <div className="max-w-lg mx-auto p-6">
        <div className="bg-white rounded-xl border border-slate-100 p-6">
          <h1 className="text-xl font-bold text-slate-900 mb-6">Add New Product</h1>

          {submitError && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-4">
              {submitError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
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

            {/* 4. Commission Type + Commission Value */}
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
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Commission Value <span className="text-red-400">*</span>
                </label>
                <input value={form.commission_value} onChange={(e) => update("commission_value", e.target.value)}
                  placeholder="15% off, 10% commission, $5/code"
                  className={inputClass("commission_value")} />
                {errors.commission_value && <p className="text-xs text-red-500 mt-1">{errors.commission_value}</p>}
              </div>
            </div>

            {/* 5. Product URL — REQUIRED */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                🔗 Product URL <span className="text-red-400">*</span>
                <span className="text-slate-400 font-normal"> (link to the product page — KOC will use their own affiliate ID to track commissions)</span>
              </label>
              <input value={form.commission_link} onChange={(e) => update("commission_link", e.target.value)}
                placeholder="https://amazon.com/dp/B0DKDSZBN4"
                className={inputClass("commission_link")} />
              {errors.commission_link && <p className="text-xs text-red-500 mt-1">{errors.commission_link}</p>}
            </div>

            {/* 6. Image URL (optional) */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Image URL <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <input value={form.image_url} onChange={(e) => update("image_url", e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900" />
            </div>

            {/* 7. Description (optional) */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Description <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <textarea rows={3} value={form.description} onChange={(e) => update("description", e.target.value)}
                placeholder="Describe your product, key selling points, target audience..."
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900" />
            </div>

            {/* 8. Submit */}
            <button type="submit" disabled={loading}
              className="w-full py-2.5 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 transition">
              {loading ? "Adding..." : "Add Product"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
