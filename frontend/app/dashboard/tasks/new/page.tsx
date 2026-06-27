"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { tasks, products, getToken, getRole, getConsolePath } from "@/lib/api";
import NavBar from "@/components/NavBar";

export default function NewTaskPage() {
  const router = useRouter();
  const token = getToken();
  const role = getRole();
  if (!token) { router.push("/login"); return null; }
  if (role && role !== "merchant") { router.push(getConsolePath(role || "")); return null; }

  const [productList, setProductList] = useState<any[]>([]);
  const [form, setForm] = useState({
    product_id: "",
    product_name: "",
    task_type: "urgent",
    koc_required: 5,
    task_mode: "commission" as "commission" | "sample",
    commission: 30,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [slaAgreed, setSlaAgreed] = useState(false);

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    try {
      const data = await products.list(token!);
      setProductList(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Failed to load products:", e);
    }
  }

  function handleProductSelect(productId: string) {
    const p = productList.find((p: any) => p.id === productId);
    setForm((f) => ({
      ...f,
      product_id: productId,
      product_name: p?.name || "",
    }));
  }

  function handleSubmit() {
    if (!form.product_id) {
      setError("Select Product");
      return;
    }
    if (form.koc_required < 1) {
      setError("At least 1 KOC required");
      return;
    }
    if (form.task_mode === "commission" && (form.commission < 20 || form.commission > 50)) {
      setError("Commission must be between 20-50pt");
      return;
    }

    setSubmitting(true);
    setError("");

    tasks
      .create(
        {
          product_id: form.product_id,
          product_name: form.product_name,
          task_type: form.task_type,
          koc_required: form.koc_required,
          task_mode: form.task_mode,
          commission: form.task_mode === "sample" ? 0 : form.commission,
        },
        token!
      )
      .then(() => {
        router.push("/dashboard/tasks");
      })
      .catch((e: Error) => {
        setError(e.message || "Publish failed");
        setSubmitting(false);
      });
  }

  return (
    <div className="min-h-screen bg-purple-50/30">
      <NavBar user={null} role="merchant" title="Publish New Task" />
      <div className="max-w-2xl mx-auto px-6 py-8">

        <div className="bg-white rounded-2xl border border-gray-100 p-8">
          <h1 className="text-xl font-bold text-gray-900 mb-6">📢 Publish New Task</h1>

          {error && (
            <div className="mb-6 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="space-y-5">
            {/* Product selection */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Select Product</label>
              {productList.length === 0 ? (
                <p className="text-sm text-gray-400">
                  No products listed yet?{" "}
                  <a href="/dashboard/products/new" className="text-pink-500">
                    Add a product first →
                  </a>
                </p>
              ) : (
                <select
                  value={form.product_id}
                  onChange={(e) => handleProductSelect(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:ring-2 focus:ring-pink-200 focus:border-pink-400 outline-none"
                >
                  <option value="">-- Select Product --</option>
                  {productList.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Task type */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Task Type</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setForm((f) => ({ ...f, task_type: "urgent" }))}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    form.task_type === "urgent"
                      ? "border-orange-400 bg-orange-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="font-semibold text-gray-900">⚡ Urgent</div>
                  <div className="text-xs text-gray-500 mt-1">Auto-push matching, 12h acceptance deadline</div>
                </button>
                <button
                  onClick={() => setForm((f) => ({ ...f, task_type: "long_term" }))}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    form.task_type === "long_term"
                      ? "border-blue-400 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="font-semibold text-gray-900">🌊 Long-term</div>
                  <div className="text-xs text-gray-500 mt-1">Listed in product pool, KOCs discover and accept independently</div>
                </button>
              </div>
            </div>

            {/* KOC count */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Number of KOCs Needed
              </label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setForm((f) => ({ ...f, koc_required: Math.max(1, f.koc_required - 1) }))}
                  className="w-10 h-10 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50"
                >
                  -
                </button>
                <span className="text-2xl font-bold text-gray-900 w-12 text-center">
                  {form.koc_required}
                </span>
                <button
                  onClick={() => setForm((f) => ({ ...f, koc_required: Math.min(50, f.koc_required + 1) }))}
                  className="w-10 h-10 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50"
                >
                  +
                </button>
                <span className="text-sm text-gray-400">KOCs</span>
              </div>
            </div>

            {/* Task Mode Toggle */}
            <div className="bg-gray-50 rounded-2xl p-4">
              <label className="block text-sm font-semibold text-gray-700 mb-3">📦 Collaboration Mode</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setForm((f) => ({ ...f, task_mode: "commission" }))}
                  className={`rounded-xl p-3 text-sm font-semibold transition-all ${
                    form.task_mode === "commission"
                      ? "bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-md"
                      : "bg-white border border-gray-200 text-gray-600 hover:border-pink-300"
                  }`}
                >
                  💰 Commission
                  <span className="block text-[10px] opacity-70 mt-0.5">KOC earns cash (20-50pt)</span>
                </button>
                <button
                  onClick={() => setForm((f) => ({ ...f, task_mode: "sample" }))}
                  className={`rounded-xl p-3 text-sm font-semibold transition-all ${
                    form.task_mode === "sample"
                      ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md"
                      : "bg-white border border-gray-200 text-gray-600 hover:border-emerald-300"
                  }`}
                >
                  📦 Sample Only
                  <span className="block text-[10px] opacity-70 mt-0.5">KOC keeps free product</span>
                </button>
              </div>
            </div>

            {/* Commission input (only for commission mode) */}
            {form.task_mode === "commission" ? (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  💰 Commission per KOC (pt, paid in platform points on completion)
                </label>
                <input
                  type="number"
                  min={20}
                  max={50}
                  value={form.commission}
                  onChange={(e) => setForm((f) => ({ ...f, commission: Math.min(50, Math.max(20, Number(e.target.value))) }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:ring-2 focus:ring-pink-200 focus:border-pink-400 outline-none"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Commission range: 20-50pt. KOC receives 90% (withdrawable), platform takes 10% (min 1pt).
                </p>
              </div>
            ) : (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">📦</span>
                  <div>
                    <p className="font-semibold text-emerald-800 text-sm">Sample-Only Mode</p>
                    <p className="text-xs text-emerald-600 mt-0.5">
                      KOC receives your product for free and creates content in exchange.
                      No cash commission — you only pay the 5pt platform fee + shipping.
                    </p>
                    <ul className="text-xs text-emerald-600 mt-2 space-y-0.5">
                      <li>• Your cost: <strong>5pt ($5) + product & shipping</strong></li>
                      <li>• KOC pledge: <strong>5pt</strong> (returned on completion)</li>
                      <li>• KOC gets: <strong>free product</strong> (no cash payment)</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Cost summary */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-purple-50 border border-purple-100 rounded-xl p-4">
                <div className="text-xs text-purple-500 font-semibold mb-1">
                  {form.task_mode === "sample" ? "Platform Fee (non-refundable)" : "Commission Pool (non-refundable)"}
                </div>
                <div className="text-2xl font-extrabold text-purple-700">
                  {form.task_mode === "sample"
                    ? `5 pt`
                    : `${form.commission} × ${form.koc_required} = ${form.commission * form.koc_required} pt`}
                </div>
              </div>
              <div className="bg-pink-50 border border-pink-100 rounded-xl p-4">
                <div className="text-xs text-pink-500 font-semibold mb-1">KOC Pledge per person</div>
                <div className="text-2xl font-extrabold text-pink-700">
                  {form.task_mode === "sample" ? "5 pt" : "10 pt"}
                  <span className="text-xs font-normal text-pink-400 ml-1">returned on completion</span>
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-600 space-y-1">
              <div className="font-semibold text-gray-800 mb-2">📊 Cost Estimate (All Deducted on Publish, Non-Refundable)</div>
              <div>
                Platform Service Fee: 5 pt <span className="text-xs text-gray-400">(non-refundable)</span>
              </div>
              {form.task_mode === "sample" ? (
                <>
                  <div>
                    Commission Pool: 0 pt <span className="text-xs text-emerald-500">(sample mode — no cash payment)</span>
                  </div>
                  <div className="text-sm font-bold text-emerald-700 mt-2 pt-2 border-t border-gray-200">
                    Total deducted on publish: 5 pt
                  </div>
                  <div className="text-xs text-emerald-600 mt-2">
                    💡 KOC keeps the free product. You only pay 5pt + shipping cost.
                  </div>
                </>
              ) : (
                <>
                  <div>
                    Commission Pool: {form.commission} × {form.koc_required} = {form.commission * form.koc_required} pt <span className="text-xs text-gray-400">(non-refundable, paid to KOCs on completion)</span>
                  </div>
                  <div className="text-sm font-bold text-purple-700 mt-2 pt-2 border-t border-gray-200">
                    Total deducted on publish: {5 + form.commission * form.koc_required} pt
                  </div>
                  <div className="text-xs text-gray-400 mt-2">
                    * KOC pledge of 10pt frozen on acceptance, fully returned on completion. Platform takes 10% of commission (min 1pt).
                  </div>
                </>
              )}
            </div>

            {/* SLA Agreement */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <h3 className="text-sm font-bold text-amber-800 mb-3">📋 Pre-Publish Confirmation</h3>
              <p className="text-xs text-amber-700 mb-3">As a merchant, you commit to:</p>
              <div className="space-y-2">
                {[
                  { text: "Ship within 48 hours", sub: "Late: deduct 20 Trust Score + return KOC pledge" },
                  { text: "Review KOC submissions within 3 days", sub: "Late: auto-approved by system" },
                  { text: `Total deduction now: 5pt fee + ${form.commission * form.koc_required}pt commission pool = ${5 + form.commission * form.koc_required}pt`, sub: "All non-refundable; commission paid to KOCs on completion. 1 revision + AI final judgment." },
                ].map((item, i) => (
                  <label key={i} className="flex items-start gap-2 text-sm text-amber-700 cursor-pointer">
                    <span className="mt-0.5 shrink-0">☐</span>
                    <span>
                      <strong>{item.text}</strong>
                      <span className="text-xs text-amber-500 block">{item.sub}</span>
                    </span>
                  </label>
                ))}
              </div>
              <label className="flex items-start gap-3 mt-4 p-3 bg-white rounded-xl border border-amber-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={slaAgreed}
                  onChange={(e) => setSlaAgreed(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded accent-pink-500"
                />
                <span className="text-sm text-amber-800 font-medium">
                  I have read and agreed to the rules above and acknowledge violations will result in Trust Score deduction and pledge loss.
                </span>
              </label>
            </div>

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={submitting || !slaAgreed}
              className="w-full btn-brand text-white py-3.5 rounded-xl font-semibold text-lg disabled:opacity-50"
            >
              {submitting ? "Publishing..." : "🚀 Publish Task"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
