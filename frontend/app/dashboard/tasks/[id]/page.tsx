"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { tasks, getToken, getRole, getConsolePath } from "@/lib/api";
import NavBar from "@/components/NavBar";
import TaskProgress from "@/components/TaskProgress";
import DeadlineBadge from "@/components/DeadlineBadge";

export default function MerchantTaskDetailPage() {
  const router = useRouter();
  const params = useParams();
  const taskId = params.id as string;
  const token = getToken();
  const role = getRole();
  if (!token) { router.push("/login"); return null; }
  if (role && role !== "merchant") { router.push(getConsolePath(role || "")); return null; }

  const [task, setTask] = useState<any>(null);
  const [report, setReport] = useState<any>(null);
  const [performance, setPerformance] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"progress" | "report" | "performance">("progress");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [shipping, setShipping] = useState(false);
  const [error, setError] = useState("");
  const [reviewing, setReviewing] = useState<Record<number, boolean>>({});

  useEffect(() => {
    loadTask();
  }, [taskId]);

  async function loadTask() {
    setLoading(true);
    try {
      const [t, r] = await Promise.all([
        tasks.get(taskId, token!),
        tasks.report(taskId, token!),
      ]);
      setTask(t);
      setReport(r);
    } catch (e) {
      console.error("Failed to load task:", e);
    } finally {
      setLoading(false);
    }
  }

  async function loadPerformance() {
    if (performance) return; // already loaded
    try {
      const p = await tasks.performance(taskId, token!);
      setPerformance(p);
    } catch (e) {
      console.error("Failed to load performance:", e);
    }
  }

  async function handleShip() {
    if (!trackingNumber.trim()) {
      setError("Please enter tracking number");
      return;
    }
    setShipping(true);
    setError("");
    try {
      await tasks.ship(taskId, trackingNumber.trim(), token!);
      await loadTask();
    } catch (e: any) {
      setError(e.message || "Shipping failed");
    } finally {
      setShipping(false);
    }
  }

  async function handleReview(slotIndex: number, action: "approve" | "reject") {
    let feedback = "Approved";
    if (action === "reject") {
      feedback = prompt("Please enter rejection reason (KOC will see this feedback):") || "";
      if (!feedback.trim()) {
        setError("Please provide rejection reason");
        return;
      }
    }
    setReviewing((prev) => ({ ...prev, [slotIndex]: true }));
    setError("");
    try {
      await tasks.review(taskId, slotIndex, action, feedback, token!);
      await loadTask();
    } catch (e: any) {
      setError(e.message || "Review failed");
    } finally {
      setReviewing((prev) => ({ ...prev, [slotIndex]: false }));
    }
  }

  if (loading) return <div className="text-center py-20 text-gray-400">Loading...</div>;
  if (!task) return <div className="text-center py-20 text-gray-400">Task not found</div>;

  const kocSlots = task.koc_slots || [];
  const kocFilled = kocSlots.filter((s: any) => s.koc_id).length;

  return (
    <div className="min-h-screen bg-purple-50/30">
      <NavBar user={null} role="merchant" title="Task Details" />
      <div className="max-w-4xl mx-auto px-6 py-8">

        {/* Task header */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  task.task_type === "urgent"
                    ? "bg-orange-100 text-orange-600"
                    : "bg-blue-100 text-blue-600"
                }`}>
                  {task.task_type === "urgent" ? "⚡ Urgent" : "🌊 Long-term"}
                </span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  task.task_status === "completed"
                    ? "bg-green-100 text-green-700"
                    : task.task_status === "disputed"
                    ? "bg-red-100 text-red-600"
                    : "bg-gray-100 text-gray-600"
                }`}>
                  {task.task_status}
                </span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">{task.product_name}</h1>
              <p className="text-sm text-gray-500 mt-1">
                Commission {task.commission || 0} pt/KOC · {kocFilled}/{task.koc_required || 1} KOCs
              </p>
            </div>

            {/* Ship button */}
            {["accepted"].includes(task.task_status) && (
              <div className="flex flex-col gap-2 w-64">
                {kocSlots.some((s: any) => s.status === "accepted" && s.accepted_at) && (
                  <DeadlineBadge
                    deadline={new Date(new Date(
                      kocSlots.find((s: any) => s.status === "accepted" && s.accepted_at)!.accepted_at
                    ).getTime() + 48 * 60 * 60 * 1000).toISOString()}
                    label="Shipment Deadline"
                    penalty="Late shipment: return KOC pledge + deduct 20 Trust Score"
                    size="sm"
                  />
                )}
                <input
                  type="text"
                  placeholder="Tracking Number"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-pink-200 outline-none"
                />
                {error && <p className="text-xs text-red-500">{error}</p>}
                <button
                  onClick={handleShip}
                  disabled={shipping}
                  className="btn-brand text-white text-sm py-2 px-4 rounded-lg font-semibold disabled:opacity-50"
                >
                  {shipping ? "Shipping..." : "📦 Confirm Shipment"}
                </button>
              </div>
            )}
          </div>

          {/* Tracking info */}
          {task.tracking_number && (
            <div className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
              📦 Tracking Number: <span className="font-mono font-medium">{task.tracking_number}</span>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white rounded-xl p-1 mb-6 w-fit border border-gray-100">
          <button
            onClick={() => setTab("progress")}
            className={`px-4 py-2 text-sm rounded-lg font-medium transition-all ${
              tab === "progress" ? "bg-pink-100 text-pink-700" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            📊 KOC Progress
          </button>
          <button
            onClick={() => setTab("report")}
            className={`px-4 py-2 text-sm rounded-lg font-medium transition-all ${
              tab === "report" ? "bg-pink-100 text-pink-700" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            📈 Data Report
          </button>
          <button
            onClick={() => { setTab("performance"); loadPerformance(); }}
            className={`px-4 py-2 text-sm rounded-lg font-medium transition-all ${
              tab === "performance" ? "bg-pink-100 text-pink-700" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            📊 Content Performance
          </button>
        </div>

        {/* Tab content */}
        {tab === "progress" && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <TaskProgress
                slots={kocSlots.map((s: any, i: number) => ({
                  slot_index: i,
                  koc_anon_id: s.koc_id ? `KOC-${s.koc_id.slice(0, 4).toUpperCase()}` : "-",
                  status: s.status || "unknown",
                  accepted_at: s.accepted_at || "",
                  shipped_at: s.shipped_at || "",
                  received_at: s.received_at || "",
                  submitted_at: s.submitted_at || "",
                  content_urls: s.content_urls || [],
                  created_at: task.created_at || "",
                  task_type: task.task_type || "",
                  revision_count: s.revision_count,
                  max_revisions: s.max_revisions,
                }))}
              />
            </div>

            {/* Review section for submitted/revision_requested/approved slots */}
            {kocSlots.filter((s: any) =>
              s.status === "submitted" || s.status === "revision_requested" || s.status === "approved"
            ).length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <h2 className="font-semibold text-gray-900 mb-4 text-lg">📋 Content Review</h2>
                <div className="space-y-4">
                  {kocSlots.map((s: any, i: number) => {
                    if (!["submitted", "revision_requested", "approved"].includes(s.status)) return null;
                    const isReviewing = reviewing[i] || false;
                    const dl = s.submitted_at
                      ? new Date(new Date(s.submitted_at).getTime() + 4 * 24 * 60 * 60 * 1000).toISOString()
                      : null;

                    return (
                      <div key={i} className={`border rounded-xl p-4 ${
                        s.status === "approved" ? "border-green-200 bg-green-50/30" :
                        s.status === "revision_requested" ? "border-orange-200 bg-orange-50/30" :
                        "border-gray-200"
                      }`}>
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-mono text-sm font-medium text-gray-700">
                            KOC-{(s.koc_id || "----").slice(0, 4).toUpperCase()}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              s.status === "approved" ? "bg-green-100 text-green-700" :
                              s.status === "revision_requested" ? "bg-orange-100 text-orange-600" :
                              "bg-blue-100 text-blue-600"
                            }`}>
                              {s.status === "approved" ? "✅ Approved" :
                               s.status === "revision_requested" ? "✏️ Rejected" :
                               "📩 Pending Review"}
                            </span>
                            {dl && s.status !== "approved" && (
                              <DeadlineBadge
                                deadline={dl}
                                label="Review Deadline"
                                penalty="Auto-approve after 4 days"
                                size="sm"
                              />
                            )}
                          </div>
                        </div>

                        {/* Content URLs */}
                        {s.content_urls && s.content_urls.length > 0 && (
                          <div className="space-y-1 mb-3">
                            {s.content_urls.map((url: string, j: number) => (
                              <a key={j} href={url} target="_blank" rel="noopener noreferrer"
                                 className="block text-sm text-pink-500 hover:text-pink-600 truncate">
                                🔗 {url}
                              </a>
                            ))}
                          </div>
                        )}

                        {/* Rejection feedback */}
                        {s.status === "revision_requested" && s.review_feedback && (
                          <div className="mb-3 p-3 bg-white rounded-lg text-sm">
                            <span className="text-xs text-gray-400">Rejection Reason: </span>
                            <span className="text-gray-700">{s.review_feedback}</span>
                          </div>
                        )}

                        {/* Approve / Reject buttons */}
                        {(s.status === "submitted" || s.status === "revision_requested") && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleReview(i, "approve")}
                              disabled={isReviewing}
                              className="flex-1 bg-green-500 text-white py-2 rounded-lg font-semibold text-sm hover:bg-green-600 transition-colors disabled:opacity-50"
                            >
                              {isReviewing ? "Processing..." : "✅ Approve"}
                            </button>
                            <button
                              onClick={() => handleReview(i, "reject")}
                              disabled={isReviewing}
                              className="flex-1 bg-red-500 text-white py-2 rounded-lg font-semibold text-sm hover:bg-red-600 transition-colors disabled:opacity-50"
                            >
                              {isReviewing ? "Processing..." : "❌ Reject"}
                            </button>
                          </div>
                        )}

                        {/* Auto-approved note */}
                        {s.status === "approved" && (s as any).auto_approved && (
                          <p className="text-xs text-gray-400 mt-2">
                            ⚠️ Auto-approved (merchant review timeout)
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "report" && report && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">📈 Data Report</h2>

            {/* Summary stats */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold brand-gradient-text">{report.submitted_slots}/{report.total_slots}</div>
                <div className="text-xs text-gray-500 mt-1">Submitted</div>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold brand-gradient-text">{report.total_content_urls}</div>
                <div className="text-xs text-gray-500 mt-1">Content Links</div>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold brand-gradient-stat">{report.total_commission_paid}</div>
                <div className="text-xs text-gray-500 mt-1">Commission Settled</div>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-gray-900">{report.koc_filled}/{report.koc_required}</div>
                <div className="text-xs text-gray-500 mt-1">KOC Filled</div>
              </div>
            </div>

            {/* Per-KOC report */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Per-KOC Details</h3>
              {(report.koc_reports || []).map((kr: any) => (
                <div key={kr.slot_index} className="border border-gray-100 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-sm font-medium text-gray-700">{kr.koc_anon_id}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      kr.status === "submitted"
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-500"
                    }`}>
                      {kr.status}
                    </span>
                  </div>
                  {kr.content_urls && kr.content_urls.length > 0 && (
                    <div className="space-y-1">
                      {kr.content_urls.map((url: string, i: number) => (
                        <a
                          key={i}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-sm text-pink-500 hover:text-pink-600 truncate"
                        >
                          🔗 {url}
                        </a>
                      ))}
                    </div>
                  )}
                  {(!kr.content_urls || kr.content_urls.length === 0) && (
                    <p className="text-xs text-gray-400">No content links yet</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "performance" && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">📊 Content Performance</h2>

            {!performance ? (
              <div className="text-center py-10 text-gray-400">Loading...</div>
            ) : performance.summary?.total_views === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <p className="text-lg mb-2">No performance data yet</p>
                <p className="text-sm">KOCs can update views, likes and other metrics after submitting content</p>
              </div>
            ) : (
              <>
                {/* Summary cards */}
                <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-6">
                  {[
                    { label: "Total Views", value: (performance.summary?.total_views || 0).toLocaleString(), icon: "👁️" },
                    { label: "Total Likes", value: (performance.summary?.total_likes || 0).toLocaleString(), icon: "❤️" },
                    { label: "Total Comments", value: (performance.summary?.total_comments || 0).toLocaleString(), icon: "💬" },
                    { label: "Total Shares", value: (performance.summary?.total_shares || 0).toLocaleString(), icon: "🔄" },
                    { label: "Total Conversions", value: (performance.summary?.total_conversions || 0).toLocaleString(), icon: "💰" },
                    { label: "Avg Engagement Rate", value: `${performance.summary?.average_engagement_rate || 0}%`, icon: "📈" },
                  ].map(({ label, value, icon }) => (
                    <div key={label} className="bg-gray-50 rounded-xl p-3 text-center">
                      <div className="text-lg mb-1">{icon}</div>
                      <div className="text-lg font-bold text-gray-900">{value}</div>
                      <div className="text-xs text-gray-500">{label}</div>
                    </div>
                  ))}
                </div>

                {/* Revenue callout */}
                {(performance.summary?.total_revenue || 0) > 0 && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 text-center">
                    <span className="text-green-700 font-bold text-lg">
                      💵 Attributed Revenue: ${(performance.summary?.total_revenue || 0).toLocaleString()}
                    </span>
                  </div>
                )}

                {/* Per-KOC breakdown */}
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Per-KOC Performance</h3>
                <div className="space-y-3">
                  {(performance.slots || []).map((s: any) => (
                    <div key={s.slot_index} className="border border-gray-100 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-mono text-sm font-medium text-gray-700">{s.koc_anon_id}</span>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            s.status === "approved" ? "bg-green-100 text-green-700" :
                            s.status === "submitted" ? "bg-blue-100 text-blue-600" :
                            "bg-gray-100 text-gray-500"
                          }`}>{s.status}</span>
                          {s.metrics?.engagement_rate > 0 && (
                            <span className="text-xs font-bold text-pink-600">
                              {s.metrics.engagement_rate}% Engagement Rate
                            </span>
                          )}
                        </div>
                      </div>

                      {s.metrics?.views > 0 ? (
                        <div className="grid grid-cols-4 gap-2 mb-2">
                          {[
                            { label: "Views", value: s.metrics.views },
                            { label: "Likes", value: s.metrics.likes },
                            { label: "Comments", value: s.metrics.comments },
                            { label: "Shares", value: s.metrics.shares },
                          ].map(({ label, value }) => (
                            <div key={label} className="bg-gray-50 rounded-lg p-2 text-center">
                              <div className="text-sm font-bold text-gray-800">{(value || 0).toLocaleString()}</div>
                              <div className="text-xs text-gray-400">{label}</div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400 mb-2">No performance data yet</p>
                      )}

                      {s.content_urls?.length > 0 && (
                        <div className="space-y-1 mt-2 pt-2 border-t border-gray-50">
                          {s.content_urls.map((url: string, i: number) => (
                            <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                               className="block text-xs text-pink-500 hover:text-pink-600 truncate">
                              🔗 {url}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
