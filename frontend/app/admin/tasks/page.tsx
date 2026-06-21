"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { tasks, getToken } from "@/lib/api";
import Spark from "@/components/Spark";

export default function AdminTasks() {
  const [list, setList] = useState<Array<Record<string, unknown>>>([]);
  const [showNew, setShowNew] = useState(false);
  const [newTask, setNewTask] = useState({ koc_id: "", product_name: "", product_id: "", credits_reward: 30, due_at: "" });

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    tasks.list(token).then(setList).catch(() => {});
  }, []);

  async function createTask() {
    const token = getToken();
    if (!token) return;
    await tasks.create(newTask, token);
    setShowNew(false);
    tasks.list(token).then(setList).catch(() => {});
  }

  async function confirmTask(taskId: string) {
    const token = getToken();
    if (!token) return;
    await tasks.confirm(taskId, token);
    tasks.list(token).then(setList).catch(() => {});
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b px-6 py-3 flex justify-between items-center">
        <div className="flex gap-4 items-center">
          <Link href="/admin" className="text-indigo-600 text-sm hover:underline">&larr; Admin</Link>
          <h1 className="font-bold text-slate-900">Task Management</h1>
        </div>
        <button onClick={() => setShowNew(!showNew)} className="px-3 py-1.5 bg-indigo-600 text-white rounded text-sm">
          + New Task
        </button>
      </nav>

      <div className="max-w-4xl mx-auto p-6">
        {list.length === 0 && !showNew ? (
          <div className="text-center py-12">
            <Spark size={32} className="mx-auto opacity-30" />
            <p className="text-zinc-400 text-sm mt-2">No tasks yet. Tasks will appear here once merchants publish them.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-100 p-5 mb-6">
            <h3 className="font-semibold mb-3">Create Task</h3>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <input placeholder="KOC ID" value={newTask.koc_id} onChange={(e) => setNewTask({...newTask, koc_id: e.target.value})}
                className="px-3 py-2 border rounded-lg text-sm" />
              <input placeholder="Product Name" value={newTask.product_name} onChange={(e) => setNewTask({...newTask, product_name: e.target.value})}
                className="px-3 py-2 border rounded-lg text-sm" />
              <input placeholder="Product ID" value={newTask.product_id} onChange={(e) => setNewTask({...newTask, product_id: e.target.value})}
                className="px-3 py-2 border rounded-lg text-sm" />
              <input type="number" placeholder="Credits Reward" value={newTask.credits_reward} onChange={(e) => setNewTask({...newTask, credits_reward: parseInt(e.target.value)})}
                className="px-3 py-2 border rounded-lg text-sm" />
            </div>
            <button onClick={createTask} className="px-4 py-2 bg-indigo-600 text-white rounded text-sm">Create</button>
          </div>
        )}

        <div className="space-y-3">
          {list.map((t) => (
            <div key={t.id as string} className="bg-white rounded-xl border border-slate-100 p-4 flex justify-between items-center">
              <div>
                <span className="font-semibold text-slate-900">{t.product_name as string || "Task"}</span>
                <div className="text-xs text-slate-400">{t.koc_id as string} · {t.sample_status as string} · {t.submit_url ? "✓ Submitted" : "No submission"}</div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-2 py-0.5 rounded-full text-xs ${t.delivered ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                  {t.delivered ? "Delivered" : "Pending"}
                </span>
                {!t.delivered && (t.submit_url as string) && (
                  <button onClick={() => confirmTask(t.id as string)} className="px-3 py-1 bg-green-600 text-white rounded text-xs">
                    Confirm Delivery
                  </button>
                )}
              </div>
            </div>
         ))}
        </div>
      </div>
    </div>
  );
}
