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
    commission: 30,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

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
      setError("请选择产品");
      return;
    }
    if (form.koc_required < 1) {
      setError("至少需要 1 个 KOC");
      return;
    }
    if (form.commission < 1) {
      setError("佣金不能为 0");
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
          commission: form.commission,
        },
        token!
      )
      .then(() => {
        router.push("/dashboard/tasks");
      })
      .catch((e: Error) => {
        setError(e.message || "发布失败");
        setSubmitting(false);
      });
  }

  return (
    <div className="min-h-screen bg-purple-50/30">
      <NavBar user={null} role="merchant" title="发布新任务" />
      <div className="max-w-2xl mx-auto px-6 py-8">

        <div className="bg-white rounded-2xl border border-gray-100 p-8">
          <h1 className="text-xl font-bold text-gray-900 mb-6">📢 发布新任务</h1>

          {error && (
            <div className="mb-6 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="space-y-5">
            {/* Product selection */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">选择产品</label>
              {productList.length === 0 ? (
                <p className="text-sm text-gray-400">
                  还没有上架产品？{" "}
                  <a href="/dashboard/products/new" className="text-pink-500">
                    先去上架 →
                  </a>
                </p>
              ) : (
                <select
                  value={form.product_id}
                  onChange={(e) => handleProductSelect(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:ring-2 focus:ring-pink-200 focus:border-pink-400 outline-none"
                >
                  <option value="">-- 选择产品 --</option>
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
              <label className="block text-sm font-semibold text-gray-700 mb-2">任务类型</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setForm((f) => ({ ...f, task_type: "urgent" }))}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    form.task_type === "urgent"
                      ? "border-orange-400 bg-orange-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="font-semibold text-gray-900">⚡ 加急</div>
                  <div className="text-xs text-gray-500 mt-1">平台自动推送匹配，12h 接单时限</div>
                </button>
                <button
                  onClick={() => setForm((f) => ({ ...f, task_type: "long_term" }))}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    form.task_type === "long_term"
                      ? "border-blue-400 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="font-semibold text-gray-900">🌊 长线</div>
                  <div className="text-xs text-gray-500 mt-1">挂在产品池，KOC 自行发现接单</div>
                </button>
              </div>
            </div>

            {/* KOC count */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                需要 KOC 人数
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
                <span className="text-sm text-gray-400">人</span>
              </div>
            </div>

            {/* Commission (reference for affiliate link, NOT paid in points) */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                💰 返佣参考值（$/KOC，用于质押计算，实际佣金走返佣链接）
              </label>
              <input
                type="number"
                min={1}
                value={form.commission}
                onChange={(e) => setForm((f) => ({ ...f, commission: Math.max(1, Number(e.target.value)) }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:ring-2 focus:ring-pink-200 focus:border-pink-400 outline-none"
              />
              <p className="text-xs text-gray-400 mt-1">
                KOC 通过返佣链接推广，成交佣金由联盟平台自动结算。此处仅作质押计算参考。
              </p>
            </div>

            {/* Pledges — fixed at 10 pts/slot */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-purple-50 border border-purple-100 rounded-xl p-4">
                <div className="text-xs text-purple-500 font-semibold mb-1">商家质押（履约后退还）</div>
                <div className="text-2xl font-extrabold text-purple-700">10 × {form.koc_required} = {10 * form.koc_required} 点</div>
              </div>
              <div className="bg-pink-50 border border-pink-100 rounded-xl p-4">
                <div className="text-xs text-pink-500 font-semibold mb-1">KOC 质押/人（履约后退还）</div>
                <div className="text-2xl font-extrabold text-pink-700">10 点</div>
              </div>
            </div>

            {/* Summary */}
            <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-600 space-y-1">
              <div className="font-semibold text-gray-800 mb-2">📊 费用预估</div>
              <div>
                平台服务费（商家）：5 点 <span className="text-xs text-gray-400">（发布即扣，不退）</span>
              </div>
              <div>
                商家质押：10 × {form.koc_required} = {10 * form.koc_required} 点 <span className="text-xs text-gray-400">（发货时扣，KOC 完成后退还）</span>
              </div>
              <div className="text-xs text-gray-400 mt-2">
                * KOC 接单冻结 10 点质押，完成后退还 5 点（平台扣 5 点）
              </div>
            </div>

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full btn-brand text-white py-3.5 rounded-xl font-semibold text-lg disabled:opacity-50"
            >
              {submitting ? "发布中..." : "🚀 发布任务"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
