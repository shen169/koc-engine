"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { tasks, auth, interests, getToken, getRole, getConsolePath } from "@/lib/api";
import { getTrackingUrl } from "@/lib/tracking";
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
  // ── Content Performance Data ──
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
      setError(e.message || "Accept task failed");
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
      setError(e.message || "Accept task failed");
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
      setError(e.message || "Accept task failed");
    } finally {
      setAccepting(false);
    }
  }

  async function handleReject() {
    if (!confirm("Rejecting this task will deduct 3 Trust Score. Confirm?")) return;
    setRejecting(true);
    setError("");
    try {
      await tasks.reject(taskId, mySlotIndex, getToken()!);
      // Return to task hall after rejection
      router.push("/portal/hall");
    } catch (e: any) {
      setError(e.message || "Reject failed");
      setRejecting(false);
    }
  }

  async function handleReceive() {
    try {
      await tasks.receive(taskId, mySlotIndex, getToken()!);
      await loadTask();
    } catch (e: any) {
      setError(e.message || "Confirm receipt failed");
    }
  }

  async function handleSubmit() {
    const urls = contentUrls
      .split("\n")
      .map((u: string) => u.trim())
      .filter(Boolean);
    if (urls.length === 0) {
      setError("Please enter at least one content link");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await tasks.submit(taskId, mySlotIndex, urls, getToken()!);
      await loadTask();
      setContentUrls("");
    } catch (e: any) {
      setError(e.message || "Submission failed");
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
      setError(e.message || "Update performance data failed");
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
      setError(e.message || "Accept task failed");
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
      setError(e.message || "Express interest failed");
    } finally {
      setExpressingInterest(false);
    }
  }

  if (!authorized || loading) return <div className="min-h-screen bg-orange-50/30 flex items-center justify-center text-gray-400">Loading...</div>;
  if (!task) return <div className="min-h-screen bg-orange-50/30 flex items-center justify-center text-gray-400">Task not found</div>;

  const slotStatus = mySlot?.status || "unknown";
  const isAssignedToMe = slotStatus === "assigned";
  const isAcceptedByMe = slotStatus === "accepted" || slotStatus === "shipped" || slotStatus === "received" || slotStatus === "creating";
  const canReceive = slotStatus === "shipped";
  const canSubmit = slotStatus === "received" || slotStatus === "creating" || slotStatus === "revision_requested";
  const canUpdateMetrics = slotStatus === "submitted" || slotStatus === "approved" || slotStatus === "completed";
  const isActive = !["submitted", "approved", "completed"].includes(slotStatus);

  // Find first available empty slot (KOC can accept)
  const allSlots = (task.koc_slots || []) as any[];
  const firstEmptySlotIndex = allSlots.findIndex((s: any) => !s.koc_id);
  const canClaim = !isAssignedToMe && !isAcceptedByMe && firstEmptySlotIndex >= 0;

  return (
    <div className="min-h-screen bg-orange-50/30">
      <NavBar user={null} role="koc" title="Task Details" />
      <div className="max-w-2xl mx-auto px-6 py-8">
        <button onClick={() => router.back()} className="text-sm text-gray-400 hover:text-gray-600 mb-4 inline-block">
          ← Back
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
              {task.task_type === "urgent" ? "⚡ Urgent" : "🌊 Long-term"}
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
              🔗 Product URL: {(task.commission_link as string).slice(0, 50)}... ↗
            </a>
          )}

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="text-gray-400 text-xs">Commission</div>
              <div className="font-bold text-gray-900">${task.commission || 0}</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="text-gray-400 text-xs">Pledge (5 pt returned on completion)</div>
              <div className="font-bold text-gray-900">{task.pledge_koc || 0} pt</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="text-gray-400 text-xs">Acceptance Deadline</div>
              <div className="font-bold text-gray-900">{task.task_type === "urgent" ? "12 hours" : "7 days"}</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="text-gray-400 text-xs">Creation Deadline</div>
              <div className="font-bold text-gray-900">14 days</div>
            </div>
          </div>

          {/* Fake link report */}
          {(task.commission_link) && (
            <div className="flex items-center justify-end mt-2">
              <button
                onClick={async (e) => {
                  e.preventDefault();
                  if (!confirm("Confirm reporting this product link as broken? The merchant's Trust will be reset to zero.")) return;
                  try {
                    await fetch(
                      `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001"}/api/merchants/${task.merchant_id}/report-fake-link`,
                      {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                          Authorization: `Bearer ${getToken()}`,
                        },
                        body: JSON.stringify({ task_id: taskId, reason: "Broken Link" }),
                      }
                    );
                    alert("Report submitted. Platform will review within 24 hours.");
                  } catch { alert("Report failed"); }
                }}
                className="text-xs text-red-400 hover:text-red-500 underline underline-offset-2"
              >
                🚩 Report Broken Link
              </button>
            </div>
          )}

          {(merchantTrust || task.merchant_company) && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <IntegrityBadge
                score={(merchantTrust?.trust_score || task.merchant_trust_score || 100) as number}
                tier={(merchantTrust?.tier || task.merchant_tier || "M1") as string}
                tierLabels={{ M3: "🏆 Gold Merchant", M2: "🥈 Silver Merchant", M1: "🥉 Bronze Merchant" }}
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
          <h2 className="font-semibold text-gray-900 mb-4">📌 Task Progress</h2>
          <div className="space-y-3">
            {[
              { key: "assigned", label: "Awaiting Acceptance", done: ["assigned", "accepted", "shipped", "received", "creating", "submitted", "approved", "completed"].includes(slotStatus) },
              { key: "accepted", label: "Accepted", done: ["accepted", "shipped", "received", "creating", "submitted", "approved", "completed"].includes(slotStatus) },
              { key: "shipped", label: "Merchant Shipped", done: ["shipped", "received", "creating", "submitted", "approved", "completed"].includes(slotStatus) },
              { key: "received", label: "Received", done: ["received", "creating", "submitted", "approved", "completed"].includes(slotStatus) },
              { key: "submitted", label: "Content Submitted", done: ["submitted", "approved", "completed"].includes(slotStatus) },
              { key: "approved", label: "Merchant Approved", done: ["approved", "completed"].includes(slotStatus) },
              // Conditional abnormal states
              ...(slotStatus === "revision_requested" ? [{ key: "revision_requested", label: "Revision Required", done: false }] : []),
              ...(slotStatus === "timed_out" ? [{ key: "timed_out", label: "Overdue", done: false }] : []),
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
            <div className="mt-4 p-4 bg-gray-50 rounded-xl text-sm space-y-1">
              <div className="flex items-center gap-2">
                <span>📦</span>
                <span className="font-semibold text-gray-700">Shipment Tracking</span>
              </div>
              {task.carrier && (
                <div className="flex gap-2">
                  <span className="text-gray-400">Carrier:</span>
                  <span className="font-medium">{task.carrier}</span>
                </div>
              )}
              <div className="flex gap-2">
                <span className="text-gray-400">Tracking:</span>
                <span className="font-mono font-medium">{task.tracking_number}</span>
                {getTrackingUrl(task.carrier || "", task.tracking_number) && (
                  <a
                    href={getTrackingUrl(task.carrier || "", task.tracking_number)!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-pink-500 hover:text-pink-600 underline font-medium"
                  >
                    🔗 Track Package ↗
                  </a>
                )}
              </div>
              {task.shipping_proof_urls?.length > 0 && (
                <div className="flex gap-2 flex-wrap pt-1">
                  <span className="text-gray-400">Proof:</span>
                  {task.shipping_proof_urls.map((url: string, i: number) => (
                    <a
                      key={i}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-pink-500 hover:text-pink-600 underline text-xs"
                    >
                      📷 Photo {i + 1}
                    </a>
                  ))}
                </div>
              )}
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
                  {accepting ? "Accepting..." : `✅ Accept (Pledge ${task?.pledge_koc || 0} pt)`}
                </button>

                {/* Commitment confirm modal */}
                <CommitmentConfirm
                  open={showCommitment}
                  title="⚠️ Please read before confirming acceptance"
                  commitments={[
                    { icon: "📦", text: "Start creating after receiving samples from merchant" },
                    { icon: "📹", text: "Submit original content within 14 days (video/image-text)" },
                    { icon: "🔗", text: "Submit content links to platform after publishing" },
                    { icon: "📊", text: "Update content performance data on platform after submission" },
                  ]}
                  pledge={[
                    { icon: "🔒", text: `Accepting freezes ${task?.pledge_koc || 0} pt pledge` },
                    { icon: "💵", text: `${Math.max(0, (task?.pledge_koc || 0) - 5)} pt returned on completion (platform deducts 5 pt service fee)` },
                    { icon: "💰", text: "Commission via product affiliate link; platform points are not used for commission payouts" },
                  ]}
                  redlines={[
                    { icon: "⏰", text: `No submission in 14 days: forfeit ${task?.pledge_koc || 0}pt pledge + deduct 15 Trust Score + possible tier downgrade` },
                    { icon: "🚫", text: "Reject task: deduct 3 Trust Score" },
                    { icon: "📋", text: "Maximum 5 concurrent tasks" },
                    { icon: "🛡️", text: "Merchant doesn't ship in 48h: return your pledge + merchant deduct 20" },
                  ]}
                  confirmLabel="Confirm Acceptance"
                  onConfirm={handleConfirmAccept}
                  onCancel={() => setShowCommitment(false)}
                />

                <button
                  onClick={handleReject}
                  disabled={rejecting}
                  className="w-full border border-red-200 text-red-500 py-3 rounded-xl font-medium hover:bg-red-50 transition-colors disabled:opacity-50"
                >
                  {rejecting ? "Rejecting..." : "❌ Reject (-3 Trust Score)"}
                </button>
                <p className="text-xs text-gray-400 text-center">
                  Accepting freezes {task?.pledge_koc || 0} pt pledge; {Math.max(0, (task?.pledge_koc || 0) - 5)} pt returned on completion (platform deducts 5 pt service fee)
                </p>
              </div>
            )}

            {/* No slot — offer to claim an empty one */}
            {!isAssignedToMe && !isAcceptedByMe && !canReceive && !canSubmit && isActive && (
              <div className="space-y-3">
                {canClaim ? (
                  <>
                    <p className="text-sm text-gray-500 text-center">
                      🎯 This task has <strong>{allSlots.filter((s: any) => !s.koc_id).length}</strong> open slots -- you can accept directly
                    </p>
                    <button
                      onClick={() => setShowClaimCommitment(true)}
                      disabled={accepting}
                      className="w-full bg-gradient-to-r from-pink-500 to-purple-500 text-white py-3.5 rounded-xl font-semibold text-lg hover:opacity-90 transition-opacity disabled:opacity-50 shadow-md shadow-pink-200"
                    >
                      {accepting ? "Accepting..." : `🚀 Accept (Pledge ${task?.pledge_koc || 0} pt)`}
                    </button>

                    {/* Commitment confirm modal for claim path */}
                    <CommitmentConfirm
                      open={showClaimCommitment}
                      title="⚠️ Please read before confirming acceptance"
                      commitments={[
                        { icon: "📦", text: "Start creating after receiving samples from merchant" },
                        { icon: "📹", text: "Submit original content within 14 days (video/image-text)" },
                        { icon: "🔗", text: "Submit content links to platform after publishing" },
                        { icon: "📊", text: "Update content performance data on platform after submission" },
                      ]}
                      pledge={[
                        { icon: "🔒", text: `Accepting freezes ${task?.pledge_koc || 0} pt pledge` },
                        { icon: "💵", text: `${Math.max(0, (task?.pledge_koc || 0) - 5)} pt returned on completion (platform deducts 5 pt service fee)` },
                        { icon: "💰", text: "Commission via product affiliate link; platform points are not used for commission payouts" },
                      ]}
                      redlines={[
                        { icon: "⏰", text: `No submission in 14 days: forfeit ${task?.pledge_koc || 0}pt pledge + deduct 15 Trust Score + possible tier downgrade` },
                        { icon: "🚫", text: "Reject task: deduct 3 Trust Score" },
                        { icon: "📋", text: "Maximum 5 concurrent tasks" },
                        { icon: "🛡️", text: "Merchant doesn't ship in 48h: return your pledge + merchant deduct 20" },
                      ]}
                      confirmLabel="Confirm Acceptance"
                      onConfirm={handleConfirmClaim}
                      onCancel={() => setShowClaimCommitment(false)}
                    />

                    <p className="text-xs text-gray-400 text-center">
                      Accepting freezes {task?.pledge_koc || 0} pt pledge; {Math.max(0, (task?.pledge_koc || 0) - 5)} pt returned on completion (platform deducts 5 pt service fee)
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-gray-500 text-center">
                      😔 This task is full
                    </p>
                    {interestSent ? (
                      <span className="px-4 py-2 bg-emerald-50 text-emerald-700 rounded-full text-sm font-bold inline-block mx-auto block text-center">
                        ✓ Interest Expressed
                      </span>
                    ) : (
                      <button
                        onClick={handleExpressInterest}
                        disabled={expressingInterest}
                        className="w-full bg-gradient-to-r from-pink-500 to-purple-500 text-white py-3.5 rounded-xl font-semibold text-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                      >
                        {expressingInterest ? "Processing..." : "✦ Express Interest (wait for open slot)"}
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
                📦 Confirm Receipt
              </button>
            )}

            {canSubmit && (
              <div className="space-y-3">
                {/* Countdown for 14-day submission deadline */}
                {mySlot?.received_at && slotStatus !== "revision_requested" && (
                  <DeadlineBadge
                    deadline={new Date(new Date(mySlot.received_at).getTime() + 14 * 24 * 60 * 60 * 1000).toISOString()}
                    label="Content Submission Deadline"
                    penalty={`Late submission: deduct 15 Trust Score + forfeit ${task?.pledge_koc || 0}pt pledge`}
                    size="md"
                  />
                )}

                {slotStatus === "revision_requested" && (
                  <DeadlineBadge
                    deadline={new Date(new Date(
                      (mySlot as any).rejected_at || mySlot.submitted_at
                    ).getTime() + 3 * 24 * 60 * 60 * 1000).toISOString()}
                    label="Revision Resubmission Deadline"
                    penalty={`Late resubmission: penalty - deduct 15 Trust Score + forfeit pledge (revised ${(mySlot as any).revision_count || 0}/${(mySlot as any).max_revisions || 3} times)`}
                    size="md"
                  />
                )}

                <label className="block text-sm font-semibold text-gray-700">
                  Submit content links (one per line)
                </label>
                <textarea
                  value={contentUrls}
                  onChange={(e) => setContentUrls(e.target.value)}
                  placeholder="https://tiktok.com/@xxx/video/xxx&#10;https://youtube.com/watch?v=xxx&#10;https://instagram.com/p/xxx"
                  rows={4}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:ring-2 focus:ring-pink-200 focus:border-pink-400 outline-none resize-none"
                />
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="w-full bg-green-500 text-white py-3.5 rounded-xl font-semibold text-lg hover:bg-green-600 transition-colors disabled:opacity-50"
                >
                  {submitting ? "Submitting..." : "🚀 Submit Content (Complete Fulfillment)"}
                </button>
                <p className="text-xs text-gray-400 text-center">
                  {Math.max(0, (task?.pledge_koc || 0) - 5)} pt returned on submission (pledge {task?.pledge_koc || 0} - platform fee 5), commission via affiliate link
                </p>
              </div>
            )}

            {slotStatus === "accepted" && (
              <div className="text-center text-sm text-gray-400 py-4">
                ⏳ Waiting for merchant to ship...
              </div>
            )}
          </div>
        )}

        {(canUpdateMetrics || slotStatus === "approved") && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="font-semibold text-gray-900 mb-4">📊 Content Performance Data</h2>

            {/* Show current metrics if available */}
            {mySlot?.content_data && typeof mySlot.content_data === "object" && mySlot.content_data.views > 0 ? (
              <div className="mb-4">
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {[
                    { label: "Views", value: mySlot.content_data.views || 0 },
                    { label: "Likes", value: mySlot.content_data.likes || 0 },
                    { label: "Comments", value: mySlot.content_data.comments || 0 },
                    { label: "Shares", value: mySlot.content_data.shares || 0 },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-gray-50 rounded-lg p-2 text-center">
                      <div className="text-lg font-bold text-gray-900">{(value as number).toLocaleString()}</div>
                      <div className="text-xs text-gray-400">{label}</div>
                    </div>
                  ))}
                </div>
                {mySlot.content_data.engagement_rate > 0 && (
                  <p className="text-xs text-green-600 text-center">
                    📈 Engagement Rate: {mySlot.content_data.engagement_rate}%
                    {mySlot.content_data.last_updated && ` · Updated on ${new Date(mySlot.content_data.last_updated).toLocaleDateString()}`}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-400 mb-4">Content submitted. Add performance data to show your promotional impact 📈</p>
            )}

            {!showMetricsForm ? (
              <button
                onClick={() => setShowMetricsForm(true)}
                className="w-full border-2 border-dashed border-gray-300 text-gray-500 py-3 rounded-xl font-medium hover:border-pink-300 hover:text-pink-600 transition-all"
              >
                {mySlot?.content_data?.views > 0 ? "✏️ Update Performance Data" : "📊 Add Performance Data"}
              </button>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: "views", label: "Views" },
                    { key: "likes", label: "Likes" },
                    { key: "comments", label: "Comments" },
                    { key: "shares", label: "Shares" },
                    { key: "saves", label: "Saves" },
                    { key: "clicks", label: "Link Clicks" },
                    { key: "conversions", label: "Conversions" },
                    { key: "revenue", label: "Attributed Revenue ($)" },
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
                    Cancel
                  </button>
                  <button
                    onClick={handleUpdateMetrics}
                    disabled={updatingMetrics}
                    className="flex-1 bg-gradient-to-r from-pink-500 to-purple-500 text-white py-2.5 rounded-xl font-semibold text-sm disabled:opacity-50"
                  >
                    {updatingMetrics ? "Updating..." : "💾 Save Performance Data"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {slotStatus === "timed_out" && (
          <div className="bg-red-50 rounded-2xl border-2 border-red-200 p-6 text-center mt-4">
            <div className="text-3xl mb-2">⛔</div>
            <p className="font-bold text-red-700 text-lg">This task is overdue</p>
            <div className="mt-4 space-y-2 text-left max-w-xs mx-auto">
              <div className="flex items-center gap-2 text-sm text-red-600">
                <span>💸</span>
                <span>{task?.pledge_koc || 0}pt pledge returned to merchant</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-red-600">
                <span>📉</span>
                <span>Trust Score -15</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-red-600">
                <span>⚠️</span>
                <span>Tier may have been downgraded</span>
              </div>
            </div>
            <p className="text-xs text-red-400 mt-4">Please follow platform rules to avoid future timeouts.</p>
          </div>
        )}

        {slotStatus === "completed" && (
          <div className="bg-green-50 rounded-2xl border border-green-100 p-6 text-center mt-4">
            <div className="text-3xl mb-2">🎉</div>
            <p className="font-semibold text-green-700 text-lg">Fulfillment Complete!</p>
            <p className="text-sm text-green-600 mt-1">Pledge returned, Trust Score restored</p>
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
            <p className="font-semibold text-orange-700 text-lg">Merchant requests content revision</p>
            {(mySlot as any)?.review_feedback && (
              <div className="mt-3 bg-white rounded-xl p-4 text-left">
                <p className="text-xs text-gray-400 mb-1">Merchant feedback:</p>
                <p className="text-sm text-gray-700">{(mySlot as any).review_feedback}</p>
              </div>
            )}
            <p className="text-xs text-orange-500 mt-3">
              Please revise and resubmit within 3 days (revised {(mySlot as any)?.revision_count || 0}/{(mySlot as any)?.max_revisions || 3} times)
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
            <p className="font-semibold text-blue-700 text-lg">Content submitted, awaiting merchant review</p>
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
