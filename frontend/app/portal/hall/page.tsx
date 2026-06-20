"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { tasks, getToken, getRole, getConsolePath, auth } from "@/lib/api";
import TaskCard from "@/components/TaskCard";
import NavBar from "@/components/NavBar";

const TABS = [
  { key: "", label: "All" },
  { key: "recommended", label: "Recommended" },
  { key: "urgent", label: "⚡ Urgent" },
  { key: "long_term", label: "🌊 Long-term" },
];

const SORT_OPTIONS = [
  { key: "default", label: "Relevance" },
  { key: "newest", label: "Newest" },
  { key: "commission", label: "Highest Commission" },
  { key: "urgency", label: "Most Urgent" },
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
  const [region, setRegion] = useState("");

  const [regionReady, setRegionReady] = useState(false);

  useEffect(() => {
    auth.me(token!).then((u) => {
      setUser(u);
      // Default to KOC's own region
      const kp = (u as any).koc_profile;
      if (kp?.region) {
        setRegion(kp.region);
      }
      setRegionReady(true);
    }).catch(() => {
      setRegionReady(true);
    });
  }, []);

  useEffect(() => {
    if (!regionReady) return;
    loadTasks();
  }, [activeTab, sortBy, region, regionReady]);

  async function loadTasks() {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (activeTab && activeTab !== "recommended") params.task_type = activeTab;
      if (sortBy !== "default") params.sort_by = sortBy;
      if (category) params.category = category;
      if (commissionMin > 0) params.commission_min = String(commissionMin);
      if (region) params.region = region;

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
      <NavBar user={user} role="koc" title="Task Hall" />

      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">🏪 Task Hall</h1>
              <p className="text-sm text-gray-500 mt-1">Discover opportunities, accept tasks to earn points</p>
            </div>
            <button
              onClick={() => router.push("/portal/tasks")}
              className="text-sm font-medium text-pink-500 hover:text-pink-600 transition-colors"
            >
              My Tasks →
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
              placeholder="Search category..."
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && loadTasks()}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 w-36"
            />

            {/* Region filter */}
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700"
            >
              <option value="">🌍 All Regions</option>
              <option value="US">🇺🇸 US</option>
              <option value="UK">🇬🇧 UK</option>
              <option value="CA">🇨🇦 CA</option>
              <option value="AU">🇦🇺 AU</option>
              <option value="EU">🇪🇺 EU</option>
              <option value="JP">🇯🇵 JP</option>
              <option value="KR">🇰🇷 KR</option>
              <option value="SEA">🌏 SEA</option>
              <option value="CN">🇨🇳 CN</option>
            </select>

            {/* Commission min */}
            <select
              value={commissionMin}
              onChange={(e) => {
                setCommissionMin(Number(e.target.value));
              }}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700"
            >
              <option value="0">Any Commission</option>
              <option value="20">≥20 pt</option>
              <option value="30">≥30 pt</option>
              <option value="50">≥50 pt</option>
            </select>

            <button
              onClick={loadTasks}
              className="text-sm px-3 py-1.5 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors"
            >
              Filter
            </button>
          </div>
        </div>
      </div>

      {/* Task cards */}
      <div className="max-w-4xl mx-auto px-6 py-6">
        {loading ? (
          <div className="text-center py-20 text-gray-400">Loading...</div>
        ) : taskList.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-400 text-lg mb-2">No tasks yet</p>
            <p className="text-gray-300 text-sm">Try different filters</p>
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
