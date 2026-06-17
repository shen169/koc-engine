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
  const token = getToken();
  const role = getRole();
  if (!token) { router.push("/login"); return null; }
  if (role && role !== "koc") { router.push(getConsolePath(role || "")); return null; }

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
    loadTask();
  }, [taskId]);

  async function loadTask() {
    setLoading(true);
    try {
      const t = await tasks.get(taskId, token!);
      setTask(t);

      // Find my slot
      const myData = await tasks.mine(token!);
      const found = (myData as any[]).find((item: any) => {
        const tid = item.task?.id || item.task?.task_id || "";
        return tid === taskId;
      });

      if (found) {
        setMySlot(found.my_slot || {});
        setMySlotIndex(found.my_slot_index ?? -1);
      } else {
        // KOC hasn't accepted yet — find slot assigned to THIS KOC
        const myProfile = await auth.me(token!);
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
          const trust = await merchants.getTrust(t.merchant_id, token!);
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
      await tasks.accept(taskId, mySlotIndex, token!);
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
      await tasks.reject(taskId, mySlotIndex, token!);
      // 拒绝后返回任务广场
      router.push("/portal/hall");
    } catch (e: any) {
      setError(e.message || "拒绝失败");
      setRejecting(false);
    }
  }

  async function handleReceive() {
    try {
      await tasks.receive(taskId, mySlotIndex, token!);
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
      await tasks.submit(taskId, mySlotIndex, urls, token!);
      await loadTask();
      setContentUrls("");
    } catch (e: any) {
      setError(e.message || "提交失败");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleExpressInterest() {
    setExpressingInterest(true);
    setError("");
    try {
      await interests.express(task.product_id, "product", token!);
      setInterestSent(true);
    } catch (e: any) {
      setError(e.message || "表达意向失败");
    } finally {
      setExpressingInterest(false);
    }
  }

  if (loading) return <div className="min-h-screen bg-orange-50/30 flex items-center justify-center text-gray-400">加载中...</div>;
  if (!task) return <div className="min-h-screen bg-orange-50/30 flex items-center justify-center text-gray-400">任务不存在</div>;

  const slotStatus = mySlot?.status || "unknown";
  const isAssignedToMe = slotStatus === "assigned";
  const canReceive = slotStatus === "shipped";
  const canSubmit = slotStatus === "received" || slotStatus === "creating";
  const isCompleted = slotStatus === "submitted" || slotStatus === "completed";

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
          <h1 className="text-2xl font-bold text-gray-900 mb-3">{task.product_name}</h1>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="text-gray-400 text-xs">返佣参考</div>
              <div className="font-bold text-gray-900">${task.commission || 0}</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="text-gray-400 text-xs">质押（完成退 5 点）</div>
              <div className="font-bold text-gray-900">10 点</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="text-gray-400 text-xs">接单时限</div>
              <div className="font-bold text-gray-900">{task.task_type === "urgent" ? "12 小时" : "无限制"}</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="text-gray-400 text-xs">创作时限</div>
              <div className="font-bold text-gray-900">14 天</div>
            </div>
          </div>

          {/* Commission link (visible after KOC accepts) */}
          {(task.commission_link) && slotStatus !== "assigned" && (
            <div className="mt-4 p-4 bg-pink-50 border border-pink-100 rounded-xl">
              <div className="text-xs font-semibold text-pink-700 mb-2">🔗 推广返佣链接</div>
              <a
                href={task.commission_link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-pink-500 hover:text-pink-600 break-all font-mono"
              >
                {task.commission_link}
              </a>
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-pink-400">
                  用此链接推广，成交佣金由链接平台自动结算
                </p>
                <button
                  onClick={async () => {
                    if (!confirm("确认举报该返佣链接无效？商家诚信度将直接归零。")) return;
                    try {
                      const { merchants } = await import("@/lib/api");
                      await fetch(
                        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001"}/api/merchants/${task.merchant_id}/report-fake-link`,
                        {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${token}`,
                          },
                          body: JSON.stringify({ task_id: taskId, reason: "返佣链接无效" }),
                        }
                      );
                      alert("已举报，商家诚信度已归零。");
                      loadTask();
                    } catch (e: any) {
                      alert("举报失败: " + (e.message || "未知错误"));
                    }
                  }}
                  className="text-xs text-red-400 hover:text-red-600 underline whitespace-nowrap"
                >
                  🚩 举报无效链接
                </button>
              </div>
            </div>
          )}

          {merchantTrust && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <IntegrityBadge
                score={merchantTrust.trust_score}
                tier={merchantTrust.tier}
                tierLabels={{ M3: "🏆 金牌商家", M2: "🥈 银牌商家", M1: "🥉 铜牌商家" }}
                totalCompleted={merchantTrust.total_tasks_completed}
                totalDisputed={merchantTrust.total_tasks_disputed}
                avgRating={merchantTrust.avg_rating}
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

            {/* No slot assigned — express interest in the product */}
            {!isAssignedToMe && !canReceive && !canSubmit && slotStatus !== "accepted" && (
              <div className="space-y-3">
                {interestSent ? (
                  <div className="text-center py-3">
                    <span className="px-4 py-2 bg-emerald-50 text-emerald-700 rounded-full text-sm font-bold inline-block">
                      ✓ 已表达意向
                    </span>
                    <p className="text-xs text-gray-400 mt-2">商家看到意向后可能会将你加入任务</p>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-gray-500 text-center">
                      你尚未被分配到该任务。对产品表达意向后，商家可以看到你。
                    </p>
                    <button
                      onClick={handleExpressInterest}
                      disabled={expressingInterest}
                      className="w-full bg-gradient-to-r from-pink-500 to-purple-500 text-white py-3.5 rounded-xl font-semibold text-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                      {expressingInterest ? "发送中..." : "💌 对产品表达意向"}
                    </button>
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
