"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { tasks, getToken, getRole } from "@/lib/api";

export default function KocMyTasksPage() {
  const router = useRouter();
  const token = getToken();
  const role = getRole();

  const [myTasks, setMyTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("active");

  useEffect(() => {
    if (!token || role !== "koc") {
      router.push("/login");
      return;
    }
    loadMyTasks();
  }, []);

  async function loadMyTasks() {
    setLoading(true);
    try {
      const data = await tasks.mine(token!);
      setMyTasks(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Failed to load tasks:", e);
    } finally {
      setLoading(false);
    }
  }

  if (!token || role !== "koc") return null;

  const filtered = myTasks.filter((t: any) => {
    const status = t.my_slot?.status || t.task?.task_status;
    if (filter === "active") return !["completed", "rejected", "timed_out"].includes(status);
    if (filter === "completed") return status === "completed";
    return true;
  });

  const STATUS_LABELS: Record<string, { label: string; color: string }> = {
    assigned: { label: "待接单", color: "bg-yellow-100 text-yellow-700" },
    accepted: { label: "待发货", color: "bg-blue-100 text-blue-700" },
    shipped: { label: "待收货", color: "bg-purple-100 text-purple-700" },
    received: { label: "待创作", color: "bg-indigo-100 text-indigo-700" },
    creating: { label: "创作中", color: "bg-orange-100 text-orange-700" },
    submitted: { label: "已完成", color: "bg-green-100 text-green-700" },
    completed: { label: "已完成", color: "bg-green-100 text-green-700" },
  };

  return (
    <div className="min-h-screen bg-orange-50/30">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">📋 我的任务</h1>
            <p className="text-sm text-gray-500 mt-1">已接的任务和进度</p>
          </div>
          <button
            onClick={() => router.push("/portal/hall")}
            className="text-sm font-medium text-pink-500 hover:text-pink-600"
          >
            🏪 去任务广场 →
          </button>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 bg-white rounded-xl p-1 mb-6 w-fit border border-gray-100">
          {[
            { key: "active", label: "进行中" },
            { key: "completed", label: "已完成" },
            { key: "all", label: "全部" },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-4 py-2 text-sm rounded-lg font-medium transition-all ${
                filter === f.key ? "bg-pink-100 text-pink-700" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-20 text-gray-400">加载中...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-400 text-lg mb-2">暂无任务</p>
            <button
              onClick={() => router.push("/portal/hall")}
              className="text-sm text-pink-500 hover:text-pink-600 font-medium"
            >
              去任务广场接单 →
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((t: any, idx: number) => {
              const task = t.task || t;
              const slot = t.my_slot || {};
              const status = slot.status || task.task_status || "unknown";
              const st = STATUS_LABELS[status] || { label: status, color: "bg-gray-100 text-gray-500" };

              return (
                <div
                  key={idx}
                  onClick={() => router.push(`/portal/tasks/${task.id || task.task_id}`)}
                  className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md hover:border-pink-200 transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900">{task.product_name}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${st.color}`}>
                          {st.label}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">
                        佣金 {task.commission || 0} 点 · 质押 {task.pledge_koc || 0} 点
                        {slot.accepted_at && ` · ${new Date(slot.accepted_at).toLocaleDateString()} 接单`}
                      </p>
                    </div>
                    <span className="text-gray-300">→</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
