"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { tasks, getToken, getRole } from "@/lib/api";
import TaskCard from "@/components/TaskCard";

export default function MerchantTasksPage() {
  const router = useRouter();
  const token = getToken();
  const role = getRole();

  const [taskList, setTaskList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    if (!token || role !== "merchant") {
      router.push("/login");
      return;
    }
    loadTasks();
  }, []);

  async function loadTasks() {
    setLoading(true);
    try {
      const data = await tasks.mine(token!);
      setTaskList(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Failed to load tasks:", e);
    } finally {
      setLoading(false);
    }
  }

  if (!token || role !== "merchant") return null;

  const statusCounts = {
    all: taskList.length,
    pending: taskList.filter((t: any) => t.task_status === "pending" || t.task_status === "assigned").length,
    active: taskList.filter((t: any) =>
      ["accepted", "shipped", "creating"].includes(t.task_status)
    ).length,
    completed: taskList.filter((t: any) => t.task_status === "completed").length,
  };

  const FILTER_TABS = [
    { key: "", label: `全部 (${statusCounts.all})` },
    { key: "pending", label: `待匹配 (${statusCounts.pending})` },
    { key: "active", label: `进行中 (${statusCounts.active})` },
    { key: "completed", label: `已完成 (${statusCounts.completed})` },
  ];

  const filtered = filter
    ? taskList.filter((t: any) => {
        if (filter === "active") return ["accepted", "shipped", "creating"].includes(t.task_status);
        if (filter === "pending") return t.task_status === "pending" || t.task_status === "assigned";
        return t.task_status === filter;
      })
    : taskList;

  return (
    <div className="min-h-screen bg-purple-50/30">
      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">📋 任务管理</h1>
              <p className="text-sm text-gray-500 mt-1">管理你的推广任务和 KOC 合作</p>
            </div>
            <button
              onClick={() => router.push("/dashboard/tasks/new")}
              className="btn-brand text-white px-5 py-2.5 rounded-xl text-sm font-semibold"
            >
              + 发布新任务
            </button>
          </div>

          {/* Filter tabs */}
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`px-4 py-1.5 text-sm rounded-lg font-medium transition-all ${
                  filter === tab.key
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Task list */}
      <div className="max-w-5xl mx-auto px-6 py-6">
        {loading ? (
          <div className="text-center py-20 text-gray-400">加载中...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-400 text-lg mb-2">暂无任务</p>
            <button
              onClick={() => router.push("/dashboard/tasks/new")}
              className="text-sm text-pink-500 hover:text-pink-600 font-medium"
            >
              发布第一个任务 →
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {filtered.map((t: any) => (
              <TaskCard
                key={t.id || t.task_id}
                task={{
                  task_id: t.id || t.task_id,
                  product_name: t.product_name,
                  product_asin: t.product_asin || "",
                  task_type: t.task_type || "long_term",
                  task_status: t.task_status || "pending",
                  commission: t.commission || 0,
                  koc_required: t.koc_required || 1,
                  koc_filled: (t.koc_slots || []).filter((s: any) => s.koc_id).length,
                  pledge_koc: t.pledge_koc || 0,
                  merchant_id: t.merchant_id || "",
                  created_at: t.created_at || "",
                }}
                mode="merchant"
                token={token!}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
