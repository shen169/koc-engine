"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { tasks, auth, interests, getToken, getRole, getConsolePath } from "@/lib/api";
import IntegrityBadge from "@/components/IntegrityBadge";
import NavBar from "@/components/NavBar";

export default function KocTaskDetailPage() {
  const router = useRouter();
  const params = useParams();
  const taskId = params.id as string;

  const [authorized, setAuthorized] = useState(false);
  const [task, setTask] = useState<any>(null);
  const [mySlot, setMySlot] = useState<any>(null);
  const [mySlotIndex, setMySlotIndex] = useState<number>(-1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [contentUrls, setContentUrls] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [expressingInterest, setExpressingInterest] = useState(false);
  const [interestSent, setInterestSent] = useState(false);
  const [merchantTrust, setMerchantTrust] = useState<any>(null);

  useEffect(() => {
    const t = getToken();
    const r = getRole();
    if (!t) { router.push("/login"); return; }
    if (r && r !== "koc") { router.push(getConsolePath(r || "")); return; }
    setAuthorized(true);
    loadTask();
  }, [taskId]);

  async function loadTask() {
    const tkn = getToken()!;
    setLoading(true);
    try {
      const t = await tasks.get(taskId, tkn);
      setTask(t);

      // Find my slot
      const myData = await tasks.mine(getToken()!);
      const found = (myData as any[]).find((item: any) => {
        const tid = item.task?.id || item.task?.task_id || "";
        return tid === taskId;
      });

      if (found) {
        setMySlot(found.my_slot || {});
        setMySlotIndex(found.my_slot_index ?? -1);
      } else {
        // KOC hasn't accepted yet — find slot assigned to THIS KOC
        const myProfile = await auth.me(getToken()!);
        const myKocId = (myProfile as any).profile_id || "";
        const slots = t.koc_slots || [];
        const myAssignedSlot = slots.find(
          (s: any) => s.status === "assigned" && s.koc_id === myKocId
        );
        if (myAssignedSlot) {
          setMySlot(myAssignedSlot);
          setMySlotIndex(slots.indexOf(myAssignedSlot));
        }
      }

      // Load merchant trust
      if (t.merchant_id) {
        try {
          const { merchants } = await import("@/lib/api");
          const trust = await merchants.getTrust(t.merchant_id, getToken()!);
          setMerchantTrust(trust);
        } catch {}
      }
    } catch (e) {
      console.error("Failed to load task:", e);
    } finally {
      setLoading(false);
    }
  }

  async function handleAccept() {
    setAccepting(true);
    setError("");
    try {
      await tasks.accept(taskId, mySlotIndex, getToken()!);
      await loadTask();
    } catch (e: any) {
      setError(e.message || "接单失败");
    } finally {
      setAccepting(false);
    }
  }

  async function handleReject() {
    if (!confirm("拒绝该任务将扣除 3 点信任分。确定拒绝吗？")) return;
    setRejecting(true);
    setError("");
    try {
      await tasks.reject(taskId, mySlotIndex, getToken()!);
      // 拒绝后返回任务广场
      router.push("/portal/hall");
    } catch (e: any) {
      setError(e.message || "拒绝失败");
      setRejecting(false);
    }
  }

  async function handleReceive() {
    try {
      await tasks.receive(taskId, mySlotIndex, getToken()!);
      await loadTask();
    } catch (e: any) {
      setError(e.message || "确认收货失败");
    }
  }

  async function handleSubmit() {
    const urls = contentUrls
      .split("\n")
      .map((u: string) => u.trim())
      .filter(Boolean);
    if (urls.length === 0) {
      setError("请至少输入一个内容链接");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await tasks.submit(taskId, mySlotIndex, urls, getToken()!);
      await loadTask();
      setContentUrls("");
    } catch (e: any) {
      setError(e.message || "提交失败");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleClaim() {
    setAccepting(true);
    setError("");
    try {
      await tasks.accept(taskId, firstEmptySlotIndex, getToken()!);
      await loadTask();
    } catch (e: any) {
      setError(e.message || "接单失败");
    } finally {
      setAccepting(false);
    }
  }

  async function handleExpressInterest() {
    setExpressingInterest(true);
    setError("");
    try {
      await interests.express(task.product_id, "product", getToken()!);
      setInterestSent(true);
    } catch (e: any) {
      setError(e.message || "表达意向失败");
    } finally {
      setExpressingInterest(false);
    }
  }

  if (!authorized || loading) return <div className="min-h-screen bg-orange-50/30 flex items-center justify-center text-gray-400">加载中...</div>;
  if (!task) return <div className="min-h-screen bg-orange-50/30 flex items-center justify-center text-gray-400">任务不存在</div>;

  const slotStatus = mySlot?.status || "unknown";
  const isAssignedToMe = slotStatus === "assigned";
  const isAcceptedByMe = slotStatus === "accepted" || slotStatus === "shipped" || slotStatus === "received" || slotStatus === "creating";
  const canReceive = slotStatus === "shipped";
  const canSubmit = slotStatus === "received" || slotStatus === "creating";
  const isCompleted = slotStatus === "submitted" || slotStatus === "completed";

  // 查找第一个可用空位（KOC 可接单）
  const allSlots = (task.koc_slots || []) as any[];
  const firstEmptySlotIndex = allSlots.findIndex((s: any) => !s.koc_id);
  const canClaim = !isAssignedToMe && !isAcceptedByMe && firstEmptySlotIndex >= 0;

  return (
    <div className="min-h-screen bg-orange-50/30">
      <NavBar user={null} role="koc" title="任务详情" />
      <div className="max-w-2xl mx-auto px-6 py-8">
        <button onClick={() => router.back()} className="text-sm text-gray-400 hover:text-gray-600 mb-4 inline-block">
          ← 返回
        </button>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Task info */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              task.task_type === "urgent" ? "bg-orange-100 text-orange-600" : "bg-blue-100 text-blue-600"
            }`}>
              {task.task_type === "urgent" ? "⚡ 加急" : "🌊 长线"}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{task.product_name}</h1>

          {/* Product badges */}
          <div className="flex flex-wrap gap-2 mb-4">
            {task.product_category && (
              <span className="text-xs px-2.5 py-1 rounded-lg bg-purple-50 text-purple-600 font-medium">
                📂 {task.product_category}
              </span>
            )}
            {task.product_target_market && (
              <span className="text-xs px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-semibold border border-emerald-100">
                🌍 {task.product_target_market}
              </span>
            )}
            {task.merchant_company && (
              <span className="text-xs px-2.5 py-1 rounded-lg bg-blue-50 text-blue-600 font-medium">
                🏢 {task.merchant_company}
              </span>
            )}
          </div>

          {/* Product description */}
          {task.product_description && (
            <p className="text-sm text-gray-500 mb-4 leading-relaxed">
              {(task.product_description as string).slice(0, 200)}
            </p>
          )}

          {/* Commission link — always visible */}
          {task.commission_link && (
            <a
              href={task.commission_link as string}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 mb-4 text-sm text-emerald-600 hover:text-emerald-700 font-medium underline underline-offset-2"
            >
              💰 返佣链接：{(task.commission_link as string).slice(0, 50)}... ↗
            </a>
          )}

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="text-gray-400 text-xs">返佣佣金</div>
              <div className="font-bold text-gray-900">${task.commission || 0}</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="text-gray-400 text-xs">质押（完成退 5 点）</div>
              <div className="font-bold text-gray-900">10 点</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="text-gray-400 text-xs">接单时限</div>
              <div className="font-bold text-gray-900">{task.task_type === "urgent" ? "12 小时" : "7 天"}</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="text-gray-400 text-xs">创作时限</div>
              <div className="font-bold text-gray-900">14 天</div>
            </div>
          </div>

          {/* Fake link report */}
          {(task.commission_link) && (
            <div className="flex items-center justify-end mt-2">
              <button
                onClick={async (e) => {
                  e.preventDefault();
                  if (!confirm("确认举报该返佣链接无效？商家诚信度将直接归零。")) return;
                  try {
                    await fetch(
                      `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001"}/api/merchants/${task.merchant_id}/report-fake-link`,
                      {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                          Authorization: `Bearer ${getToken()}`,
                        },
                        body: JSON.stringify({ task_id: taskId, reason: "返佣链接无效" }),
                      }
                    );
                    alert("举报已提交，平台将在 24 小时内审核处理");
                  } catch { alert("举报失败"); }
                }}
                className="text-xs text-red-400 hover:text-red-500 underline underline-offset-2"
              >
                🚩 举报无效链接
              </button>
            </div>
          )}

          {(merchantTrust || task.merchant_company) && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <IntegrityBadge
                score={(merchantTrust?.trust_score || task.merchant_trust_score || 100) as number}
                tier={(merchantTrust?.tier || task.merchant_tier || "M1") as string}
                tierLabels={{ M3: "🏆 金牌商家", M2: "🥈 银牌商家", M1: "🥉 铜牌商家" }}
                totalCompleted={(merchantTrust?.total_tasks_completed || 0) as number}
                totalDisputed={(merchantTrust?.total_tasks_disputed || 0) as number}
                avgRating={(merchantTrust?.avg_rating || task.merchant_avg_rating || 0) as number}
                showDetails
              />
            </div>
          )}
        </div>

        {/* Status timeline */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">📌 任务进度</h2>
          <div className="space-y-3">
            {[
              { key: "assigned", label: "待接单", done: ["assigned", "accepted", "shipped", "received", "creating", "submitted"].includes(slotStatus) },
              { key: "accepted", label: "已接单", done: ["accepted", "shipped", "received", "creating", "submitted"].includes(slotStatus) },
              { key: "shipped", label: "商家已发货", done: ["shipped", "received", "creating", "submitted"].includes(slotStatus) },
              { key: "received", label: "已收货", done: ["received", "creating", "submitted"].includes(slotStatus) },
              { key: "submitted", label: "已提交内容", done: ["submitted"].includes(slotStatus) },
            ].map((step) => (
              <div key={step.key} className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                  step.done ? "bg-green-500 text-white" : "bg-gray-200 text-gray-400"
                }`}>
                  {step.done ? "✓" : ""}
                </div>
                <span className={`text-sm ${step.done ? "text-gray-900 font-medium" : "text-gray-400"}`}>
                  {step.label}
                </span>
              </div>
            ))}
          </div>
          {task.tracking_number && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg text-sm">
              📦 物流单号：<span className="font-mono font-medium">{task.tracking_number}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        {!isCompleted && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            {isAssignedToMe && (
              <div className="space-y-2">
                <button
                  onClick={handleAccept}
                  disabled={accepting}
                  className="w-full btn-brand text-white py-3.5 rounded-xl font-semibold text-lg disabled:opacity-50"
                >
                  {accepting ? "接单中..." : "✅ 接单（质押 10 点）"}
                </button>
                <button
                  onClick={handleReject}
                  disabled={rejecting}
                  className="w-full border border-red-200 text-red-500 py-3 rounded-xl font-medium hover:bg-red-50 transition-colors disabled:opacity-50"
                >
                  {rejecting ? "拒绝中..." : "❌ 拒绝（-3 信任分）"}
                </button>
                <p className="text-xs text-gray-400 text-center">
                  接单冻结 10 点质押，完成后退还 5 点（平台扣 5 点服务费）
                </p>
              </div>
            )}

            {/* No slot — offer to claim an empty one */}
            {!isAssignedToMe && !isAcceptedByMe && !canReceive && !canSubmit && !isCompleted && (
              <div className="space-y-3">
                {canClaim ? (
                  <>
                    <p className="text-sm text-gray-500 text-center">
                      🎯 该任务还有 <strong>{allSlots.filter((s: any) => !s.koc_id).length}</strong> 个空位，你可以直接接单
                    </p>
                    <button
                      onClick={handleClaim}
                      disabled={accepting}
                      className="w-full bg-gradient-to-r from-pink-500 to-purple-500 text-white py-3.5 rounded-xl font-semibold text-lg hover:opacity-90 transition-opacity disabled:opacity-50 shadow-md shadow-pink-200"
                    >
                      {accepting ? "接单中..." : "🚀 接单（质押 10 点）"}
                    </button>
                    <p className="text-xs text-gray-400 text-center">
                      接单冻结 10 点质押，完成后退还 5 点（平台扣 5 点服务费）
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-gray-500 text-center">
                      😔 该任务已满员
                    </p>
                    {interestSent ? (
                      <span className="px-4 py-2 bg-emerald-50 text-emerald-700 rounded-full text-sm font-bold inline-block mx-auto block text-center">
                        ✓ 已表达意向
                      </span>
                    ) : (
                      <button
                        onClick={handleExpressInterest}
                        disabled={expressingInterest}
                        className="w-full bg-gradient-to-r from-pink-500 to-purple-500 text-white py-3.5 rounded-xl font-semibold text-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                      >
                        {expressingInterest ? "处理中..." : "✦ 表达意向（等新空位）"}
                      </button>
                    )}
                  </>
                )}
              </div>
            )}

            {canReceive && (
              <button
                onClick={handleReceive}
                className="w-full bg-purple-500 text-white py-3.5 rounded-xl font-semibold text-lg hover:bg-purple-600 transition-colors"
              >
                📦 确认收货
              </button>
            )}

            {canSubmit && (
              <div className="space-y-3">
                <label className="block text-sm font-semibold text-gray-700">
                  提交内容链接（每行一个）
                </label>
                <textarea
                  value={contentUrls}
                  onChange={(e) => setContentUrls(e.target.value)}
                  placeholder="https://tiktok.com/@xxx/video/xxx&#10;https://instagram.com/p/xxx&#10;https://xiaohongshu.com/xxx"
                  rows={4}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:ring-2 focus:ring-pink-200 focus:border-pink-400 outline-none resize-none"
                />
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="w-full bg-green-500 text-white py-3.5 rounded-xl font-semibold text-lg hover:bg-green-600 transition-colors disabled:opacity-50"
                >
                  {submitting ? "提交中..." : "🚀 提交内容（完成履约）"}
                </button>
                <p className="text-xs text-gray-400 text-center">
                  提交后退还 5 点（质押 10 - 平台费 5），佣金走返佣链接
                </p>
              </div>
            )}

            {slotStatus === "accepted" && (
              <div className="text-center text-sm text-gray-400 py-4">
                ⏳ 等待商家发货...
              </div>
            )}
          </div>
        )}

        {isCompleted && (
          <div className="bg-green-50 rounded-2xl border border-green-100 p-6 text-center">
            <div className="text-3xl mb-2">🎉</div>
            <p className="font-semibold text-green-700 text-lg">任务已提交！</p>
            <p className="text-sm text-green-600 mt-1">质押退还 5 点（已扣 5 点平台费），佣金走返佣链接</p>
            {mySlot?.content_urls && (
              <div className="mt-4 space-y-1">
                {(mySlot.content_urls as string[]).map((url: string, i: number) => (
                  <a
                    key={i}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-sm text-pink-500 hover:text-pink-600"
                  >
                    🔗 {url}
                  </a>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
