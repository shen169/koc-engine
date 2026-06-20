"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { tasks, auth, interests, getToken, getRole, getConsolePath } from "@/lib/api";
import IntegrityBadge from "@/components/IntegrityBadge";
import NavBar from "@/components/NavBar";
import DeadlineBadge from "@/components/DeadlineBadge";
import CommitmentConfirm from "@/components/CommitmentConfirm";

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
  // ── 内容表现数据 ──
  const [showMetricsForm, setShowMetricsForm] = useState(false);
  const [metrics, setMetrics] = useState({ views: 0, likes: 0, comments: 0, shares: 0, saves: 0, clicks: 0, conversions: 0, revenue: 0 });
  const [updatingMetrics, setUpdatingMetrics] = useState(false);
  const [showCommitment, setShowCommitment] = useState(false);
  const [showClaimCommitment, setShowClaimCommitment] = useState(false);

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

  // Called after user agrees to commitment terms
  async function handleConfirmAccept() {
    setShowCommitment(false);
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

  // Called after user agrees to commitment terms (claim empty slot path)
  async function handleConfirmClaim() {
    setShowClaimCommitment(false);
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

  async function handleUpdateMetrics() {
    setUpdatingMetrics(true);
    setError("");
    try {
      await tasks.submitMetrics(taskId, mySlotIndex, metrics as any, getToken()!);
      await loadTask();
      setShowMetricsForm(false);
    } catch (e: any) {
      setError(e.message || "更新表现数据失败");
    } finally {
      setUpdatingMetrics(false);
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
  const canSubmit = slotStatus === "received" || slotStatus === "creating" || slotStatus === "revision_requested";
  const canUpdateMetrics = slotStatus === "submitted" || slotStatus === "approved" || slotStatus === "completed";
  const isActive = !["submitted", "approved", "completed"].includes(slotStatus);

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
              { key: "assigned", label: "待接单", done: ["assigned", "accepted", "shipped", "received", "creating", "submitted", "approved", "completed"].includes(slotStatus) },
              { key: "accepted", label: "已接单", done: ["accepted", "shipped", "received", "creating", "submitted", "approved", "completed"].includes(slotStatus) },
              { key: "shipped", label: "商家已发货", done: ["shipped", "received", "creating", "submitted", "approved", "completed"].includes(slotStatus) },
              { key: "received", label: "已收货", done: ["received", "creating", "submitted", "approved", "completed"].includes(slotStatus) },
              { key: "submitted", label: "已提交内容", done: ["submitted", "approved", "completed"].includes(slotStatus) },
              { key: "approved", label: "商家审核通过", done: ["approved", "completed"].includes(slotStatus) },
              // Conditional abnormal states
              ...(slotStatus === "revision_requested" ? [{ key: "revision_requested", label: "需修改重交", done: false }] : []),
              ...(slotStatus === "timed_out" ? [{ key: "timed_out", label: "已逾期", done: false }] : []),
            ].map((step) => (
              <div key={step.key} className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                  step.done ? "bg-green-500 text-white" :
                  step.key === "revision_requested" ? "bg-orange-500 text-white" :
                  step.key === "timed_out" ? "bg-red-500 text-white" :
                  "bg-gray-200 text-gray-400"
                }`}>
                  {step.done ? "✓" : step.key === "timed_out" ? "✗" : ""}
                </div>
                <span className={`text-sm ${
                  step.done ? "text-gray-900 font-medium" :
                  step.key === "timed_out" ? "text-red-600 font-medium" :
                  "text-gray-400"
                }`}>
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
        {isActive && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            {isAssignedToMe && (
              <div className="space-y-2">
                <button
                  onClick={() => setShowCommitment(true)}
                  disabled={accepting}
                  className="w-full btn-brand text-white py-3.5 rounded-xl font-semibold text-lg disabled:opacity-50"
                >
                  {accepting ? "接单中..." : "✅ 接单（质押 10 点）"}
                </button>

                {/* Commitment confirm modal */}
                <CommitmentConfirm
                  open={showCommitment}
                  title="⚠️ 确认接单前，请知悉"
                  commitments={[
                    { icon: "📦", text: "收到商家寄出的样品后开始创作" },
                    { icon: "📹", text: "14 天内提交原创内容（视频/图文）" },
                    { icon: "🔗", text: "内容发布后提交链接到平台" },
                    { icon: "📊", text: "提交后可在平台更新内容表现数据" },
                  ]}
                  pledge={[
                    { icon: "🔒", text: "接单冻结 10 点质押" },
                    { icon: "💵", text: "完成后退还 5 点（平台扣 5 点服务费）" },
                    { icon: "💰", text: "佣金走产品返佣链接，平台点数不参与佣金发放" },
                  ]}
                  redlines={[
                    { icon: "⏰", text: "14 天内未提交内容 → 没收 10pt 质押 + 扣 15 信任分 + 可能降级" },
                    { icon: "🚫", text: "拒绝接单 → 扣 3 信任分" },
                    { icon: "📋", text: "最多同时进行 5 个任务" },
                    { icon: "🛡️", text: "商家 48h 不发货 → 退你质押 + 商家扣 20 分" },
                  ]}
                  confirmLabel="确认接单"
                  onConfirm={handleConfirmAccept}
                  onCancel={() => setShowCommitment(false)}
                />

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
            {!isAssignedToMe && !isAcceptedByMe && !canReceive && !canSubmit && isActive && (
              <div className="space-y-3">
                {canClaim ? (
                  <>
                    <p className="text-sm text-gray-500 text-center">
                      🎯 该任务还有 <strong>{allSlots.filter((s: any) => !s.koc_id).length}</strong> 个空位，你可以直接接单
                    </p>
                    <button
                      onClick={() => setShowClaimCommitment(true)}
                      disabled={accepting}
                      className="w-full bg-gradient-to-r from-pink-500 to-purple-500 text-white py-3.5 rounded-xl font-semibold text-lg hover:opacity-90 transition-opacity disabled:opacity-50 shadow-md shadow-pink-200"
                    >
                      {accepting ? "接单中..." : "🚀 接单（质押 10 点）"}
                    </button>

                    {/* Commitment confirm modal for claim path */}
                    <CommitmentConfirm
                      open={showClaimCommitment}
                      title="⚠️ 确认接单前，请知悉"
                      commitments={[
                        { icon: "📦", text: "收到商家寄出的样品后开始创作" },
                        { icon: "📹", text: "14 天内提交原创内容（视频/图文）" },
                        { icon: "🔗", text: "内容发布后提交链接到平台" },
                        { icon: "📊", text: "提交后可在平台更新内容表现数据" },
                      ]}
                      pledge={[
                        { icon: "🔒", text: "接单冻结 10 点质押" },
                        { icon: "💵", text: "完成后退还 5 点（平台扣 5 点服务费）" },
                        { icon: "💰", text: "佣金走产品返佣链接，平台点数不参与佣金发放" },
                      ]}
                      redlines={[
                        { icon: "⏰", text: "14 天内未提交内容 → 没收 10pt 质押 + 扣 15 信任分 + 可能降级" },
                        { icon: "🚫", text: "拒绝接单 → 扣 3 信任分" },
                        { icon: "📋", text: "最多同时进行 5 个任务" },
                        { icon: "🛡️", text: "商家 48h 不发货 → 退你质押 + 商家扣 20 分" },
                      ]}
                      confirmLabel="确认接单"
                      onConfirm={handleConfirmClaim}
                      onCancel={() => setShowClaimCommitment(false)}
                    />

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
                {/* Countdown for 14-day submission deadline */}
                {mySlot?.received_at && slotStatus !== "revision_requested" && (
                  <DeadlineBadge
                    deadline={new Date(new Date(mySlot.received_at).getTime() + 14 * 24 * 60 * 60 * 1000).toISOString()}
                    label="提交内容截止"
                    penalty="逾期未提交将扣除 15 信任分 + 没收 10pt 质押"
                    size="md"
                  />
                )}

                {slotStatus === "revision_requested" && (
                  <DeadlineBadge
                    deadline={new Date(new Date(
                      (mySlot as any).rejected_at || mySlot.submitted_at
                    ).getTime() + 3 * 24 * 60 * 60 * 1000).toISOString()}
                    label="修改重交截止"
                    penalty={`逾期未重交将按违约处理：扣 15 信任分 + 没收质押（已修改 ${(mySlot as any).revision_count || 0}/${(mySlot as any).max_revisions || 3} 次）`}
                    size="md"
                  />
                )}

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

        {(canUpdateMetrics || slotStatus === "approved") && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="font-semibold text-gray-900 mb-4">📊 内容表现数据</h2>

            {/* Show current metrics if available */}
            {mySlot?.content_data && typeof mySlot.content_data === "object" && mySlot.content_data.views > 0 ? (
              <div className="mb-4">
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {[
                    { label: "播放", value: mySlot.content_data.views || 0 },
                    { label: "点赞", value: mySlot.content_data.likes || 0 },
                    { label: "评论", value: mySlot.content_data.comments || 0 },
                    { label: "分享", value: mySlot.content_data.shares || 0 },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-gray-50 rounded-lg p-2 text-center">
                      <div className="text-lg font-bold text-gray-900">{(value as number).toLocaleString()}</div>
                      <div className="text-xs text-gray-400">{label}</div>
                    </div>
                  ))}
                </div>
                {mySlot.content_data.engagement_rate > 0 && (
                  <p className="text-xs text-green-600 text-center">
                    📈 互动率：{mySlot.content_data.engagement_rate}%
                    {mySlot.content_data.last_updated && ` · 更新于 ${new Date(mySlot.content_data.last_updated).toLocaleDateString()}`}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-400 mb-4">内容已提交，添加表现数据让商家看到你的带货效果 📈</p>
            )}

            {!showMetricsForm ? (
              <button
                onClick={() => setShowMetricsForm(true)}
                className="w-full border-2 border-dashed border-gray-300 text-gray-500 py-3 rounded-xl font-medium hover:border-pink-300 hover:text-pink-600 transition-all"
              >
                {mySlot?.content_data?.views > 0 ? "✏️ 更新表现数据" : "📊 添加表现数据"}
              </button>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: "views", label: "播放量" },
                    { key: "likes", label: "点赞" },
                    { key: "comments", label: "评论" },
                    { key: "shares", label: "分享" },
                    { key: "saves", label: "收藏" },
                    { key: "clicks", label: "链接点击" },
                    { key: "conversions", label: "成交数" },
                    { key: "revenue", label: "归因收入($)" },
                  ].map(({ key, label }) => (
                    <div key={key}>
                      <label className="text-xs text-gray-500">{label}</label>
                      <input
                        type="number"
                        min="0"
                        value={(metrics as any)[key] || ""}
                        onChange={(e) => setMetrics({ ...metrics, [key]: parseInt(e.target.value) || 0 })}
                        placeholder="0"
                        className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:ring-1 focus:ring-pink-200 outline-none"
                      />
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowMetricsForm(false)}
                    className="flex-1 border border-gray-200 text-gray-500 py-2.5 rounded-xl font-medium text-sm hover:bg-gray-50"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleUpdateMetrics}
                    disabled={updatingMetrics}
                    className="flex-1 bg-gradient-to-r from-pink-500 to-purple-500 text-white py-2.5 rounded-xl font-semibold text-sm disabled:opacity-50"
                  >
                    {updatingMetrics ? "更新中..." : "💾 保存表现数据"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {slotStatus === "timed_out" && (
          <div className="bg-red-50 rounded-2xl border-2 border-red-200 p-6 text-center mt-4">
            <div className="text-3xl mb-2">⛔</div>
            <p className="font-bold text-red-700 text-lg">该任务已逾期</p>
            <div className="mt-4 space-y-2 text-left max-w-xs mx-auto">
              <div className="flex items-center gap-2 text-sm text-red-600">
                <span>💸</span>
                <span>质押 10pt 已退还商家</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-red-600">
                <span>📉</span>
                <span>信任分 -15</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-red-600">
                <span>⚠️</span>
                <span>等级可能已降级</span>
              </div>
            </div>
            <p className="text-xs text-red-400 mt-4">请遵守平台规则，避免再次逾期</p>
          </div>
        )}

        {slotStatus === "completed" && (
          <div className="bg-green-50 rounded-2xl border border-green-100 p-6 text-center mt-4">
            <div className="text-3xl mb-2">🎉</div>
            <p className="font-semibold text-green-700 text-lg">履约已完成！</p>
            <p className="text-sm text-green-600 mt-1">质押已退还，信任分已恢复</p>
            {mySlot?.content_urls && (
              <div className="mt-4 space-y-1">
                {(mySlot.content_urls as string[]).map((url: string, i: number) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                     className="block text-sm text-pink-500 hover:text-pink-600">
                    🔗 {url}
                  </a>
                ))}
              </div>
            )}
          </div>
        )}

        {slotStatus === "revision_requested" && (
          <div className="bg-orange-50 rounded-2xl border border-orange-200 p-6 text-center mt-4">
            <div className="text-3xl mb-2">✏️</div>
            <p className="font-semibold text-orange-700 text-lg">商家要求修改内容</p>
            {(mySlot as any)?.review_feedback && (
              <div className="mt-3 bg-white rounded-xl p-4 text-left">
                <p className="text-xs text-gray-400 mb-1">商家反馈：</p>
                <p className="text-sm text-gray-700">{(mySlot as any).review_feedback}</p>
              </div>
            )}
            <p className="text-xs text-orange-500 mt-3">
              请在 3 天内修改并重新提交（已修改 {(mySlot as any)?.revision_count || 0}/{(mySlot as any)?.max_revisions || 3} 次）
            </p>
            {mySlot?.content_urls && (
              <div className="mt-3 space-y-1">
                {(mySlot.content_urls as string[]).map((url: string, i: number) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                     className="block text-sm text-pink-500 hover:text-pink-600">
                    🔗 {url}
                  </a>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Submitted state — content pending review */}
        {slotStatus === "submitted" && !canUpdateMetrics && (
          <div className="bg-blue-50 rounded-2xl border border-blue-100 p-6 text-center mt-4">
            <div className="text-3xl mb-2">⏳</div>
            <p className="font-semibold text-blue-700 text-lg">内容已提交，等待商家审核</p>
            {mySlot?.content_urls && (
              <div className="mt-4 space-y-1">
                {(mySlot.content_urls as string[]).map((url: string, i: number) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                     className="block text-sm text-pink-500 hover:text-pink-600">
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
