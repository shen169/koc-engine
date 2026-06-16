"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { tasks, getToken, getRole, getConsolePath, auth } from "@/lib/api";
import TaskCard from "@/components/TaskCard";
import NavBar from "@/components/NavBar";

const TABS = [
  { key: "", label: "全部" },
  { key: "recommended", label: "推荐" },
  { key: "urgent", label: "⚡ 加急" },
  { key: "long_term", label: "🌊 长线" },
];

const SORT_OPTIONS = [
  { key: "default", label: "综合排序" },
  { key: "newest", label: "最新发布" },
  { key: "commission", label: "佣金最高" },
  { key: "urgency", label: "紧急优先" },
];

export default function TaskHallPage() {
  const router = useRouter();

  // Role guard — redirect non-KOC users
  const token = getToken();
  const role = getRole();
  if (!token) { router.push("/login"); return null; }
  if (role && role !== "koc") { router.push(getConsolePath(role || "")); return null; }

  const [user, setUser] = useState<{ email?: string } | null>(null);
  const [taskList, setTaskList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("");
  const [sortBy, setSortBy] = useState("default");
  const [category, setCategory] = useState("");
  const [commissionMin, setCommissionMin] = useState(0);

  useEffect(() => {
    auth.me(token!).then(setUser).catch(() => {});
    loadTasks();
  }, [activeTab, sortBy]);

  async function loadTasks() {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (activeTab) params.task_type = activeTab;
      if (sortBy !== "default") params.sort_by = sortBy;
      if (category) params.category = category;
      if (commissionMin > 0) params.commission_min = String(commissionMin);

      const data = await tasks.hall(token!, params);
      setTaskList(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Failed to load task hall:", e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-orange-50/30">
      <NavBar user={user} role="koc" title="任务广场" />

      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">🏪 任务广场</h1>
              <p className="text-sm text-gray-500 mt-1">发现合作机会，接单赚点数</p>
            </div>
            <button
              onClick={() => router.push("/portal/tasks")}
              className="text-sm font-medium text-pink-500 hover:text-pink-600 transition-colors"
            >
              我的任务 →
            </button>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Tabs */}
            <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-all ${
                    activeTab === tab.key
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.key} value={o.key}>{o.label}</option>
              ))}
            </select>

            {/* Category search */}
            <input
              type="text"
              placeholder="搜索品类..."
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && loadTasks()}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 w-36"
            />

            {/* Commission min */}
            <select
              value={commissionMin}
              onChange={(e) => {
                setCommissionMin(Number(e.target.value));
              }}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700"
            >
              <option value="0">佣金不限</option>
              <option value="20">≥20 点</option>
              <option value="30">≥30 点</option>
              <option value="50">≥50 点</option>
            </select>

            <button
              onClick={loadTasks}
              className="text-sm px-3 py-1.5 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors"
            >
              筛选
            </button>
          </div>
        </div>
      </div>

      {/* Task cards */}
      <div className="max-w-4xl mx-auto px-6 py-6">
        {loading ? (
          <div className="text-center py-20 text-gray-400">加载中...</div>
        ) : taskList.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-400 text-lg mb-2">暂无任务</p>
            <p className="text-gray-300 text-sm">换个筛选条件试试</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {taskList.map((t) => (
              <TaskCard key={t.task_id} task={t} mode="hall" token={token!} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
