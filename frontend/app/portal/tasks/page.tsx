"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { tasks, getToken, getRole, getConsolePath } from "@/lib/api";
import NavBar from "@/components/NavBar";

export default function KocMyTasksPage() {
  const router = useRouter();

  const [authorized, setAuthorized] = useState(false);
  const [myTasks, setMyTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("active");

  useEffect(() => {
    const t = getToken();
    const r = getRole();
    if (!t) { router.push("/login"); return; }
    if (r && r !== "koc") { router.push(getConsolePath(r || "")); return; }
    setAuthorized(true);
    loadMyTasks();
  }, []);

  async function loadMyTasks() {
    setLoading(true);
    try {
      const data = await tasks.mine(getToken()!);
      setMyTasks(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Failed to load tasks:", e);
    } finally {
      setLoading(false);
    }
  }

  const filtered = myTasks.filter((t: any) => {
    const status = t.my_slot?.status || t.task?.task_status;
    if (filter === "active") return !["completed", "rejected", "timed_out"].includes(status);
    if (filter === "completed") return status === "completed";
    return true;
  });

  const STATUS_LABELS: Record<string, { label: string; color: string }> = {
    assigned: { label: "Awaiting Acceptance", color: "bg-yellow-100 text-yellow-700" },
    accepted: { label: "Awaiting Shipment", color: "bg-blue-100 text-blue-700" },
    shipped: { label: "Awaiting Receipt", color: "bg-purple-100 text-purple-700" },
    received: { label: "Awaiting Content", color: "bg-indigo-100 text-indigo-700" },
    creating: { label: "Creating", color: "bg-orange-100 text-orange-700" },
    submitted: { label: "Completed", color: "bg-green-100 text-green-700" },
    completed: { label: "Completed", color: "bg-green-100 text-green-700" },
  };

  return (
    <div className="min-h-screen bg-orange-50/30">
      <NavBar user={null} role="koc" title="My Tasks" />
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">📋 My Tasks</h1>
            <p className="text-sm text-gray-500 mt-1">Accepted tasks and progress</p>
          </div>
          <button
            onClick={() => router.push("/portal/hall")}
            className="text-sm font-medium text-pink-500 hover:text-pink-600"
          >
            🏪 Go to Task Hall →
          </button>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 bg-white rounded-xl p-1 mb-6 w-fit border border-gray-100">
          {[
            { key: "active", label: "Active" },
            { key: "completed", label: "Completed" },
            { key: "all", label: "All" },
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

        {!authorized || loading ? (
          <div className="text-center py-20 text-gray-400">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-400 text-lg mb-2">No tasks yet</p>
            <button
              onClick={() => router.push("/portal/hall")}
              className="text-sm text-pink-500 hover:text-pink-600 font-medium"
            >
              Find tasks in Task Hall →
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
                  className="bg-white rounded-2xl border border-gray-100 hover:shadow-md hover:border-pink-200 transition-all cursor-pointer group overflow-hidden"
                >
                  <div className="p-5">
                    {/* Top row: Product name + status */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 flex-wrap min-w-0">
                        <h3 className="font-bold text-gray-900 group-hover:text-pink-600 transition-colors truncate text-lg">
                          {task.product_name || "Unnamed Product"}
                        </h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${st.color}`}>
                          {st.label}
                        </span>
                        {task.task_type === "urgent" && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-600 font-medium shrink-0">⚡ Urgent</span>
                        )}
                      </div>
                      <span className="text-gray-300 group-hover:text-pink-400 transition-colors shrink-0 ml-2 text-lg">→</span>
                    </div>

                    {/* Description */}
                    {task.product_description && (
                      <p className="text-sm text-gray-500 mb-3 line-clamp-2 leading-relaxed">
                        {(task.product_description as string)}
                      </p>
                    )}

                    {/* Info badges */}
                    <div className="flex flex-wrap gap-2 mb-3">
                      {task.product_target_market && (
                        <span className="text-xs px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-semibold border border-emerald-100">
                          🌍 {task.product_target_market}
                        </span>
                      )}
                      {task.product_category && (
                        <span className="text-xs px-2.5 py-1 rounded-lg bg-purple-50 text-purple-600 font-medium">
                          {task.product_category}
                        </span>
                      )}
                      {task.merchant_company && (
                        <span className="text-xs px-2.5 py-1 rounded-lg bg-blue-50 text-blue-600 font-medium">
                          🏢 {task.merchant_company}
                        </span>
                      )}
                      {task.merchant_avg_rating > 0 && (
                        <span className="text-xs px-2.5 py-1 rounded-lg bg-amber-50 text-amber-600 font-medium">
                          ⭐ {Number(task.merchant_avg_rating).toFixed(1)}
                        </span>
                      )}
                    </div>

                    {/* Commission & Pledge row */}
                    <div className="flex items-center gap-4 text-sm mb-3">
                      <span className="font-bold text-pink-600 text-lg">${task.commission || 0}</span>
                      <span className="text-gray-400 text-xs">Commission</span>
                      <span className="text-gray-300">|</span>
                      <span className="text-gray-700 font-medium">{task.pledge_koc || 0} pt</span>
                      <span className="text-gray-400 text-xs">Pledge</span>
                    </div>

                    {/* Links */}
                    <div className="flex flex-wrap gap-3 pt-3 border-t border-gray-100">
                      {task.product_url && (
                        <a
                          href={task.product_url as string}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-xs text-pink-500 hover:text-pink-600 font-medium underline underline-offset-2"
                        >
                          🔗 Product Page ↗
                        </a>
                      )}
                      {task.product_id && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/portal/products/${task.product_id}`);
                          }}
                          className="text-xs text-pink-500 hover:text-pink-600 font-medium underline underline-offset-2"
                        >
                          📦 Product Details →
                        </button>
                      )}
                      {slot.accepted_at && (
                        <span className="text-xs text-gray-400 ml-auto">
                          {new Date(slot.accepted_at).toLocaleDateString()} Accepted
                        </span>
                      )}
                    </div>
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
