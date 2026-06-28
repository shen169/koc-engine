"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { tasks, api, auth, getToken, clearToken } from "@/lib/api";
import Spark from "@/components/Spark";

const STATUS_COLORS: Record<string, string> = {
  open: "bg-blue-50 text-blue-700",
  in_progress: "bg-amber-50 text-amber-700",
  completed: "bg-emerald-50 text-emerald-700",
  disputed: "bg-red-50 text-red-700",
  cancelled: "bg-zinc-100 text-zinc-500",
};
const TYPE_COLORS: Record<string, string> = {
  urgent: "bg-red-50 text-red-700",
  long_term: "bg-purple-50 text-purple-700",
};

function slotSummary(slots: Array<Record<string, unknown>> | undefined): string {
  if (!slots || slots.length === 0) return "0 slots";
  const total = slots.length;
  const filled = slots.filter((s) => s.koc_id).length;
  const completed = slots.filter(
    (s) => s.status === "completed" || s.status === "approved"
  ).length;
  return `${filled}/${total} filled · ${completed} done`;
}

export default function AdminTasks() {
  const router = useRouter();
  const [list, setList] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) { router.push("/login"); return; }
    auth.me(token).then((u) => {
      if (u.role !== "admin") { router.push("/dashboard"); return; }
      tasks.list(token).then(setList).catch(() => {}).finally(() => setLoading(false));
    }).catch(() => { clearToken(); router.push("/login"); });
  }, [router]);

  return (
    <div className="min-h-screen bg-zinc-50">
      <nav className="bg-white border-b border-zinc-100 h-14 flex items-center px-6 shadow-sm gap-4">
        <Link href="/admin" className="text-pink-500 text-sm font-semibold hover:underline">&larr; Admin</Link>
        <h1 className="font-extrabold text-zinc-900">Tasks ({list.length})</h1>
        <span className="ml-auto text-xs text-zinc-400">
          All tasks published by merchants — click for detail
        </span>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {loading ? (
          <div className="text-center py-12">
            <Spark size={32} className="mx-auto opacity-30" />
          </div>
        ) : list.length === 0 ? (
          <div className="text-center py-12">
            <Spark size={32} className="mx-auto opacity-30" />
            <p className="text-zinc-400 text-sm mt-2">No tasks yet. Tasks will appear here once merchants publish them.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {list.map((t) => {
              const slots = t.koc_slots as Array<Record<string, unknown>> | undefined;
              return (
                <Link
                  key={t.id as string}
                  href={`/admin/tasks/${t.id}`}
                  className="bg-white rounded-xl border border-zinc-100 p-4 flex justify-between items-center hover:shadow-md transition"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-zinc-900 truncate">
                        {t.product_name as string || "Task"}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${TYPE_COLORS[t.task_type as string] || "bg-zinc-50 text-zinc-600"}`}>
                        {t.task_type as string || "—"}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${STATUS_COLORS[t.task_status as string] || "bg-zinc-50 text-zinc-600"}`}>
                        {t.task_status as string || "—"}
                      </span>
                    </div>
                    <div className="text-xs text-zinc-400 mt-1">
                      <span>{slotSummary(slots)}</span>
                      <span className="mx-2">·</span>
                      <span>Commission: {t.commission as number || 0}pt</span>
                      {t.task_type === "urgent" && (
                        <>
                          <span className="mx-2">·</span>
                          <span>Auto-match</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <span className="text-xs text-zinc-400">
                      ID: {(t.id as string)?.slice(0, 8)}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
