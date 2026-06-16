"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { tasks, products, getToken, getRole } from "@/lib/api";

export default function NewTaskPage() {
  const router = useRouter();
  const token = getToken();
  const role = getRole();

  const [productList, setProductList] = useState<any[]>([]);
  const [form, setForm] = useState({
    product_id: "",
    product_name: "",
    task_type: "urgent",
    koc_required: 5,
    commission: 30,
    pledge_merchant: 0,
    pledge_koc: 0,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token || role !== "merchant") {
      router.push("/login");
      return;
    }
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

    const pledgeM = form.pledge_merchant > 0 ? form.pledge_merchant : form.commission * 2 * form.koc_required;
    const pledgeK = form.pledge_koc > 0 ? form.pledge_koc : form.commission;

    tasks
      .create(
        {
          product_id: form.product_id,
          product_name: form.product_name,
          task_type: form.task_type,
          koc_required: form.koc_required,
          commission: form.commission,
          pledge_merchant: pledgeM,
          pledge_koc: pledgeK,
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

  if (!token || role !== "merchant") return null;

  return (
    <div className="min-h-screen bg-purple-50/30">
      <div className="max-w-2xl mx-auto px-6 py-8">
        {/* Back */}
        <button
          onClick={() => router.back()}
          className="text-sm text-gray-400 hover:text-gray-600 mb-4 inline-block"
        >
          ← 返回
        </button>

        <div className="bg-white rounded-2xl border border-gray-100 p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">📢 发布新任务</h1>

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

            {/* Commission */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                每 KOC 佣金（点）
              </label>
              <input
                type="number"
                min={1}
                value={form.commission}
                onChange={(e) => setForm((f) => ({ ...f, commission: Math.max(1, Number(e.target.value)) }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:ring-2 focus:ring-pink-200 focus:border-pink-400 outline-none"
              />
              <p className="text-xs text-gray-400 mt-1">
                总佣金预算 = {form.commission} × {form.koc_required} = {form.commission * form.koc_required} 点
              </p>
            </div>

            {/* Pledges */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  商家质押（最低=总佣金 {form.commission * form.koc_required} 点，确保样品必发）
                </label>
                <input
                  type="number"
                  min={0}
                  value={form.pledge_merchant || ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, pledge_merchant: Number(e.target.value) || 0 }))
                  }
                  placeholder={`最低 ${form.commission * form.koc_required}`}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:ring-2 focus:ring-pink-200 focus:border-pink-400 outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  KOC 质押（最低={form.commission} 点）
                </label>
                <input
                  type="number"
                  min={form.commission}
                  value={form.pledge_koc || ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, pledge_koc: Number(e.target.value) || 0 }))
                  }
                  placeholder={`最低 ${form.commission}`}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:ring-2 focus:ring-pink-200 focus:border-pink-400 outline-none text-sm"
                />
              </div>
            </div>

            {/* Summary */}
            <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-600 space-y-1">
              <div className="font-semibold text-gray-800 mb-2">📊 费用预估</div>
              <div>KOC 总佣金预算：{form.commission * form.koc_required} 点</div>
              <div>
                平台服务费（固定）：5 点
              </div>
              <div className="pt-2 border-t border-gray-200 font-semibold text-gray-800">
                本次发布扣点：{form.commission * form.koc_required + 5} 点
              </div>
              <div className="text-xs text-gray-400">
                * 佣金由返佣链接自动结算，平台只收取发布服务费
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
