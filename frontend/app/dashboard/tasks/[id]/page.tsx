"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { tasks, getToken, getRole } from "@/lib/api";
import TaskProgress from "@/components/TaskProgress";

export default function MerchantTaskDetailPage() {
  const router = useRouter();
  const params = useParams();
  const taskId = params.id as string;
  const token = getToken();
  const role = getRole();

  const [task, setTask] = useState<any>(null);
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"progress" | "report">("progress");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [shipping, setShipping] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token || role !== "merchant") {
      router.push("/login");
      return;
    }
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

  async function handleShip() {
    if (!trackingNumber.trim()) {
      setError("请输入物流单号");
      return;
    }
    setShipping(true);
    setError("");
    try {
      await tasks.ship(taskId, trackingNumber.trim(), token!);
      await loadTask();
    } catch (e: any) {
      setError(e.message || "发货失败");
    } finally {
      setShipping(false);
    }
  }

  if (!token || role !== "merchant") return null;
  if (loading) return <div className="text-center py-20 text-gray-400">加载中...</div>;
  if (!task) return <div className="text-center py-20 text-gray-400">任务不存在</div>;

  const kocSlots = task.koc_slots || [];
  const kocFilled = kocSlots.filter((s: any) => s.koc_id).length;

  return (
    <div className="min-h-screen bg-purple-50/30">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <button onClick={() => router.back()} className="text-sm text-gray-400 hover:text-gray-600 mb-4 inline-block">
          ← 返回
        </button>

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
                  {task.task_type === "urgent" ? "⚡ 加急" : "🌊 长线"}
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
                佣金 {task.commission || 0} 点/KOC · {kocFilled}/{task.koc_required || 1} 人
              </p>
            </div>

            {/* Ship button */}
            {["accepted"].includes(task.task_status) && (
              <div className="flex flex-col gap-2 w-64">
                <input
                  type="text"
                  placeholder="物流单号"
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
                  {shipping ? "发货中..." : "📦 确认发货"}
                </button>
              </div>
            )}
          </div>

          {/* Tracking info */}
          {task.tracking_number && (
            <div className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
              📦 物流单号：<span className="font-mono font-medium">{task.tracking_number}</span>
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
            📊 KOC 进度
          </button>
          <button
            onClick={() => setTab("report")}
            className={`px-4 py-2 text-sm rounded-lg font-medium transition-all ${
              tab === "report" ? "bg-pink-100 text-pink-700" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            📈 数据报表
          </button>
        </div>

        {/* Tab content */}
        {tab === "progress" && (
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
              }))}
            />
          </div>
        )}

        {tab === "report" && report && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">📈 数据报表</h2>

            {/* Summary stats */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold brand-gradient-text">{report.submitted_slots}/{report.total_slots}</div>
                <div className="text-xs text-gray-500 mt-1">已提交</div>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold brand-gradient-text">{report.total_content_urls}</div>
                <div className="text-xs text-gray-500 mt-1">内容链接</div>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold brand-gradient-stat">{report.total_commission_paid}</div>
                <div className="text-xs text-gray-500 mt-1">已结算佣金</div>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-gray-900">{report.koc_filled}/{report.koc_required}</div>
                <div className="text-xs text-gray-500 mt-1">KOC 填充</div>
              </div>
            </div>

            {/* Per-KOC report */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">各 KOC 详情</h3>
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
                    <p className="text-xs text-gray-400">暂无内容链接</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
