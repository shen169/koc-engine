"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { notifications, getToken } from "@/lib/api";

export default function NotificationBell({ role }: { role: string }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const token = getToken();
    if (!token) return;

    function poll() {
      notifications.unreadCount(token!).then((d) => {
        setCount((d as { count: number }).count || 0);
      }).catch(() => {});
    }
    poll();
    const interval = setInterval(poll, 30000);
    return () => clearInterval(interval);
  }, []);

  const notifPath =
    role === "koc" ? "/portal/notifications" :
    role === "merchant" ? "/dashboard/notifications" :
    "/admin/notifications";

  return (
    <Link href={notifPath} className="relative hover:opacity-80 transition">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-500">
        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
      </svg>
      {count > 0 && (
        <span className="absolute -top-1.5 -right-1.5 w-4.5 h-4.5 flex items-center justify-center
          bg-red-500 text-white text-[10px] font-bold rounded-full leading-none">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}
