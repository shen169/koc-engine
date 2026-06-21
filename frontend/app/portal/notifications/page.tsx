"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Spark from "@/components/Spark";
import { notifications, getToken } from "@/lib/api";

export default function NotificationsPage() {
  const [list, setList] = useState<Array<Record<string, unknown>>>([]);
  useEffect(() => {
    const t = getToken();
    if (!t) return;
    notifications.list(t).then(setList).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-orange-50/40">
      <div className="max-w-2xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-extrabold text-zinc-900 mb-6">🔔 Notifications</h1>
        {list.length === 0 ? (
          <div className="text-center py-12"><Spark size={32} className="mx-auto opacity-30" /><p className="text-zinc-400 text-sm mt-2">No notifications</p></div>
        ) : (
          <div className="space-y-2">
            {list.map((n) => (
              <Link key={n.id as string} href={n.resource_path as string || "#"}
                className={`block bg-white rounded-xl border p-4 hover:shadow transition ${!n.read ? "border-pink-200" : "border-zinc-100"}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-sm text-zinc-900">{n.title as string}</p>
                    <p className="text-xs text-zinc-500 mt-1">{n.message as string}</p>
                  </div>
                  <span className="text-[10px] text-zinc-400">{new Date(n.created_at as string).toLocaleDateString()}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
