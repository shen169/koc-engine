"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Spark from "@/components/Spark";
import { notifications, getToken } from "@/lib/api";

const TYPE_ICONS: Record<string, string> = {
  task_accepted: "🤝",
  task_declined: "❌",
  task_shipped: "📦",
  receipt_confirmed: "✅",
  receipt_auto: "🤖",
  content_submitted: "📝",
  content_approved: "🎉",
  content_revision: "✏️",
  content_ai_overrule: "⚖️",
  auto_approved: "⏰",
  violation: "🚨",
  application_approved: "🌟",
  interest_received: "💡",
  koc_matched: "🎯",
  tier_changed: "🏆",
  task_rematched: "🔄",
  deadline_warning: "⚠️",
  platform_announcement: "📢",
};

const TYPE_COLORS: Record<string, string> = {
  task_accepted: "border-l-blue-400",
  task_declined: "border-l-red-400",
  task_shipped: "border-l-green-400",
  receipt_confirmed: "border-l-emerald-400",
  receipt_auto: "border-l-slate-400",
  content_submitted: "border-l-indigo-400",
  content_approved: "border-l-emerald-400",
  content_revision: "border-l-amber-400",
  content_ai_overrule: "border-l-purple-400",
  auto_approved: "border-l-teal-400",
  violation: "border-l-red-500",
  application_approved: "border-l-pink-400",
  interest_received: "border-l-cyan-400",
  koc_matched: "border-l-violet-400",
  tier_changed: "border-l-yellow-400",
  task_rematched: "border-l-orange-400",
  deadline_warning: "border-l-rose-400",
  platform_announcement: "border-l-slate-400",
};

export default function NotificationList({ bgClass = "bg-orange-50/40", unreadBorderClass = "border-pink-200" }: {
  bgClass?: string;
  unreadBorderClass?: string;
}) {
  const [list, setList] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);

  const fetchList = useCallback(() => {
    const t = getToken();
    if (!t) { setLoading(false); return; }
    notifications.list(t).then(setList).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchList(); }, [fetchList]);

  // Auto-poll every 30s
  useEffect(() => {
    const iv = setInterval(fetchList, 30000);
    return () => clearInterval(iv);
  }, [fetchList]);

  const handleMarkRead = async (id: string) => {
    const t = getToken();
    if (!t) return;
    await notifications.markRead(id, t);
    setList(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const handleMarkAllRead = async () => {
    const t = getToken();
    if (!t) return;
    await notifications.markAllRead(t);
    setList(prev => prev.map(n => ({ ...n, read: true })));
  };

  const unreadCount = list.filter(n => !n.read).length;

  if (loading) {
    return (
      <div className={`min-h-screen ${bgClass}`}>
        <div className="max-w-2xl mx-auto px-6 py-8">
          <div className="text-center py-12">
            <Spark size={32} className="mx-auto opacity-30 animate-spin" />
            <p className="text-zinc-400 text-sm mt-2">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${bgClass}`}>
      <div className="max-w-2xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-extrabold text-zinc-900">🔔 Notifications</h1>
            {unreadCount > 0 && (
              <span className="text-xs bg-pink-500 text-white px-2 py-0.5 rounded-full font-semibold">
                {unreadCount} new
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="text-xs text-zinc-500 hover:text-zinc-700 font-medium transition"
            >
              Mark all read
            </button>
          )}
        </div>

        {list.length === 0 ? (
          <div className="text-center py-12">
            <Spark size={32} className="mx-auto opacity-30" />
            <p className="text-zinc-400 text-sm mt-2">No notifications</p>
          </div>
        ) : (
          <div className="space-y-2">
            {list.map((n) => {
              const ntype = n.type as string;
              const icon = TYPE_ICONS[ntype] || "📌";
              const colorBorder = TYPE_COLORS[ntype] || "border-l-zinc-300";
              const isUnread = !n.read;

              return (
                <div key={n.id as string}
                  className={`block bg-white rounded-xl border border-l-4 p-4 hover:shadow transition
                    ${isUnread ? `${unreadBorderClass} ${colorBorder} shadow-sm` : "border-zinc-100"}
                  `}>
                  <div className="flex justify-between items-start gap-2">
                    <Link href={(n.resource_path as string) || "#"} className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{icon}</span>
                        <p className={`text-sm ${isUnread ? "font-semibold text-zinc-900" : "font-medium text-zinc-700"}`}>
                          {n.title as string}
                        </p>
                      </div>
                      <p className="text-xs text-zinc-500 mt-1.5 ml-7">{n.message as string}</p>
                    </Link>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span className="text-[10px] text-zinc-400 whitespace-nowrap">
                        {new Date(n.created_at as string).toLocaleDateString(undefined, {
                          month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
                        })}
                      </span>
                      {isUnread && (
                        <button
                          onClick={(e) => { e.preventDefault(); handleMarkRead(n.id as string); }}
                          className="text-[10px] text-pink-500 hover:text-pink-700 font-medium transition"
                        >
                          Mark read
                        </button>
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
